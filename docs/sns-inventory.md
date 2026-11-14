# DIVOOST SNS 플랫폼 — 현황 인벤토리 (SNS 연동 기획용)

> **읽기 전용 추출** · 코드/DB/설정 **미수정** · 비밀값 **미출력**(환경변수는 이름만)
> 대상 저장소: `divoost/divoost-website` · 브랜치: `claude/awesome-meitner-MUHqB`
> 작성일: 2026-11-14 · 근거: 저장소 내 실제 파일 (각 행에 경로 명시)
> 추측 금지 — 코드에서 확인 안 된 항목은 **"코드에 없음 / 확인 필요"** 로 표기

---

## D1. 프로젝트 개요

| 항목 | 값 | 근거 파일 |
|---|---|---|
| 제품 | DIVOOST SNS Platform (7채널 통합 자동 포스팅) | `CLAUDE.md` |
| 배포(프론트) | GitHub Pages → `hubontrade.com` (Cloudflare) | `CLAUDE.md`, 세션 이력 |
| 배포(백엔드) | Supabase Edge Functions (Deno) + Vercel serverless (`api/`) | `supabase/functions/`, `api/` |
| 빌드 도구 | **없음** (순수 HTML/CSS/JS), `vercel dev`만 존재 | `package.json` (`scripts.dev` = `vercel dev`) |
| npm 의존성 | `crypto-js ^4.2.0`, `node-fetch ^2.7.0` (2개뿐) | `package.json` |

---

## D2. 기술 스택 ⭐ (EZworks 비교 핵심)

| 레이어 | DIVOOST SNS | 근거 |
|---|---|---|
| 프론트 | **순수 HTML/CSS/JS (ES5 호환, `var`)** — React/Next.js **아님** | `sns-platform/*.html`, `CLAUDE.md` |
| 백엔드1 | Supabase Edge Functions (Deno + TypeScript) | `supabase/functions/*/index.ts` |
| 백엔드2 | Vercel Serverless (Node, `api/*.js`) | `api/image-search.js`, `api/collect.js` 등 |
| DB | Supabase PostgreSQL + RLS | `docs/*.sql` |
| 인증 | Supabase Auth (JWT, 클라이언트 SDK 직접 호출) | `sns-platform/js/auth-guard.js` |
| 호스팅 | GitHub Pages(정적) + Supabase + Vercel | 세션 이력 |

> **판정: EZworks(Next.js)와 스택 다름.** DIVOOST는 빌드리스 정적 HTML/JS.
> → 공통 레이어는 **Supabase(DB/Auth)** 뿐. 프론트 코드 직접 재사용 난이도 높음.

---

## D3. 인증 (Auth)

| 항목 | 내용 | 근거 |
|---|---|---|
| 방식 | Supabase Auth (JWT 세션) | `sns-platform/js/auth-guard.js:16-17` |
| 가드 | `data-require-auth` 속성 → 미인증 시 `auth.html` 리다이렉트 | `auth-guard.js:257-261` |
| 공개 API | `SNSAuth.getUser()/logout()/require()/getSession()` | `auth-guard.js:229-244` |
| 클라 키 | `SUPABASE_URL` + `sb_publishable_...` (공개키, RLS 보호 — 노출 안전) | `auth-guard.js`, `ai-gateway.js`, `email-service.js`, `supabase-admin.js` |
| 공개 페이지 | `auth.html`, `privacy.html`, `terms.html` (가드 없음) | 해당 파일 |

---

## D4. 데이터베이스 & RLS

**테이블 (총 20, 2개 스키마군)**

| 군 | 테이블 | 근거 |
|---|---|---|
| SNS/과금 | `profiles, plans, subscriptions, payments, credit_balances, credit_transactions, ai_usage_logs, api_usage, sns_posts, notices, notification_preferences, reports, activity_logs, audit_logs, email_queue, email_templates` | `docs/supabase-schema.sql`, `billing-schema.sql`, `email-schema.sql`, `supabase-admin-schema.sql` |
| 소싱(대시보드) | `products, sourcing_items, crawl_logs, platform_stats` | `docs/supabase-schema.sql` |

