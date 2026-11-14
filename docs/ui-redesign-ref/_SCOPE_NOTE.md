# UI 재설계 참조 자료 (Phase 1)

이 폴더는 `sns-platform` UI 재설계의 **디자인 기준 자료**입니다. (Figma 미사용 — 아래 목업이 Figma를 대신함)

## 자료
- `HubOnTrade_SNS_Full_Interactive_UI.html` — 21개 화면 인터랙티브 목업 (디자인/구조 기준, localStorage 데모)
- `DEVELOPMENT_HANDOFF.md` — 제품 UI + 백엔드/SaaS/API/보안(S1~S8) 지시서, 화면 UI-01~UI-21
- `README_사용방법.md` — 목업 조작법 및 "되는 일/안 되는 일" 범위
- `previews/PC_dashboard.png`, `previews/PC_studio.png` — 첫 재설계 2화면의 시각 프리뷰

## 첫 범위 (마스터 승인)
1. **매핑 추적표 먼저**: 목업 UI-01~UI-21 ↔ 기존 `sns-platform` 화면/URL/기능/`data-i18n`/`data-*` 훅. 코드 전 승인.
2. 승인 후 **대시보드(UI-01 = `sns-platform/index.html`)** + **콘텐츠 스튜디오(UI-04)** 2화면을 `.ds-*` 디자인 시스템으로 재설계.
3. Playwright 1280/390 검증 + 스크린샷 보고 → 마스터 승인 → 나머지 19화면 배치 확대.

## 원칙 (session-handoff + CLAUDE.md)
- 기능·데이터·로직·`data-i18n` 유지, 스타일만 재설계. 로직/DB 변경은 사전 승인.
- 재설계 화면 루트에 `class="ds-root"` 부여 후 `.ds-*` 사용 (기존 `sns.css`와 충돌 0, Strangler Fig).
- 작업 브랜치 `claude/awesome-meitner-MUHqB`에만 커밋. main 금지. 한 응답 5개+ 파일 수정 시 사전 계획 공유.
- 외부 CDN 차단 환경 — 에셋은 `sns-platform/vendor/` 자체호스팅 사용.
