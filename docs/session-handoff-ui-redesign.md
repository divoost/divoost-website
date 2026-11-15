# 🔄 세션 핸드오프 — UI 디자인 고도화 (DIVOOST / HubOnTrade SNS)

> 작성: 2026-11-14 · 브랜치: `claude/awesome-meitner-MUHqB`
> **새 세션은 이 문서 → `CLAUDE.md`(프로젝트 헌법) → `docs/adr/ADR-001-design-system.md` 순으로 먼저 읽을 것.**

---

## 1. 목표 (마스터 지시 요약 10개)
기존 **기능·데이터를 유지**하며 `sns-platform` 전체 UI를 **"AI 대량생성 템플릿이 아닌, 전문 SaaS 디자이너 수준"**으로 재설계.
1. 기능·데이터 유지, UI 전면 재설계
2. Figma를 디자인 기준 + Figma MCP 연결 (→ 완료, §3)
3. Metricool·Planable·Linear·Canva·Mobbin **원리만 차용**(복제 금지)
4. DIVOOST 전용 디자인 시스템(색·타이포·간격·버튼·아이콘·표·캘린더·영상카드)
5. **획일 카드·과도한 그라데이션·불필요 배지·반복 디자인 제거**
6. 메일함식 2단 레이아웃 **강요 금지** — 화면 성격별 구조
7. 이미지·영상 중심 화면은 **콘텐츠를 크게**
8. 기존 HTML/JS 구조 우선 유지, Flowbite·Lucide 선택 적용
9. **PC 1280 / 모바일 390** 기준, **Playwright 검증**
10. Figma↔배포 화면 차이 비교 수정. **기능 삭제·데이터 구조 변경은 사전 승인**

## 2. ✅ 완료: Phase 0 — 디자인 시스템 기반 (전부 신규, 기존 28화면 무변경)
| 파일 | 내용 |
|---|---|
| `sns-platform/css/design-system.css` | **단일 소스.** 토큰 `--ds-*`(색·타이포·간격·radius·그림자) + 컴포넌트 `.ds-*`(버튼·입력·배지·표·탭·세그먼트·KPI·캘린더·영상카드). Primitive→Semantic 2계층, 다크모드(`[data-theme=dark]`) 포함 |
| `sns-platform/design-system.html` | 라이브 스타일 가이드(브라우저로 열어 확인, 다크토글 포함) |
| `sns-platform/vendor/` | Pretendard(한글) + Lucide(아이콘) **자체 호스팅** |
| `docs/adr/ADR-001-design-system.md` | 의사결정 기록 |

**핵심 설계 원칙**: 모든 클래스 `.ds-*` / 토큰 `--ds-*` → 기존 `sns.css`(.btn/.card/.sidebar)와 **충돌 0**. 따라서 화면을 **하나씩 안전하게 이관**(Strangler Fig). 재설계 화면 루트에 `class="ds-root"` 부여 후 `.ds-*` 사용.

## 3. ✅ 완료: Figma 연결
- **토큰**: 읽기전용(`file_content:read`) Figma PAT → **Default 환경에 암호화 저장**. 프록시가 `api.figma.com` 요청의 `X-Figma-Token` 헤더에 자동 주입. **새 세션에서도 유효**(재입력 불필요).
- **MCP**: `.mcp.json`(리포 커밋됨) → **새 세션 시작 시 `figma` MCP 자동 로드** (project scope라 **승인 1회** 필요할 수 있음). `FIGMA_API_KEY=proxy-injected`는 placeholder(실제 토큰은 프록시 주입).
- **디자인 읽는 2가지 방법**:
  - (a) 새 세션의 **figma MCP 도구** (`mcp__figma__*`)
  - (b) **REST 직접**: `curl -H "X-Figma-Token: proxy-injected" "https://api.figma.com/v1/files/{FILE_KEY}?depth=1"` (프록시가 토큰 교체)
- ⚠️ **Figma 파일 링크는 반드시 "텍스트"로 받을 것** (스크린샷 OCR은 키 오독 → 404 발생함).
- ⚠️ 이 환경은 **외부 CDN(unpkg/jsdelivr) 차단**. 에셋은 vendor 자체호스팅으로 해결. npm 레지스트리는 허용.

## 4. 작업 원칙 (CLAUDE.md 핵심 — 반드시 준수)
- **한국어, "마스터님" 호칭.** 보안 위험은 추천보다 **먼저** 공지(I1~I7).
- **기존 기능·데이터·로직 유지.** 스타일만 재설계. 로직/데이터/DB 변경은 **사전 승인**.
- **Read 후 Edit**(기존 파일). 신규만 Write. 한 응답에 5개+ 파일 수정 시 **사전 계획 공유**.
- 작업 **브랜치**(`claude/awesome-meitner-MUHqB`)에만 커밋/푸시. **main 금지**. 커밋은 보통 Stop 훅이 요청.
- 커밋 메시지: 한국어 `[영역] 요약` + 상세/왜/테스트. attribution은 **새 세션 자신의** 세션 링크 사용.
- 비밀키 코드 노출 금지. `catch {}` 금지.

## 5. 검증 (Playwright — 환경에 설치됨)
```js
const { chromium } = require('playwright');
const b = await chromium.launch({ args:['--no-sandbox'], proxy:{ server: process.env.HTTPS_PROXY } });
const ctx = await b.newContext({ viewport:{width:1280,height:900}, deviceScaleFactor:2, ignoreHTTPSErrors:true });
// file:// 로 대상 HTML 로드 → networkidle 대기 → screenshot. PC 1280 / 모바일 390 두 뷰.
```
`requestfailed` 리스너로 실패 요청 0건 확인. 스크린샷은 `SendUserFile`로 마스터께 보고.

## 6. 미결 결정 (마스터 확인 대기)
- **첫 재설계 화면**: 추천 = **대시보드(`sns-platform/index.html`) + 미디어(`sns-platform/pages/media.html`)** (데이터형+콘텐츠형 동시 증명). 또는 대시보드만.
- **vendor 2.3MB**: 현재 커밋됨. 롤아웃 때 **경량화**(Pretendard 동적서브셋 + Lucide 사용 아이콘만 추출) 검토.

## 7. ▶ 다음 단계 (Phase 1)
마스터가 **UI/작업지시서(+Figma 링크 텍스트)**를 주면:
1. 대상 화면을 `.ds-*` 디자인 시스템으로 **재설계** (기존 기능·data-* 속성·JS 훅·i18n `data-i18n` 보존)
2. **Playwright 1280/390 검증** + 스크린샷 보고
3. 마스터 승인 후 나머지 화면 **배치 단위**로 확대 (커밋 분리)

## 8. 벤치마크 원리 (복제 아님)
Linear=절제·미세그림자 / Metricool=데이터밀도 / Planable=콘텐츠 중심 캘린더 / Canva=대형 썸네일 / Mobbin=실사용 흐름 참고.

## 9. 현재 화면 인벤토리 (sns-platform, 총 28개·11,680줄)
- 대시보드: `index.html` · 사용자 pages 17개(create/ai-writer/publish/schedule/calendar/media/templates/engagement/listening/analytics/history/settings/billing/safety-guide 등) · admin 12개.
- 스타일이 **31개 페이지 인라인 `<style>`에 분산** → DDS로 수렴하는 게 큰 그림.
- i18n: `data-i18n` 속성 사용(ko/en/vi) — 재설계 시 **유지**.
