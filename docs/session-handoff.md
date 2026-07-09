# DIVOOST / HUBONTRADE 프로젝트 — 세션 핸드오프 요약

> 다른 세션/채팅에서 작업을 이어가기 위한 압축 컨텍스트 문서.

## 📦 기본 정보
- **메인 레포**: `divoost/divoost-website` (작업 브랜치: `claude/awesome-meitner-MUHqB`)
- **별도 레포**: `divoost/hot-b2b` (PHP 사이트, 5.2→8.3 마이그레이션 예정 — 별도 세션)
- **배포**: GitHub Pages + 커스텀도메인 `hubontrade.com` (Cloudflare DNS/프록시 경유)
- **구조**:
  - `sns-platform/` — SNS 콘텐츠 플랫폼
  - `dashboard/` — 소싱 트래커
  - `index.html` — 랜딩(메인 홈)
  - `api/` — Vercel 서버리스
  - `supabase/functions/` — Edge Functions

## 🔑 핵심 설정값 (비밀 아님)
- **Supabase**: `https://unruyezigyybnuvgdgdt.supabase.co`
  - publishable(anon) key: `sb_publishable_CTq6ypxtybUPWUcYptiQ0A_mOa0b2hs` (공개키, RLS로 보호)
- **Facebook 앱**: `DIVOOST-SNS-V2` / ID `968013862681713` (현재 **개발모드** = 본인만 연동됨)
- **개인정보처리방침**: `hubontrade.com/sns-platform/privacy.html`
- **서비스약관**: `hubontrade.com/sns-platform/terms.html`
- **관리자**: `goodbae@naver.com` (super_admin)

## ✅ 완료 작업 (이번 세션)
1. **Facebook 로그인 에러 해결** — 앱도메인 + JSSDK 허용도메인(`https://hubontrade.com`) + OAuth 리디렉션(`.../settings.html`) 등록
2. **privacy.html + terms.html** 생성 (공개 페이지, TikTok/FB 검수용)
3. **설정 위저드** — FB/IG/TikTok 단계별 연동 위저드 + 플랫폼별 설정 가이드 모달(8개 SNS)
4. **다국어(i18n)**
   - SNS플랫폼(한·영·베): 로그인/가입, 종합현황, 전 페이지 사이드바
   - 소싱대시보드(한·영·중·베): 사이드바 + 상단바제목 + 테이블헤더 + 메인(14p) ※中文 신규
   - 메인홈(한·영·중·베): 버튼 클릭/가시성 수정 → KO/EN/CH/VN 작동
   - 엔진: 메인홈=`lang/*.json` fetch 방식 / 대시보드·SNS=`*/js/i18n.js` 내장 방식
5. **회원가입 인증메일 자동화** — Resend SMTP + Cloudflare DNS(DKIM/SPF/DMARC) + Supabase Custom SMTP(`smtp.resend.com:465`) + 템플릿(`{{ .Token }}` 6자리코드)
6. **보안**
   - 노출된 ScraperAPI 키 코드 제거 + 콘솔에서 재발급(rotate) 완료
   - 소싱 4테이블(`products`/`sourcing_items`/`crawl_logs`/`platform_stats`) RLS: **익명 DELETE 차단**(옵션 B, SELECT/INSERT/UPDATE만) + `docs/supabase-schema.sql` 동기화
   - 전 테이블 RLS 켜짐 확인, SNS/admin/billing 정책 안전 확인
7. **TikTok** — redirect URI 경로버그 수정(`/divoost-website/` 제거→자동계산) + 설정 위저드 추가
8. **이미지 역검색** — 프론트(`dashboard/image-search.html`) + 백엔드구조(`api/image-search.js`) + 설계문서(`docs/image-search-setup.md`)

## ⏳ 남은 작업
- **[2] Facebook 라이브모드 + 앱검수** — 비즈니스인증 + 데모영상 필요, Meta 심사 수일 소요 (나중에)
- **[3] 소싱대시보드 "본문 콘텐츠" 다국어** 잔여 (페이지별, 동적 렌더 포함)
- **[4] 이미지검색 백엔드 Google Lens 연결** — ScraperAPI **크레딧 소진(3674/1000)**, 갱신/유료/대안 결정 필요
- **[5] hot-b2b PHP 5.2→8.3** — 별도 세션 (아주 나중에)
- **[6] 소싱툴 완전잠금(옵션 C)** — anon 쓰기도 차단 → Edge Function 리팩터 필요
- **TikTok URL 도메인인증(DNS TXT)** 완료 여부 재확인

## ⚠️ 운영 주의
- **Cloudflare 캐시**: 배포 후 옛 HTML 제공 → **Caching → Purge Everything** 필요. (재발 방지: `.html` 캐시 안 함 규칙 추가 권장)
- **새 API키는 코드에 절대 노출 금지** → 서버 환경변수(Edge Function)에만.
- **소싱 스크래핑 법적 리스크**: 공식 API 우선, 우회/재배포/개인정보 금지 (내부 분석용).
- 브랜치 스쿼시 머지 후 재작업 시 `git reset --hard origin/main`으로 정렬 후 진행.

## 🏷 관련 플랫폼/서비스
- 자체: SNS 콘텐츠 플랫폼 · 소싱 트래커 대시보드 · 메인 홈(HUBONTRADE) · 이미지 역검색
- 외부: Facebook(Meta) · Instagram · TikTok · Supabase · Resend · Cloudflare · ScraperAPI · 까페24 · GitHub Pages
- 채널: 1688 · 타오바오 · 알리익스프레스 · 테무 · 쇼피 · 라자다 · 아마존 / 쿠팡 · 지마켓 · 네이버 · 샤오홍수 · 도우인 · YouTube
