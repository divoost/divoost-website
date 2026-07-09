// Supabase Edge Function: 네이버 로그인 authorization code → access token 교환
//
// 클라이언트(브라우저)는 Client Secret 을 직접 다룰 수 없으므로
// 이 함수가 서버사이드에서 네이버 토큰 엔드포인트를 호출한다.
//
// 환경변수 (Supabase Secrets):
//   NAVER_CLIENT_ID     - 네이버 개발자센터에서 발급
//   NAVER_CLIENT_SECRET - 네이버 개발자센터에서 발급 (절대 클라이언트 노출 금지)

// @ts-ignore Deno
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

// @ts-ignore Deno
const NAVER_CLIENT_ID = Deno.env.get("NAVER_CLIENT_ID") || "";
// @ts-ignore Deno
const NAVER_CLIENT_SECRET = Deno.env.get("NAVER_CLIENT_SECRET") || "";

const NAVER_TOKEN_URL = "https://nid.naver.com/oauth2.0/token";
const NAVER_PROFILE_URL = "https://openapi.naver.com/v1/nid/me";

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    return new Response(
      JSON.stringify({
        error: "NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 설정되지 않았습니다",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body: { code?: string; state?: string; redirect_uri?: string };
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "잘못된 JSON 요청 본문" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { code, state, redirect_uri } = body;
  if (!code || !redirect_uri) {
    return new Response(
      JSON.stringify({ error: "code 와 redirect_uri 는 필수입니다" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const params = new URLSearchParams();
    params.set("grant_type", "authorization_code");
    params.set("client_id", NAVER_CLIENT_ID);
    params.set("client_secret", NAVER_CLIENT_SECRET);
    params.set("code", code);
    if (state) params.set("state", state);
    params.set("redirect_uri", redirect_uri);

    const tokenRes = await fetch(NAVER_TOKEN_URL + "?" + params.toString(), {
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
    });
    const tokenData = await tokenRes.json();

    // 네이버 응답: { access_token, refresh_token, token_type, expires_in }
    // 또는 { error, error_description }
    if (!tokenRes.ok || tokenData.error) {
      console.error("Naver token exchange failed", tokenData);
      return new Response(
        JSON.stringify({
          error: tokenData.error_description || tokenData.error || `HTTP ${tokenRes.status}`,
          details: tokenData,
        }),
        { status: tokenRes.status === 200 ? 502 : tokenRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!tokenData.access_token) {
      console.error("Naver token exchange missing access_token", tokenData);
      return new Response(
        JSON.stringify({ error: "access_token 이 응답에 없습니다", details: tokenData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 프로필 조회 (계정 식별자 확보 — 네이버는 open_id 개념이 없어 별도 조회 필요)
    let naverId = "";
    let nickname = "";
    try {
      const profileRes = await fetch(NAVER_PROFILE_URL, {
        headers: { Authorization: "Bearer " + tokenData.access_token },
      });
      const profileData = await profileRes.json();
      if (profileData.resultcode === "00" && profileData.response) {
        naverId = profileData.response.id || "";
        nickname = profileData.response.nickname || profileData.response.name || "";
      }
    } catch (profileErr) {
      // 프로필 조회 실패해도 토큰 자체는 유효하므로 진행 (계정 식별자만 비어있게 됨)
      console.error("Naver profile lookup failed", profileErr);
    }

    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || "",
        token_type: tokenData.token_type || "Bearer",
        expires_in: Number(tokenData.expires_in) || 3600,
        naver_id: naverId,
        nickname: nickname,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Naver OAuth exchange exception", err);
    return new Response(
      JSON.stringify({ error: "내부 오류: " + (err instanceof Error ? err.message : String(err)) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
