// Supabase Edge Function: 자체몰(개인 쇼핑몰) 상품 등록 프록시
// 1) JWT 검증 → 로그인 사용자만 허용
// 2) 표준 상품 모델 입력 검증
// 3) 서버에 보관된 토큰(MYSTORE_TOKEN)으로 자체몰 register.php 호출
//    → 토큰/몰 주소가 클라이언트에 절대 노출되지 않음 (보안)
//
// 필요한 환경변수 (Supabase Secrets):
//   MYSTORE_ENDPOINT = https://내쇼핑몰주소/register.php  (HTTPS 권장)
//   MYSTORE_TOKEN    = register.php와 공유하는 랜덤 시크릿(32자 이상)

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
const MYSTORE_ENDPOINT = Deno.env.get("MYSTORE_ENDPOINT") || "";
// @ts-ignore Deno
const MYSTORE_TOKEN = Deno.env.get("MYSTORE_TOKEN") || "";

const TITLE_MAX = 200;
const DESC_MAX = 20000;

function jsonRes(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface StandardProduct {
  title: string;
  description?: string;
  sell_price?: number;
  source_price?: number;
  shipping_cost?: number;
  category_major?: string;
  category_minor?: string;
  tags?: string[];
  images?: string[];
  source_url?: string;
  source_platform?: string;
}

// 입력 검증 — 신뢰하지 않음 (CLAUDE.md I5)
function validateProduct(p: unknown): { ok: true; value: StandardProduct } | { ok: false; error: string } {
  if (typeof p !== "object" || p === null) return { ok: false, error: "product 누락" };
  const o = p as Record<string, unknown>;
  if (typeof o.title !== "string" || o.title.trim() === "") return { ok: false, error: "상품명(title)이 필요합니다" };
  if (o.title.length > TITLE_MAX) return { ok: false, error: "상품명이 너무 깁니다" };
  if (o.description != null && (typeof o.description !== "string" || o.description.length > DESC_MAX)) {
    return { ok: false, error: "상세설명 형식 오류" };
  }
  const num = (v: unknown) => (typeof v === "number" && isFinite(v) && v >= 0 ? v : 0);
  return {
    ok: true,
    value: {
      title: o.title.trim(),
      description: typeof o.description === "string" ? o.description : "",
      sell_price: num(o.sell_price),
      source_price: num(o.source_price),
      shipping_cost: num(o.shipping_cost),
      category_major: typeof o.category_major === "string" ? o.category_major : "",
      category_minor: typeof o.category_minor === "string" ? o.category_minor : "",
      tags: Array.isArray(o.tags) ? o.tags.filter((t) => typeof t === "string").slice(0, 30) : [],
      images: Array.isArray(o.images) ? o.images.filter((t) => typeof t === "string").slice(0, 20) : [],
      source_url: typeof o.source_url === "string" ? o.source_url : "",
      source_platform: typeof o.source_platform === "string" ? o.source_platform : "",
    },
  };
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") return jsonRes(405, { error: "method_not_allowed" });

  try {
    // 1) 인증 — 로그인 사용자만
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return jsonRes(401, { error: "로그인이 필요합니다" });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) return jsonRes(401, { error: "유효하지 않은 인증" });

    // 2) 설정 점검
    if (!MYSTORE_ENDPOINT || !MYSTORE_TOKEN) {
      return jsonRes(503, { error: "자체몰 연동이 아직 설정되지 않았습니다 (MYSTORE_ENDPOINT/TOKEN)" });
    }

    // 3) 입력 검증
    let body: { product?: unknown };
    try {
      body = await req.json();
    } catch (_e) {
      return jsonRes(400, { error: "잘못된 요청 형식(JSON)" });
    }
    const v = validateProduct(body?.product);
    if (!v.ok) return jsonRes(400, { error: v.error });

    // 4) 자체몰 register.php로 전달 (토큰은 서버→서버, 클라이언트 미노출)
    const resp = await fetch(MYSTORE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-HubOnTrade-Token": MYSTORE_TOKEN,
      },
      body: JSON.stringify({ product: v.value, seller_id: userData.user.id }),
    });

    const text = await resp.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch (_e) {
      // 몰이 비정상 응답(HTML 에러 등) → 그대로 삼키지 않고 표면화
      console.error("자체몰 비정상 응답", { status: resp.status, sample: text.slice(0, 200) });
      return jsonRes(502, { error: "자체몰 응답 오류 (register.php 확인 필요)" });
    }

    if (!resp.ok || data.ok === false) {
      const msg = typeof data.error === "string" ? data.error : "자체몰 등록 실패";
      return jsonRes(502, { error: msg });
    }

    return jsonRes(200, { ok: true, product_url: data.product_url || "" });
  } catch (err) {
    // 에러를 삼키지 않음 — 로그 + 전파 (CLAUDE.md 규칙 4)
    console.error("register-mystore 처리 실패", err);
    return jsonRes(500, { error: "서버 오류" });
  }
});
