# 🚀 세션 압축 인수인계 (2026-07-09)

> 새 Claude 대화방에서 이 문서 하나만 붙여넣으면 컨텍스트 복원.

---

## 📌 마스터 프로필

- **호칭**: 마스터님 (한국어)
- **이메일**: ezwebpia001@gmail.com
- **작업 스타일**: 자율 진행 선호, 단계별 커밋 원함
- **철칙**: **가짜/샘플 데이터 절대 금지** — 실제 API/데이터만, 안 되면 "⚠️ 개발 필요" 표시

---

## 🏢 관리 중인 플랫폼

| # | 플랫폼 | 도메인 / 경로 | 스택 |
|---|---|---|---|
| 1 | **HUBONTRADE** | hubontrade.com | 정적 HTML/JS + i18n(ko/en/zh/vi) |
| 2 | **EZ TRADE HUB** | eztradehub.com | 정적 + 다국어(en/zh) |
| 3 | **Leviosa AI** (구 DIVOOST SNS) | leviosa.ai.kr | Supabase Auth/DB/Edge |
| ↳ | Sourcing | /sourcing | 22 마켓플레이스 통합 검색 |
| ↳ | 카드뉴스 | /card | 이번 세션 신규 (`sns-platform/pages/card-news.html`) |
| ↳ | 카피라이터 | /copy | X/Threads/LinkedIn 통합 |
| ↳ | AI 인플루언서 | /influencer | Pro/Enterprise (릴스 15만원) |
| ↳ | 쿠팡 파트너스 | /coupang-partners | HMAC SHA256 |
| 4 | **HOT-B2B** (cgimall) | divoost/hot-b2b (Private) | PHP |
| 5 | **viettoktok.com** | 삭제됨 | 재배포 대기 |
| 6 | **Chrome Extension** | Coupang/Alibaba 스크래퍼 | Manifest V3 |
| 7 | **Supabase Edge Functions** | Deno + TS | quick-handler / swift-function / aliexpress-partners |

### 환경 상수
```
Supabase URL:      https://unruyezigyybnuvgdgdt.supabase.co
Publishable Key:   sb_publishable_CTq6ypxtybUPWUcYptiQ0A_mOa0b2hs
슈퍼 관리자:       goodbae@naver.com
Storage 버킷:      sns-media (public)
Facebook App ID:   1774380433543061
GitHub 리포:       divoost/divoost-website (public), divoost/hot-b2b (private)
호스팅:            divoost.github.io/divoost-website/*
작업 브랜치:       claude/zealous-heisenberg-OFzwl
```

---

## ✅ 완료된 작업 (이번 세션 커밋)

### EZ TRADE HUB Task 1-6 (커밋: 9e82521, 27fd36e)
1. `insight.html` 다국어 (data-en/data-zh)
2. 문의 폼: Supabase `eth_inquiries` + mailto 듀얼 (`docs/eztradehub-inquiries-setup.md`)
3. 블로그 5글: xiaohongshu-algorithm-2026, tiktok-shop-vietnam, kol-koc-golden-ratio, china-ad-law-2026, icp-filing-guide + `insight/index.html`
4. SEO: `sitemap.xml`, `robots.txt`, OG/Twitter/GA4 placeholder
5. ⚠️ divoost/eztradehub 리포 sync (MCP 권한 외 — 마스터 수동)
6. `insight.html` 카드→포스트 링크, 푸터 연도 수정

### Leviosa 벤치마크 → Sprint 1-3

**✅ Sprint 1** (커밋: 9804da8) — 크레딧 인라인 + 채널별 글자수
- `ai-writer.html`: X(Twitter)/Threads/LinkedIn 3채널 신규 추가
- 플랫폼 칩에 글자수 제한 표시 (X 280 / Threads 500 / LinkedIn 3K / IG 2.2K / FB 63K / 네이버 40K / 샤홍수 1K / 도우인 55)
- `PLATFORM_LIMITS` 상수, `updateCharCounter` 플랫폼-aware
- 생성 버튼 크레딧 배지 (💎 8 × 선택 플랫폼 수 자동 갱신)
- `dashboard/index.html`: AI 검색 버튼 💎 10 크레딧 배지