**RLS (소싱 4테이블 — Option B 적용 완료)**

| 정책 | 내용 | 근거 |
|---|---|---|
| anon_select / anon_insert / anon_update | `USING(true)` / `WITH CHECK(true)` | `supabase-schema.sql:89-91` |
| DELETE | **정책 없음(익명 삭제 차단)** — `FOR ALL USING(true)` 폐기 | `supabase-schema.sql:82` |
| ⚠️ 잔여 리스크 | anon INSERT/UPDATE 여전히 전면 허용 → **Option C(Edge Function 경유 쓰기) 미적용** | A절 참고 |

---

## D5. Edge Functions (Supabase, 백엔드)

| 함수 | 용도 | 근거 |
|---|---|---|
| `ai-generate-image` | AI 이미지 생성 프록시 (회사 키) | `supabase/functions/ai-generate-image/index.ts` |
| `ai-generate-video` | AI 영상 생성 프록시 | `ai-generate-video/index.ts` |
| `tiktok-oauth-exchange` | TikTok OAuth code→token 교환 | `tiktok-oauth-exchange/index.ts` |
| `marketplace-crawler` | 마켓 크롤러 | `marketplace-crawler/index.ts` |
| `coupang-partners` / `aliexpress-partners` | 제휴 API | 각 `index.ts` |
| `_shared/` | `cors.ts`, `ai-models.ts`, `providers.ts` 공용 | `_shared/` |

---

## D6. SNS 연동 수단 (7채널)

| 채널 | 필요 필드 | 가이드/상태 | 근거 |
|---|---|---|---|
| Facebook | appId, appSecret, pageToken, pageId + JSSDK 로그인 | 위저드 O, 앱 `968013862681713`(DIVOOST-SNS-V2) | `settings.html:585,695,871` |
| Instagram | accessToken, businessAccountId | 위저드 O (FB 연동 기반) | `settings.html:609,697` |
| TikTok | clientKey, clientSecret, accessToken | 위저드 O, OAuth 콜백 `tiktok-callback.html`, `CLIENT_KEY` **미입력** | `settings.html:597,926-936` |
| 네이버 블로그 | clientId, secret, token, blogId | OAuth2 가이드만 | `settings.html:621,698` |
| 네이버 카페 | clientId, secret, cafeId, menuId, token | 가이드만 | `settings.html:633,699` |
| 샤오홍수(小红书) | appKey, secret, token | 가이드만 | `settings.html:646,700` |
| 도우인(抖音) | clientKey, secret, token | 가이드만 | `settings.html:657,701` |

> Graph API `v18.0`, TikTok Content Posting API(`open.tiktokapis.com/v2/post/publish/...`) 사용 — D9 참고.

---

## D7. 토큰/비밀 저장 방식 (보안) ⚠️

| 항목 | 내용 | 근거 |
|---|---|---|
| SNS 토큰 저장 | **브라우저 `localStorage` 키 `snsSettings`** (appSecret·accessToken 포함) | `secure-storage.js:18,32,40` |
| 암호화 | **평문 JSON** (btoa/encrypt 미적용 — grep 결과 없음) | `secure-storage.js` |
| 만료 관리 | 채널별 TTL + `sweepExpired()` / `getExpiringSoon()` | `secure-storage.js:22,84,127` |
| 서버 비밀 | Edge Function 환경변수만 (코드 미노출) | D8 |
| 과거 사고 | ScraperAPI 키 노출 → 제거+회전 완료 | `search-reviews.html`, `live-search.html` |

> **리스크**: 클라이언트 `localStorage` 평문 토큰은 XSS 시 탈취 가능 → 서버측 보관(Edge Function) 이전 검토 필요(A절).

---

## D8. 환경변수 (이름만 · 값 미출력)

