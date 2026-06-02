// Supabase Edge Function: Coupang Partners API 프록시
//
// 보안 원칙:
// - Secret Key는 Deno.env(Supabase Secrets)에만 저장 → 브라우저 절대 노출 X
// - HMAC SHA256 서명 서버에서 생성
// - 로그인된 사용자(JWT)만 호출 가능
//
// 호출 방법 (브라우저):
//   supabase.functions.invoke('coupang-partners', {
//     body: { endpoint: '/products/search', method: 'GET', query: { keyword: '에어팟', limit: 10 } }
//   })
//
// 지원 endpoint (Coupang Partners API v1):
//   GET  /products/search?keyword=&limit=
//   GET  /products/bestcategories/{categoryId}?subId=&imageSize=
//   GET  /products/goldbox
//   GET  /products/coupangPL
//   GET  /products/coupangPL/{brandId}
//   GET  /products/reco?subId=&imageSize=
//   GET  /reports/clicks?startDate=&endDate=&subId=
//   GET  /reports/orders?startDate=&endDate=&subId=
//   GET  /reports/cancels?startDate=&endDate=&subId=
//   GET  /reports/commission?startDate=&endDate=&subId=
//   GET  /reports/ads/{impression-click|orders|cancels|performance|commission}
//   POST /deeplink   body: { coupangUrls: [...] }

// @ts-ignore Deno
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

// @ts-ignore Deno
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// @ts-ignore Deno
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// @ts-ignore Deno
const COUPANG_ACCESS_KEY = Deno.env.get("COUPANG_ACCESS_KEY") || "";
// @ts-ignore Deno
const COUPANG_SECRET_KEY = Deno.env.get("COUPANG_SECRET_KEY") || "";

const COUPANG_DOMAIN = "https://api-gateway.coupang.com";
const COUPANG_BASE = "/v2/providers/affiliate_open_api/apis/openapi/v1";

// ─── HMAC SHA256 서명 생성 (쿠팡 CEA 포맷) ───
async function generateHmacAuth(
  method: string,
  uri: string,
  secretKey: string,
  accessKey: string,
): Promise<string> {
  // uri = path + (optional)?query
  const [path, query = ""] = uri.split("?");

  // datetime: YYMMDDTHHMMSSZ (GMT)
  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mi = String(now.getUTCMinutes()).padStart(2, "0");
  const ss = String(now.getUTCSeconds()).padStart(2, "0");
  const datetime = `${yy}${mm}${dd}T${hh}${mi}${ss}Z`;

  const message = datetime + method + path + query;

  // HMAC-SHA256 via Web Crypto API
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  const signature = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
}

// ─── 허용 endpoint 화이트리스트 (SSRF 방어) ───
const ALLOWED_PREFIXES = [
  "/products/",
  "/reports/",
  "/deeplink",
];

function isAllowed(endpoint: string): boolean {
  return ALLOWED_PREFIXES.some((p) => endpoint.startsWith(p));
}

// ─── 쿼리 객체 → URL 쿼리스트링 (알파벳 정렬 X, 쿠팡은 순서 무관) ───
function buildQueryString(query?: Record<string, any>): string {
  if (!query) return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (v === null || v === undefined || v === "") continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? "?" + parts.join("&") : "";
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (!COUPANG_ACCESS_KEY || !COUPANG_SECRET_KEY) {
      return new Response(
        JSON.stringify({
          error: "Coupang API keys not configured",
          hint: "Set COUPANG_ACCESS_KEY and COUPANG_SECRET_KEY in Supabase Edge Function Secrets",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── 1) 인증 검증 (JWT) ───
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: missing access token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const userId = userData.user.id;

    // ─── 2) Body 파싱 ───
    const body = await req.json().catch(() => ({}));
    const endpoint = String(body.endpoint || "").trim();
    const method = String(body.method || "GET").toUpperCase();
    const query = body.query as Record<string, any> | undefined;
    const payload = body.payload as any;

    if (!endpoint || !endpoint.startsWith("/")) {
      return new Response(
        JSON.stringify({ error: "endpoint required (e.g. '/products/search')" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!isAllowed(endpoint)) {
      return new Response(
        JSON.stringify({ error: `endpoint not allowed: ${endpoint}` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!["GET", "POST"].includes(method)) {
      return new Response(
        JSON.stringify({ error: `method not allowed: ${method}` }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── 3) URI 조립 ───
    const queryString = method === "GET" ? buildQueryString(query) : "";
    const fullPath = COUPANG_BASE + endpoint + queryString;

    // ─── 4) HMAC 서명 ───
    const authorization = await generateHmacAuth(method, fullPath, COUPANG_SECRET_KEY, COUPANG_ACCESS_KEY);

    // ─── 5) 쿠팡 API 호출 ───
    const url = COUPANG_DOMAIN + fullPath;
    const headers: Record<string, string> = {
      "Authorization": authorization,
      "Content-Type": "application/json;charset=UTF-8",
    };
    const fetchInit: RequestInit = { method, headers };
    if (method === "POST" && payload !== undefined) {
      fetchInit.body = JSON.stringify(payload);
    }

    const upstream = await fetch(url, fetchInit);
    const upstreamText = await upstream.text();
    let upstreamData: any;
    try {
      upstreamData = JSON.parse(upstreamText);
    } catch {
      upstreamData = { raw: upstreamText };
    }

    // ─── 6) 호출 로그 (선택: api_usage_logs 테이블 있으면 기록) ───
    try {
      await supabase.from("api_usage_logs").insert({
        user_id: userId,
        provider: "coupang_partners",
        endpoint: endpoint,
        method: method,
        status_code: upstream.status,
        success: upstream.ok,
      });
    } catch {
      // 테이블 없으면 무시
    }

    return new Response(JSON.stringify(upstreamData), {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("coupang-partners proxy error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
