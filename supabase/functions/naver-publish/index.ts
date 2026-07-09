// Supabase Edge Function: 네이버 블로그 / 카페 글쓰기 + 블로그 카테고리 조회 프록시
//
// 브라우저 → 네이버 오픈 API 직접 호출은 CORS 로 막혀 있어(서버간 호출 전제),
// 이 함수가 서버사이드에서 accessToken 을 실어 대신 호출한다.
// Client Secret 은 사용하지 않음 — 클라이언트가 보유한 사용자 accessToken 그대로 전달.
//
// 요청 바디:
//   { target: "blog", accessToken, title, contents, categoryNo?, openType? }
//   { target: "cafe", accessToken, clubid, menuid, subject, contents, openyn? }
//   { target: "blog_categories", accessToken }  — 카테고리 목록 조회 (글쓰기 전 categoryNo 확인용)

// @ts-ignore Deno
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const NAVER_BLOG_WRITE_URL = "https://openapi.naver.com/blog/writePost.json";
const NAVER_BLOG_CATEGORY_URL = "https://openapi.naver.com/blog/listCategory.json";
const NAVER_CAFE_WRITE_URL_BASE = "https://openapi.naver.com/v1/cafe";

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: {
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
  };
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "잘못된 JSON 요청 본문" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { target, accessToken, contents } = body;

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
      if (!body.title) {
        return new Response(JSON.stringify({ error: "블로그 글쓰기는 title 이 필수입니다" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const form = new URLSearchParams();
      form.set("title", body.title);
      form.set("contents", contents);
      if (body.categoryNo) form.set("categoryNo", body.categoryNo);
      if (body.openType) form.set("openType", body.openType); // all|closed|neighbor|agreedNeighbor

      const res = await fetch(NAVER_BLOG_WRITE_URL, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      });
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
      if (!body.clubid || !body.menuid) {
        return new Response(
          JSON.stringify({ error: "카페 글쓰기는 clubid, menuid 가 필수입니다" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!body.subject) {
        return new Response(JSON.stringify({ error: "카페 글쓰기는 subject(제목) 가 필수입니다" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const url = `${NAVER_CAFE_WRITE_URL_BASE}/${encodeURIComponent(body.clubid)}/menu/${encodeURIComponent(body.menuid)}/articles`;
      const form = new URLSearchParams();
      form.set("subject", body.subject);
      form.set("content", contents);
      if (body.openyn) form.set("openyn", body.openyn); // true|false

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      });
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
