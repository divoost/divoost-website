// Supabase Edge Function: 소셜 계정 토큰을 서버에 안전 저장
// 클라이언트(settings/connections)가 OAuth로 받은 토큰을 이 함수로 전달 → AES-GCM 암호화 → social_accounts upsert.
// 클라이언트는 암호화 키를 갖지 않으므로 토큰 평문은 전송 1회 후 서버에서만 암호문으로 보관.

// @ts-ignore Deno
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { encryptToken } from "../_shared/token-crypto.ts";

// @ts-ignore Deno
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// @ts-ignore Deno
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// @ts-ignore Deno
const TOKEN_ENC_KEY = Deno.env.get("TOKEN_ENC_KEY") || "";

const VALID_CHANNELS = ["facebook", "instagram", "tiktok"];

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
    const { channel, account_label, account_ref, access_token, token_expires_at, metadata } = body;
    if (!channel || VALID_CHANNELS.indexOf(channel) < 0) return jsonErr(400, `invalid channel: ${channel}`);
    if (!access_token) return jsonErr(400, "access_token required");
    if (!account_ref) return jsonErr(400, "account_ref required");

    const enc = await encryptToken(String(access_token), TOKEN_ENC_KEY);

    const { data, error } = await supabase
      .from("social_accounts")
      .upsert(
        {
          user_id: userId,
          channel,
          account_label: account_label || null,
          account_ref: String(account_ref),
          access_token_enc: enc,
          token_expires_at: token_expires_at || null,
          metadata: metadata || {},
        },
        { onConflict: "user_id,channel,account_ref" }
      )
      .select("id, channel, account_ref, account_label, token_expires_at")
      .single();

    if (error) return jsonErr(500, `저장 실패: ${error.message}`);

    return new Response(JSON.stringify({ success: true, account: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return jsonErr(500, err.message || "internal_error");
  }
});

function jsonErr(status: number, message: string, extra?: any) {
  return new Response(JSON.stringify({ success: false, error: message, ...extra }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
