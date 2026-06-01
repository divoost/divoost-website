// Supabase Edge Function: TikTok OAuth authorization code → access token 교환
//
// 클라이언트(브라우저)는 Client Secret 을 직접 다룰 수 없으므로
// 이 함수가 서버사이드에서 TikTok 토큰 엔드포인트를 호출한다.
//
// 환경변수 (Supabase Secrets):
//   TIKTOK_CLIENT_KEY    - TikTok 개발자 콘솔에서 발급
//   TIKTOK_CLIENT_SECRET - TikTok 개발자 콘솔에서 발급 (절대 클라이언트 노출 금지)

// @ts-ignore Deno
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

// @ts-ignore Deno
const TIKTOK_CLIENT_KEY = Deno.env.get("TIKTOK_CLIENT_KEY") || "";
// @ts-ignore Deno
const TIKTOK_CLIENT_SECRET = Deno.env.get("TIKTOK_CLIENT_SECRET") || "";

const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET) {
    return new Response(
      JSON.stringify({
        error: "TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET 환경변수가 설정되지 않았습니다",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body: { code?: string; redirect_uri?: string };
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "잘못된 JSON 요청 본문" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { code, redirect_uri } = body;
  if (!code || !redirect_uri) {
    return new Response(
      JSON.stringify({ error: "code 와 redirect_uri 는 필수입니다" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    // TikTok 토큰 엔드포인트는 application/x-www-form-urlencoded 사용
    const params = new URLSearchParams();
    params.set("client_key", TIKTOK_CLIENT_KEY);
    params.set("client_secret", TIKTOK_CLIENT_SECRET);
    params.set("code", code);
    params.set("grant_type", "authorization_code");
    params.set("redirect_uri", redirect_uri);

    const tokenRes = await fetch(TIKTOK_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: params.toString(),
    });
    const tokenData = await tokenRes.json();

    // TikTok 응답: { access_token, refresh_token, open_id, scope, expires_in,
    //                 refresh_expires_in, token_type } 또는 { error, error_description }
    if (!tokenRes.ok || tokenData.error) {
      console.error("TikTok token exchange failed", tokenData);
      return new Response(
        JSON.stringify({
          error: tokenData.error_description || tokenData.error || `HTTP ${tokenRes.status}`,
          details: tokenData,
        }),
        { status: tokenRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!tokenData.access_token || !tokenData.open_id) {
      console.error("TikTok token exchange missing fields", tokenData);
      return new Response(
        JSON.stringify({ error: "access_token 또는 open_id 가 응답에 없습니다", details: tokenData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 성공: client 에 전달
    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || "",
        open_id: tokenData.open_id,
        scope: tokenData.scope || "",
        expires_in: tokenData.expires_in || 86400,
        refresh_expires_in: tokenData.refresh_expires_in || 0,
        token_type: tokenData.token_type || "Bearer",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("TikTok OAuth exchange exception", err);
    return new Response(
      JSON.stringify({ error: "내부 오류: " + (err instanceof Error ? err.message : String(err)) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