| 이름 | 위치 | 근거 |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | `supabase/functions/*` |
| `REPLICATE_API_KEY`, `FAL_API_KEY`, `OPENAI_API_KEY` | AI 생성 | 동일 |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | TikTok OAuth | `tiktok-oauth-exchange` |
| `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` | 네이버 | 동일 |
| `COUPANG_ACCESS_KEY/SECRET_KEY`, `ALIEXPRESS_APP_KEY/APP_SECRET/TRACKING_ID` | 제휴 | 각 함수 |
| `SCRAPER_API_KEY` | Vercel `api/` (이미지검색) | `api/image-search.js` |
| Resend SMTP (키) | Supabase Custom SMTP 콘솔 (코드에 없음) | 세션 이력 |

---

## D9. 외부 API 목록

`graph.facebook.com/v18.0`, `open.tiktokapis.com/v2`, `api.replicate.com/v1`, `queue.fal.run`, `api.openai.com/v1/images`, `api.resend.com/emails`, `api-gateway.coupang.com`, `api-sg.aliexpress.com`, `portals.aliexpress.com`
근거: `supabase/functions/`, `sns-platform/` grep.

---

## D10. 다국어(i18n)

| 영역 | 엔진 | 지원 언어 | 저장키 | 근거 |
|---|---|---|---|---|
| SNS 플랫폼 | `sns-platform/js/i18n.js` + common/auto | ko, en, **vi** | `snsLang` | `i18n.js:5,17-18` |
| 소싱 대시보드 | `dashboard/js/i18n.js` + common/auto | ko, en, **zh**, vi | `dashLang` | `dashboard/js/i18n.js:8` |
| 메인 랜딩 | `js/i18n.js` + `lang/{ko,en,zh,vi}.json` | ko, en, zh, vi (각 ~806키) | — | `lang/*.json` |

> ⚠️ 불일치: SNS 플랫폼은 **중국어(zh) 미포함**(ko/en/vi), 대시보드·랜딩은 zh 포함.

---

## D11. 재사용 후보 (EZworks SNS 연동 관점)

| 자산 | 재사용성 | 비고 |
|---|---|---|
| i18n 엔진 패턴 (`I18N_DICT`+`I18N_COMMON`+auto-tagger) | △ | ES5 전역 방식 → Next.js면 next-i18next 등으로 재설계 필요 |
| SNS 토큰 스키마/필드(채널별 필드 맵) | ○ | `settings.html:695-701` 필드 정의는 참고 가능 |
| Edge Function 프록시 패턴(회사 키 서버 보관) | ○ | AI/제휴 프록시 구조 이식 가능 |
| TikTok OAuth 교환 로직 | ○ | `tiktok-oauth-exchange` 서버 함수 재사용 가능 |
| 프론트 HTML/JS 화면 | ✕ | 스택 상이(정적 vs Next.js) — 직접 재사용 곤란 |
| Supabase DB/RLS | ○ | 동일 Supabase면 테이블/정책 이식 가능 |

---

## A. 리스크 / 확인 필요

1. **localStorage 평문 토큰**(D7) — XSS 노출 위험, 서버 보관 이전 검토.
2. **RLS Option C 미적용**(D4) — anon INSERT/UPDATE 전면 허용 상태.
3. **TikTok `CLIENT_KEY` 미입력**(D6) — 라이브 연동 미완.
4. **i18n 언어 불일치**(D10) — SNS 플랫폼 zh 누락.
5. **Facebook 라이브 모드/앱 심사** — 코드 밖(콘솔) 작업, 확인 필요.
6. Resend SMTP 키 — 코드에 없음(Supabase 콘솔), 확인 필요.

## B. 같은 스택 여부 (D2 판정)

**아니오.** DIVOOST = 정적 HTML/JS + Supabase, EZworks = Next.js.
공통분모는 **Supabase(DB/Auth/Edge Functions)** 한 레이어뿐.

## C. 다음 액션 (제안)

- EZworks 측 인벤토리(`ezworks-sns-link-inventory.md`)는 **EZworks 세션**에서 동일 템플릿으로 추출.
- 두 인벤토리 확보 후 → 공통 Supabase 레이어 기준으로 SNS 연동 설계(채널 필드맵·Edge 프록시·OAuth 교환 재사용) 기획서 갱신.