**✅ Sprint 2** (커밋: e2110e5) — 온보딩 투어 + 연관 키워드
- `sns-platform/js/onboarding-tour.js` + `dashboard/js/onboarding-tour.js`: DivoostTour 라이브러리
  - 5단계 walkthrough, Skip/Back/Next, 화살표 키 ← →
  - localStorage `divoost_tour_*_v1` 첫 방문 체크
  - 타겟 하이라이트 (box-shadow spread 9999px), 자동 popover 위치
- `sns-platform/index.html`: 6단계 투어 자동 시작
- `dashboard/index.html`: 5단계 투어 + 연관 키워드 사이드바 신규
  - 실제 `window.trendingState.coupang/naver` 데이터 사용 (가짜 X)
  - 토큰 매칭으로 4개 추출, 클릭 시 재검색

**✅ Sprint 3-1** (본 커밋) — 카드뉴스 페이지
- `sns-platform/pages/card-news.html`: Leviosa 카드뉴스 대시보드 벤치마크
  - 3컬럼: 대량 기획 · 카드뉴스 그리드 · 예약 관리
  - 대량 기획: 키워드/사이트 탐색 (각 💎 10, "개발 필요" alert)
  - 카드뉴스: + 새로 만들기 (💎 5/장) → ai-writer.html?style=card
  - 브랜드: 로고, brand name(localStorage), 카드뉴스 페르소나(localStorage cn_persona)
  - Instagram 연동 상태 (sns_accounts localStorage 캐시 조회)
  - 자동 응답: 게시물별 · 댓글 · DM 템플릿 3버튼
  - 온보딩 투어 4단계
- 16개 SNS 페이지 사이드바에 `🃏 카드뉴스` 링크 삽입

**⏳ Sprint 3-2** (미시작) — 2-pane 레이아웃
- `dashboard/index.html` 상품 카드 → 클릭 시 2-pane 모달
- 좌측: 플랫폼별 상품 리스트 스크롤
- 우측: 상세 카드 + 하단 액션바 4버튼 (💰 가격조정 · ✏️ SEO 상품명 💎1 · 🖼 AI 이미지 · ❤️ 즐겨찾기)
- 페이지네이션 "1 / 493" + "n개 선택됨" + 키보드 ← → 네비

---

## 🚫 절대 규칙 (CLAUDE.md 헌법)

1. **가짜 데이터 금지** — 미연동 기능은 "⚠️ 개발 필요"만 표시
2. **API 키 노출 금지** — Supabase Edge Function env만
3. **catch {} 금지** — 최소 `console.error()` + throw
4. **한국어 응답** — 마스터 호칭
5. **보안 위험 먼저 공지 (I1-I7)** — 옵션 추천 전 위험 상세 설명
6. **destructive 사전 확인** — force push, DROP, rm -rf
7. **ES5 컨벤션** — `var`, function 선언, single quote, 4-space
8. **A1-A6 안전 + B1-B7 품질 + G1-G7 AI페어** 자체 검증

---

## 📞 마스터 직접 처리 필요

1. **Supabase SQL** — `docs/eztradehub-inquiries-setup.md` 의 `eth_inquiries` 테이블 생성
2. **GA4 ID 교체** — `eztradehub/index.html`의 `G-XXXXXXXXXX` 2군데
3. **og-default.png** — `eztradehub/img/og-default.png` (1200×630)
4. **eztradehub 별도 리포 sync** — MCP 권한 외
5. **AliExpress API 키 등록** — Edge Function 대기
6. **Resend.com SMTP** — SNS 회원가입 인증 메일

---

## 🎯 새 세션 시작 시 첫 프롬프트 예시

> 이 문서 컨텍스트로 이어서 진행해줘. 브랜치 `claude/zealous-heisenberg-OFzwl` 유지. 다음 작업: **Sprint 3-2 (2-pane 레이아웃)** — dashboard/index.html 상품 카드에 클릭 시 좌측 리스트 + 우측 상세 카드 + 액션바 4버튼 (💰 가격조정, ✏️ SEO 상품명 💎1, 🖼 AI 이미지, ❤️ 즐겨찾기) 모달 오버레이 방식으로 구현. 페이지네이션 "1/N" + 키보드 ← → 지원. Leviosa 벤치마크. 완료 후 커밋 & 푸시.

---

**작성일**: 2026-07-09
**브랜치**: claude/zealous-heisenberg-OFzwl
**최신 커밋**: Sprint 3-1 카드뉴스 페이지 + 사이드바 링크 (이번 커밋)
