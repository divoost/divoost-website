// Supabase Edge Function: 마켓플레이스 크롤러 (네이버 쇼핑 + Gmarket)
//
// 정책: 가짜 데이터 금지. 실제 크롤링 결과만 반환.
// 사용처: HUBONTRADE 대시보드 "오늘의 AI 추천 상품 검색"
//
// 지원 source:
//   gmarket-best        : Gmarket 베스트 상품 (카테고리별)
//   gmarket-search      : Gmarket 키워드 검색
//   naver-search        : 네이버 쇼핑 검색
//   naver-best          : 네이버 스마트스토어 베스트 (큐레이션 카테고리)
//
// 호출 방법:
//   supabase.functions.invoke('marketplace-crawler', {
//     body: { source: 'gmarket-search', keyword: '키즈클라이밍' }
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
const NAVER_CLIENT_ID = Deno.env.get("NAVER_CLIENT_ID") || "";
// @ts-ignore Deno
const NAVER_CLIENT_SECRET = Deno.env.get("NAVER_CLIENT_SECRET") || "";

const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1";

interface Product {
  name: string;
  image: string;
  price: number;
  url: string;
  rank?: number;
  sales?: string;
  meta?: string;
  platform: string;
}

// ─── Gmarket 베스트 (https://www.gmarket.co.kr/n/best) ───
async function crawlGmarketBest(): Promise<Product[]> {
  const url = "https://www.gmarket.co.kr/n/best";
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9" },
  });
  if (!res.ok) throw new Error(`Gmarket fetch failed: ${res.status}`);
  const html = await res.text();
  return parseGmarketBest(html);
}

function parseGmarketBest(html: string): Product[] {
  const products: Product[] = [];
  // Gmarket 베스트 상품 카드 패턴 (data-montelena-* 속성 기반)
  // 카드 단위 추출 후 각 필드 파싱
  const cardRe = /<li[^>]*class="[^"]*best-list[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  const fallbackRe = /<div[^>]*class="[^"]*box__item[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;

  const matches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = cardRe.exec(html))) matches.push(m[1]);
  if (matches.length === 0) {
    while ((m = fallbackRe.exec(html))) matches.push(m[1]);
  }

  for (let i = 0; i < matches.length && i < 100; i++) {
    const block = matches[i];
    const name = extractText(block, /<(?:span|a|p)[^>]*class="[^"]*(?:itemname|title)[^"]*"[^>]*>([\s\S]*?)<\//i);
    const priceStr = extractText(block, /<(?:span|strong)[^>]*class="[^"]*(?:price|s-price|cur)[^"]*"[^>]*>([\s\S]*?)<\//i);
    const imgMatch = block.match(/<img[^>]*src=["']([^"']+)["']/i);
    const urlMatch = block.match(/<a[^>]*href=["']([^"']+)["']/i);

    if (name && priceStr) {
      products.push({
        name: clean(name),
        image: imgMatch ? imgMatch[1] : "",
        price: parsePrice(priceStr),
        url: urlMatch ? absoluteUrl(urlMatch[1], "https://www.gmarket.co.kr") : "",
        rank: i + 1,
        platform: "gmarket",
      });
    }
  }
  return products;
}

// ─── Gmarket 키워드 검색 (모바일 페이지 + 다중 패턴) ───
async function crawlGmarketSearch(keyword: string): Promise<{products: Product[], debug?: any}> {
  // 모바일 사이트 우선 (JS 렌더링 부담 적음)
  const url = `https://m.gmarket.co.kr/search?keyword=${encodeURIComponent(keyword)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9",
      "Cache-Control": "no-cache",
    },
  });
  if (!res.ok) throw new Error(`Gmarket fetch failed: ${res.status}`);
  const html = await res.text();

  const products: Product[] = [];

  // 패턴 1: 모바일 카드 (li 기반)
  const liRe = /<li[^>]*class="[^"]*(?:item|prdlst)[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = liRe.exec(html)) && products.length < 50) {
    const block = m[1];
    const name = extractText(block, /<(?:span|p|div)[^>]*class="[^"]*(?:tit|name|title)[^"]*"[^>]*>([\s\S]*?)<\//i);
    const priceStr = extractText(block, /(\d{1,3}(?:,\d{3})+\s*원|\d+\s*원)/);
    const imgMatch = block.match(/<img[^>]*(?:src|data-src|data-original)=["']([^"']+\.(?:jpg|jpeg|png|gif|webp)[^"']*)["']/i);
    const urlMatch = block.match(/<a[^>]*href=["']([^"']+)["']/i);

    if (name && priceStr) {
      products.push({
        name: clean(name),
        image: imgMatch ? absoluteUrl(imgMatch[1], "https://m.gmarket.co.kr") : "",
        price: parsePrice(priceStr),
        url: urlMatch ? absoluteUrl(urlMatch[1], "https://m.gmarket.co.kr") : "",
        platform: "gmarket",
      });
    }
  }

  // 디버그 (결과 0이면 응답 정보 반환)
  if (products.length === 0) {
    return {
      products: [],
      debug: {
        httpStatus: res.status,
        htmlLength: html.length,
        contentType: res.headers.get("content-type"),
        sample: html.slice(0, 500),
        hint: "Gmarket이 봇 차단했거나 HTML 구조가 변경됨. ScraperAPI 같은 프록시 필요.",
      },
    };
  }
  return { products };
}

// ─── 네이버 쇼핑 검색 (공식 API + HTML 폴백) ───
async function crawlNaverSearch(keyword: string): Promise<{products: Product[], debug?: any}> {
  // 옵션 1: 네이버 공식 검색 API (NAVER_CLIENT_ID/SECRET 설정 시)
  if (NAVER_CLIENT_ID && NAVER_CLIENT_SECRET) {
    return await searchNaverShopAPI(keyword);
  }

  // 옵션 2: HTML 크롤링 (백업)
  const url = `https://msearch.shopping.naver.com/search/all?query=${encodeURIComponent(keyword)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "ko-KR,ko;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`Naver fetch failed: ${res.status}`);
  const html = await res.text();

  const jsonMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  let products: Product[] = [];
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      products = parseNaverFromJson(data);
    } catch {}
  }
  if (products.length === 0) {
    products = parseNaverFromCards(html);
  }

  if (products.length === 0) {
    return {
      products: [],
      debug: {
        httpStatus: res.status,
        htmlLength: html.length,
        contentType: res.headers.get("content-type"),
        sample: html.slice(0, 500),
        hint: "네이버 공식 API 키 설정 권장 (NAVER_CLIENT_ID, NAVER_CLIENT_SECRET). https://developers.naver.com/apps/",
      },
    };
  }
  return { products };
}

