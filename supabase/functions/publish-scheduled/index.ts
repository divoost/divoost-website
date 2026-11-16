// Supabase Edge Function: 예약 발행 크론 워커
// pg_cron이 1분마다 호출. 발행 시각이 지난 pending 예약을 선점→발행→상태/재시도 갱신.
// 무단 호출 방지: x-cron-secret 헤더가 환경변수 CRON_SECRET과 일치해야 함.
// FB/IG는 서버측 URL 기반 발행 지원. TikTok 예약은 청크 업로드 복잡도로 v1 미지원(즉시발행은 클라이언트에서 가능).

// @ts-ignore Deno
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { decryptToken } from "../_shared/token-crypto.ts";
import { publishFacebook, publishInstagram, MediaItem, PublishResult } from "../_shared/social-publish.ts";

// @ts-ignore Deno
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// @ts-ignore Deno
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// @ts-ignore Deno
const TOKEN_ENC_KEY = Deno.env.get("TOKEN_ENC_KEY") || "";
// @ts-ignore Deno
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";

const BATCH = 10;

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  // 호출 인증 (크론 시크릿)
  if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return json(401, { success: false, error: "unauthorized" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
  const nowIso = new Date().toISOString();

  // 발행 대상 조회
  const { data: due, error: dueErr } = await supabase
    .from("scheduled_posts")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(BATCH);

  if (dueErr) return json(500, { success: false, error: dueErr.message });
  if (!due || due.length === 0) return json(200, { success: true, processed: 0 });

  let processed = 0;

  for (const post of due) {
    // 원자적 선점: pending → processing (다른 크론 실행과 중복 방지)
    const { data: claimed } = await supabase
      .from("scheduled_posts")
      .update({ status: "processing", attempts: (post.attempts || 0) + 1 })
      .eq("id", post.id)
      .eq("status", "pending")
      .select("id")
      .single();
    if (!claimed) continue; // 이미 다른 워커가 가져감

    processed++;
    const channels: string[] = Array.isArray(post.channels) ? post.channels : [];
    const media: MediaItem[] = Array.isArray(post.media) ? post.media : [];
    const results: Record<string, any> = {};
    let anyFail = false;

    for (const channel of channels) {
      try {
        if (channel !== "facebook" && channel !== "instagram") {
          results[channel] = { ok: false, message: `${channel} 예약 발행은 아직 지원하지 않습니다` };
          anyFail = true;
          continue;
        }

        // 해당 채널 계정 로드 + 토큰 복호화
        const { data: acct } = await supabase
          .from("social_accounts")
          .select("account_ref, access_token_enc, token_expires_at")
          .eq("user_id", post.user_id)
          .eq("channel", channel)
          .order("updated_at", { ascending: false })
          .limit(1)
          .single();

        if (!acct) {
          results[channel] = { ok: false, message: `${channel} 연결 계정이 없습니다` };
          anyFail = true;
          continue;
        }
        if (acct.token_expires_at && new Date(acct.token_expires_at).getTime() < Date.now()) {
          results[channel] = { ok: false, message: `${channel} 토큰이 만료되었습니다. 재연결이 필요합니다` };
          anyFail = true;
          continue;
        }

        const token = await decryptToken(acct.access_token_enc, TOKEN_ENC_KEY);
        let r: PublishResult;
        if (channel === "facebook") {
          r = await publishFacebook(acct.account_ref, token, post.content || "", media);
        } else {
          r = await publishInstagram(acct.account_ref, token, post.content || "", media);
        }
        results[channel] = r;
        if (!r.ok) anyFail = true;
      } catch (err: any) {
        results[channel] = { ok: false, message: err.message?.slice(0, 300) || "발행 오류" };
        anyFail = true;
      }
    }

    // 상태 갱신 + 재시도
    if (!anyFail) {
      await supabase
        .from("scheduled_posts")
        .update({ status: "published", result: results, last_error: null })
        .eq("id", post.id);
    } else {
      const attempts = (post.attempts || 0) + 1;
      const canRetry = attempts < (post.max_attempts || 3);
      const errMsg = Object.keys(results)
        .filter((c) => results[c] && results[c].ok === false)
        .map((c) => `${c}: ${results[c].message}`)
        .join(" | ");
      await supabase
        .from("scheduled_posts")
        .update({
          status: canRetry ? "pending" : "failed", // pending이면 다음 크론이 재시도
          result: results,
          last_error: errMsg.slice(0, 1000),
        })
        .eq("id", post.id);
    }
  }

  return json(200, { success: true, processed });
});

function json(status: number, obj: any) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
