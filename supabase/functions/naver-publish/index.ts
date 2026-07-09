// Supabase Edge Function: 네이버 블로그 / 카페 글쓰기 + 블로그 카테고리 조회 프록시
//
// 브라우저 → 네이버 오픈 API 직접 호출은 CORS 로 막혀 있어(서버간 호출 전제),
// 이 함수가 서버사이드에서 accessToken 을 실어 대신 호출한다.
// Client Secret 은 사용하지 않음 — 클라이언트가 보유한 사용자 accessToken 그대로 전달.
//
// 요청 형식 2가지 지원:
//   1) application/json (이미지 없음, 기존 방식):
//      { target: "blog", accessToken, title, contents, categoryNo?, openType? }
//      { target: "cafe", accessToken, clubid, menuid, subject, contents, openyn? }
//      { target: "blog_categories", accessToken }
//   2) multipart/form-data (이미지 첨부 시): 위와 같은 필드 + image 파트를 반복 첨부
//      (네이버 API 자체가 이미지 첨부 시 multipart 를 요구하므로 그대로 전달만 함)

// @ts-ignore Deno
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const NAVER_BLOG_WRITE_URL = "https://openapi.naver.com/blog/writePost.json";
const NAVER_BLOG_CATEGORY_URL = "https://openapi.naver.com/blog/listCategory.json";
const NAVER_CAFE_WRITE_URL_BASE = "https://openapi.naver.com/v1/cafe";

// 첨부 폭주 방지 — 블로그/카페 글 1건에 상식적인 상한.
const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 이미지 1장당 20MB

type ParsedRequest = {
  target?: "blog" | "cafe" | "blog_categories";
  accessToken?: string;
  title?: string;
  contents?: string;
  categoryNo?: string;
  openType?: string;
  clubid?: string;
  menuid?: string;
  subject?: string;
  openyn?: string;
  images: File[];
};

async function parseRequest(req: Request): Promise<ParsedRequest | { error: string }> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const images: File[] = [];
    for (const [key, value] of form.entries()) {
      if (key === "image" && value instanceof File && value.size > 0) images.push(value);
    }
    if (images.length > MAX_IMAGES) {
      return { error: `이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다 (현재 ${images.length}장)` };
    }
    for (const img of images) {
      if (img.size > MAX_IMAGE_BYTES) {
        return { error: `이미지 1장당 최대 ${MAX_IMAGE_BYTES / 1024 / 1024}MB 까지 가능합니다 (${img.name}: ${(img.size / 1024 / 1024).toFixed(1)}MB)` };
      }
    }
    const get = (k: string) => {
      const v = form.get(k);
      return typeof v === "string" ? v : undefined;
    };
    return {
      target: get("target") as ParsedRequest["target"],
      accessToken: get("accessToken"),
      title: get("title"),
      contents: get("contents"),
      categoryNo: get("categoryNo"),
      openType: get("openType"),
      clubid: get("clubid"),
      menuid: get("menuid"),
      subject: get("subject"),
      openyn: get("openyn"),
      images,
    };
  }

  try {
    const body = await req.json();
    return { ...body, images: [] };
  } catch (e) {
    return { error: "잘못된 요청 본문 (JSON 또는 multipart/form-data 여야 합니다)" };
  }
}

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = await parseRequest(req);
  if ("error" in parsed) {
    return new Response(JSON.stringify({ error: parsed.error }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { target, accessToken, contents, images } = parsed;

  if (!accessToken) {
    return new Response(JSON.stringify({ error: "accessToken 은 필수입니다" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (target === "blog_categories") {
      const res = await fetch(NAVER_BLOG_CATEGORY_URL, {
        headers: { Authorization: "Bearer " + accessToken },
      });
      const data = await res.json();

      if (!res.ok || data.message?.error) {
        console.error("Naver blog category list failed", data);
        return new Response(
          JSON.stringify({ error: data.message?.error?.msg || `HTTP ${res.status}`, details: data }),
          { status: res.status === 200 ? 502 : res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ success: true, result: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!contents) {
      return new Response(JSON.stringify({ error: "contents(본문) 는 필수입니다" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (target === "blog") {
      if (!parsed.title) {
        return new Response(JSON.stringify({ error: "블로그 글쓰기는 title 이 필수입니다" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const fields: Record<string, string> = { title: parsed.title, contents };
      if (parsed.categoryNo) fields.categoryNo = parsed.categoryNo;
      if (parsed.openType) fields.openType = parsed.openType; // all|closed|neighbor|agreedNeighbor

      const res = await postToNaver(NAVER_BLOG_WRITE_URL, accessToken, fields, images);
      const data = await res.json();

      if (!res.ok || data.message?.error) {
        console.error("Naver blog write failed", data);
        return new Response(
          JSON.stringify({ error: data.message?.error?.msg || `HTTP ${res.status}`, details: data }),
          { status: res.status === 200 ? 502 : res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ success: true, result: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (target === "cafe") {
      if (!parsed.clubid || !parsed.menuid) {
        return new Response(
          JSON.stringify({ error: "카페 글쓰기는 clubid, menuid 가 필수입니다" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!parsed.subject) {
        return new Response(JSON.stringify({ error: "카페 글쓰기는 subject(제목) 가 필수입니다" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const url = `${NAVER_CAFE_WRITE_URL_BASE}/${encodeURIComponent(parsed.clubid)}/menu/${encodeURIComponent(parsed.menuid)}/articles`;

      const fields: Record<string, string> = { subject: parsed.subject, content: contents };
      if (parsed.openyn) fields.openyn = parsed.openyn; // true|false

      const res = await postToNaver(url, accessToken, fields, images);
      const data = await res.json();

      if (!res.ok || data.message?.error) {
        console.error("Naver cafe write failed", data);
        return new Response(
          JSON.stringify({ error: data.message?.error?.msg || `HTTP ${res.status}`, details: data }),
          { status: res.status === 200 ? 502 : res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ success: true, result: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "target 은 'blog', 'cafe', 'blog_categories' 중 하나여야 합니다" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Naver publish exception", err);
    return new Response(
      JSON.stringify({ error: "내부 오류: " + (err instanceof Error ? err.message : String(err)) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// 이미지가 있으면 multipart/form-data 로, 없으면 기존 그대로 application/x-www-form-urlencoded 로 네이버에 전달.
// (텍스트만 있는 기존 호출 경로는 동작 변화 없음 — 위험 최소화.)
async function postToNaver(
  url: string,
  accessToken: string,
  fields: Record<string, string>,
  images: File[],
): Promise<Response> {
  if (images.length === 0) {
    const form = new URLSearchParams();
    for (const k in fields) form.set(k, fields[k]);
    return await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
  }

  const form = new FormData();
  for (const k in fields) form.set(k, fields[k]);
  for (const img of images) form.append("image", img, img.name);

  return await fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + accessToken },
    body: form,
  });
}
