// Supabase Edge Function: AI 영상 생성 프록시

// @ts-ignore Deno
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { VIDEO_MODELS, calcChargeCents, calcCostCents } from "../_shared/ai-models.ts";
import { callReplicate, callFal } from "../_shared/providers.ts";

// @ts-ignore Deno
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// @ts-ignore Deno
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// @ts-ignore Deno
const REPLICATE_KEY = Deno.env.get("REPLICATE_API_KEY") || "";
// @ts-ignore Deno
const FAL_KEY = Deno.env.get("FAL_API_KEY") || "";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return jsonErr(401, "missing_token");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) return jsonErr(401, "invalid_token");
    const userId = userData.user.id;

    const body = await req.json();
    const { prompt, model: modelKey, aspect, duration } = body;
    if (!prompt) return jsonErr(400, "prompt required");
    if (!modelKey || !VIDEO_MODELS[modelKey]) return jsonErr(400, `invalid model: ${modelKey}`);

    const model = VIDEO_MODELS[modelKey];
    const dur = duration || model.defaultDuration || 5;

    if (model.premium) {
      const { data: prof } = await supabase
        .from("profiles").select("current_plan_id").eq("id", userId).single();
      const { data: plan } = await supabase
        .from("plans").select("can_use_premium_models").eq("id", prof?.current_plan_id || "free").single();
      if (!plan?.can_use_premium_models) return jsonErr(403, `${modelKey}은 Pro 이상 플랜 전용`);
    }

    const chargeCents = calcChargeCents("video", modelKey, dur);
    const costCents = calcCostCents("video", modelKey, dur);

    const { data: deductResult, error: deductErr } = await supabase.rpc("deduct_credits", {
      p_user_id: userId,
      p_amount_cents: chargeCents,
      p_type: "usage_video",
      p_source: `${model.provider}:${modelKey}`,
      p_description: `AI 영상 (${dur}s): ${prompt.slice(0, 60)}`,
    });
    if (deductErr) return jsonErr(500, `credit deduction failed: ${deductErr.message}`);
    if (!deductResult.success) {
      return jsonErr(402, "insufficient_credits", { balance_cents: deductResult.balance_cents, required_cents: chargeCents });
    }

    const { data: logRow } = await supabase.from("ai_usage_logs").insert({
      user_id: userId, type: "video", provider: model.provider, model: modelKey,
      prompt, cost_cents: costCents, charged_cents: chargeCents, duration_seconds: dur, status: "pending"
    }).select("id").single();
    const usageLogId = logRow?.id;

    let providerOutputUrl: string;
    try {
      const input = model.buildInput(prompt, { aspect: aspect || "9:16", duration: dur });
      let raw: any;
      if (model.provider === "replicate") raw = await callReplicate(model.modelId!, input, REPLICATE_KEY);
      else if (model.provider === "fal") raw = await callFal(model.modelId!, input, FAL_KEY);
      else throw new Error("unknown provider");
      providerOutputUrl = model.extractOutput(raw);
      if (!providerOutputUrl) throw new Error("응답에서 URL 추출 실패");
    } catch (err: any) {
      await supabase.rpc("grant_credits", {
        p_user_id: userId, p_amount_cents: chargeCents, p_type: "refund",
        p_source: `${model.provider}:${modelKey}:failed`,
        p_description: `생성 실패 환불: ${err.message?.slice(0, 100)}`,
        p_is_subscription: false,
      });
      await supabase.from("ai_usage_logs").update({ status: "failed", error_message: err.message?.slice(0, 500) }).eq("id", usageLogId);
      return jsonErr(502, `provider error: ${err.message}`);
    }

    let finalUrl = providerOutputUrl;
    try {
      const vidRes = await fetch(providerOutputUrl);
      const vidBlob = await vidRes.arrayBuffer();
      const fname = `${userId}/ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;
      const { error: upErr } = await supabase.storage.from("sns-media").upload(fname, vidBlob, {
        contentType: "video/mp4", upsert: true,
      });
      if (!upErr) {
        const { data: pub } = supabase.storage.from("sns-media").getPublicUrl(fname);
        finalUrl = pub.publicUrl;
      }
    } catch (_) { /* fallback to original */ }

    await supabase.from("ai_usage_logs").update({ status: "success", output_url: finalUrl }).eq("id", usageLogId);

    return new Response(JSON.stringify({
      success: true, url: finalUrl, model: modelKey, provider: model.provider,
      charged_cents: chargeCents, balance_cents: deductResult.balance_after_cents,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return jsonErr(500, err.message || "internal_error");
  }
});

function jsonErr(status: number, message: string, extra?: any) {
  return new Response(JSON.stringify({ success: false, error: message, ...extra }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
