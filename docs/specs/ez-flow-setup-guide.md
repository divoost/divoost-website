# ez-flow 신규 리포 셋업 가이드 (Next.js + Supabase)

> 근거: [ADR-001](../adr/ADR-001-repo-structure.md)(신규 리포 분리) · 기획서 §4.3(디렉토리) · §6.4(인증) · §17(상수)
> 대상 Supabase: `https://calmwxsckghhfcydsybv.supabase.co` (ez-flow 프로젝트, 싱가포르)
> 이 문서는 divoost-website에 **문서로만** 보관. 실제 앱 코드는 신규 `ez-flow` 리포로.

---

## 0. 사전 준비
- Node.js 20+ / npm
- GitHub `divoost` 조직 권한
- Supabase ez-flow 프로젝트의 **Project URL** + **anon(publishable) key**
  (Project Settings → API). ⚠️ **service_role 키는 클라이언트에 절대 금지.**

---

## 1. 빈 리포 생성 (마스터)
1. GitHub `divoost` 조직 → New repository → 이름 `ez-flow`
2. **빈 리포로 생성** (README/gitignore 체크 해제 — 우리 스타터로 채움)
3. 생성 후 URL 확보: `https://github.com/divoost/ez-flow.git`

---

## 2. Next.js 베이스 생성 (검증된 공식 도구)
로컬에서:
```bash
npx create-next-app@latest ez-flow \
  --typescript --eslint --app --src-dir --import-alias "@/*" --no-tailwind
cd ez-flow
```
> create-next-app 산출물은 빌드가 보장된 베이스다(안전수칙 #1). 여기에 아래 ez-flow 통합 파일을 얹는다.

---

## 3. 의존성 설치
```bash
# Supabase (SSR 쿠키 세션)
npm i @supabase/supabase-js @supabase/ssr
# 상태/서버상태
npm i @tanstack/react-query zustand
# i18n
npm i next-intl
# 테스트 (CLAUDE.md TDD 의무)
npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```
> 보안/라이선스(I3·C7): 위 패키지는 모두 MIT, 광범위 사용·유지보수 활발. axios/lodash 등 불필요 의존 배제(표준 fetch/Intl 사용, CLAUDE.md B7).

---

## 4. ez-flow 통합 파일 적용
함께 전달한 **`ez-flow-starter.tar.gz`**를 풀어 생성된 `ez-flow/` 위에 덮어쓴다:
```bash
tar -xzf ez-flow-starter.tar.gz -C ez-flow
```
포함 파일:
| 파일 | 역할 |
|---|---|
| `.env.local.example` | 환경변수 템플릿 (URL/anon key) |
| `src/lib/supabase/client.ts` | 브라우저 Supabase 클라이언트 |
| `src/lib/supabase/server.ts` | 서버 컴포넌트용 클라이언트 |
| `src/lib/supabase/middleware.ts` | 세션 갱신 + 인증 가드 |
| `middleware.ts` | Next.js 미들웨어 진입점 |
| `src/lib/constants.ts` | 기획서 §17 상수 (매직넘버 금지) |
| `src/components/ui/Button.tsx` + `.test.tsx` | 디자인 시스템 원자 + TDD 예시 |

---

## 5. 환경변수 설정
```bash
cp .env.local.example .env.local
```
`.env.local` 편집:
```
NEXT_PUBLIC_SUPABASE_URL=https://calmwxsckghhfcydsybv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase API 탭의 anon/publishable key>
```
> ⚠️ **보안(원칙2·5)**: `.env.local`은 `.gitignore`에 있어 커밋 안 됨(확인 필수). `service_role` 키는 여기에도 넣지 말 것 — 서버/Edge 전용. `NEXT_PUBLIC_` 접두사가 붙은 값은 **브라우저에 노출**되므로 anon key만 허용.

---

## 6. 로컬 실행 & 검증
```bash
npm run dev      # http://localhost:3000 — 미인증이면 /login 리다이렉트 확인
npm run test     # Button 테스트 통과 확인 (TDD)
npm run build    # 프로덕션 빌드 무오류 확인
```

---

## 7. 첫 푸시
```bash
git init && git add -A && git commit -m "[init] ez-flow Next.js + Supabase 스타터"
git branch -M main
git remote add origin https://github.com/divoost/ez-flow.git
git push -u origin main
```

---

## 8. 다음 단계 (Phase 1, 기획서 §14)
- 인증 화면(`/login`, 워크스페이스 선택) 실제 구현 (§6.4)
- 대시보드 위젯(FR-1.1~1.4) — `user_dashboard_layout` 연동
- 프로젝트 목록 + 업무 보드/리스트 (FR-4)
- **RLS 보안 테스트를 CI 게이트로** (기획서 §15, 이미 스키마 RLS 검증됨)
- i18n 카탈로그(ko/en) 채우기 (next-intl)

> 각 기능은 TDD(Red→Green→Refactor) + 한 커밋=한 의도 (CLAUDE.md).

---

## 부록: 통합 파일이 하는 일 (요약)
- **Supabase SSR**: 쿠키 기반 세션을 미들웨어에서 갱신 → 서버/클라 일관 인증. 클라는 anon key만, RLS가 실제 방어선(기획서 §6.4).
- **인증 가드**: `middleware.ts`가 미인증 접근을 `/login`으로 보냄. (data-require-auth 패턴의 Next.js판)
- **상수**: DB 코드값(우선순위/상태/역할/로케일/TZ)을 앱에서 단일 소스로 강제.