// ─── 네이버 공식 쇼핑 검색 API ───
async function searchNaverShopAPI(keyword: string): Promise<{products: Product[]}> {
  const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(keyword)}&display=30&sort=sim`;
  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": NAVER_CLIENT_ID,
      "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
    },
  });
  if (!res.ok) throw new Error(`Naver API error: ${res.status} ${await res.text()}`);
  const data = await res.json();

  const products: Product[] = (data.items || []).map((item: any) => ({
    name: String(item.title || "").replace(/<[^>]+>/g, ""),
    image: item.image || "",
    price: parsePrice(item.lprice || "0"),
    url: item.link || "",
    meta: item.mallName ? "🏪 " + item.mallName : "",
    platform: "naver",
  }));
  return { products };
}

function parseNaverFromJson(data: any): Product[] {
  const products: Product[] = [];
  // 네이버 검색결과 JSON 트리 탐색
  const queue: any[] = [data];
  const seen = new Set<string>();
  let i = 0;
  while (queue.length && i < 200) {
    const node = queue.shift();
    i++;
    if (!node || typeof node !== "object") continue;
    if (Array.isArray(node)) { queue.push(...node); continue; }

    // 상품 노드 패턴: { productName/mallProductName, price/lowPrice, imageUrl, mallProductUrl }
    const name = node.productName || node.mallProductName || node.title;
    const price = node.price || node.lowPrice || node.salePrice;
    const image = node.imageUrl || node.mainImage || node.productImg;
    const url = node.mallProductUrl || node.url || node.crUrl;

    if (name && price && image && !seen.has(name)) {
      seen.add(name);
      products.push({
        name: String(name).replace(/<[^>]+>/g, ""),
        image: String(image),
        price: Number(String(price).replace(/[^\d]/g, "")) || 0,
        url: String(url || ""),
        platform: "naver",
      });
      if (products.length >= 50) break;
    }

    for (const k in node) {
      if (typeof node[k] === "object" && node[k] !== null) queue.push(node[k]);
    }
  }
  return products;
}

function parseNaverFromCards(html: string): Product[] {
  const products: Product[] = [];
  const cardRe = /<div[^>]*class="[^"]*(?:product_item|basicList_item)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = cardRe.exec(html)) && i < 40) {
    const block = m[1];
    const name = extractText(block, /<a[^>]*class="[^"]*(?:product_link|basicList_link)[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
    const priceStr = extractText(block, /<(?:span|strong)[^>]*class="[^"]*(?:price_num|basicList_price)[^"]*"[^>]*>([\s\S]*?)<\//i);
    const imgMatch = block.match(/<img[^>]*src=["']([^"']+)["']/i);
    const urlMatch = block.match(/<a[^>]*href=["']([^"']+)["']/i);

    if (name && priceStr) {
      products.push({
        name: clean(name),
        image: imgMatch ? imgMatch[1] : "",
        price: parsePrice(priceStr),
        url: urlMatch ? urlMatch[1] : "",
        platform: "naver",
      });
    }
    i++;
  }
  return products;
}

// ─── 유틸 ───
function extractText(html: string, re: RegExp): string {
  const m = html.match(re);
  return m ? clean(m[1]) : "";
}
function clean(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').trim();
}
function parsePrice(s: string): number {
  return Number(s.replace(/[^\d]/g, "")) || 0;
}
function absoluteUrl(href: string, base: string): string {
  if (href.startsWith("http")) return href;
  if (href.startsWith("//")) return "https:" + href;
  if (href.startsWith("/")) return base + href;
  return base + "/" + href;
}

// ─── 메인 핸들러 ───
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
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
    const source = String(body.source || "").trim();
    const keyword = String(body.keyword || "").trim();

    let products: Product[] = [];
    let debug: any = null;
    let usedSource = source;

    switch (source) {
      case "gmarket-best":
        products = await crawlGmarketBest();
        break;
      case "gmarket-search": {
        if (!keyword) throw new Error("keyword required");
        const r = await crawlGmarketSearch(keyword);
        products = r.products;
        debug = r.debug;
        break;
      }
      case "naver-search": {
        if (!keyword) throw new Error("keyword required");
        const r = await crawlNaverSearch(keyword);
        products = r.products;
        debug = r.debug;
        break;
      }
      default:
        return new Response(JSON.stringify({
          error: `unknown source: ${source}`,
          supportedSources: ["gmarket-best", "gmarket-search", "naver-search"]
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    try {
      await supabase.from("api_usage_logs").insert({
        user_id: userData.user.id,
        provider: "crawler-" + source,
        endpoint: keyword || "best",
        method: "GET",
        status_code: 200,
        success: products.length > 0,
      });
    } catch {}

    return new Response(JSON.stringify({
      source: usedSource,
      keyword: keyword,
      count: products.length,
      products: products,
      debug: debug,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("crawler error:", err);
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
