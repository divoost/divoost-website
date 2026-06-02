// Supabase Edge Function: AliExpress Affiliate API 프록시
//
// 사용 전 마스터가 해야 할 일:
// 1. https://portals.aliexpress.com 가입
// 2. App Key + App Secret 발급
// 3. Tracking ID 생성
// 4. Supabase Secrets 등록:
//    - ALIEXPRESS_APP_KEY
//    - ALIEXPRESS_APP_SECRET
//    - ALIEXPRESS_TRACKING_ID
//
// 호출:
//   supabase.functions.invoke('aliexpress-partners', {
//     body: { method: 'aliexpress.affiliate.product.query', params: { keywords: 'wireless earphone', page_size: 20 } }
//   })

// @ts-ignore Deno
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// @ts-ignore Deno
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// @ts-ignore Deno
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// @ts-ignore Deno
const APP_KEY = Deno.env.get("ALIEXPRESS_APP_KEY") || "";
// @ts-ignore Deno
const APP_SECRET = Deno.env.get("ALIEXPRESS_APP_SECRET") || "";
// @ts-ignore Deno
const TRACKING_ID = Deno.env.get("ALIEXPRESS_TRACKING_ID") || "default";

const ALIEXPRESS_GATEWAY = "https://api-sg.aliexpress.com/sync";

// HMAC-SHA256 서명 (AliExpress TopAPI)
async function signRequest(params: Record<string, string>): Promise<string> {
  // 1. 알파벳 순으로 정렬
  const sortedKeys = Object.keys(params).sort();
  // 2. key + value 결합
  let signStr = APP_SECRET;
  for (const k of sortedKeys) {
    signStr += k + params[k];
  }
  signStr += APP_SECRET;

  // 3. MD5 해시 (AliExpress는 MD5 사용)
  const encoder = new TextEncoder();
  const data = encoder.encode(signStr);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data); // SHA-256으로 대체 (MD5 미지원)
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

// 허용 method
const ALLOWED_METHODS = [
  "aliexpress.affiliate.product.query",       // 상품 검색
  "aliexpress.affiliate.productdetail.get",   // 상품 상세
  "aliexpress.affiliate.hotproduct.query",    // 핫상품
  "aliexpress.affiliate.category.get",        // 카테고리
  "aliexpress.affiliate.link.generate",       // 딥링크 생성
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!APP_KEY || !APP_SECRET) {
      return new Response(JSON.stringify({
        error: "AliExpress API keys not configured",
        hint: "Set ALIEXPRESS_APP_KEY, ALIEXPRESS_APP_SECRET, ALIEXPRESS_TRACKING_ID in Supabase Secrets",
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // JWT 인증
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const method = String(body.method || "").trim();
    const params = body.params || {};

    if (!ALLOWED_METHODS.includes(method)) {
      return new Response(JSON.stringify({
        error: `method not allowed: ${method}`,
        allowed: ALLOWED_METHODS,
      }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 공통 파라미터 추가
    const allParams: Record<string, string> = {
      app_key: APP_KEY,
      method: method,
      sign_method: "sha256",  // 또는 "md5"
      timestamp: new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14),
      format: "json",
      v: "2.0",
      tracking_id: TRACKING_ID,
      ...params,
    };

    // 모든 값을 문자열로
    for (const k of Object.keys(allParams)) {
      allParams[k] = String(allParams[k]);
    }

    // 서명 생성
    const sign = await signRequest(allParams);
    allParams.sign = sign;

    // 요청
    const queryString = Object.entries(allParams)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    const url = `${ALIEXPRESS_GATEWAY}?${queryString}`;
    const upstream = await fetch(url, { method: "POST" });
    const upstreamData = await upstream.json();

    // 로그
    try {
      await supabase.from("api_usage_logs").insert({
        user_id: userData.user.id,
        provider: "aliexpress",
        endpoint: method,
        method: "POST",
        status_code: upstream.status,
        success: upstream.ok,
      });
    } catch {}

    return new Response(JSON.stringify(upstreamData), {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("aliexpress proxy error:", err);
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
