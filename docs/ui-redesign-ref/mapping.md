# UI 재설계 매핑 추적표 (Phase 1)

> 작성: 2026-11-14 · 브랜치: `claude/awesome-meitner-MUHqB`
> 목적: 목업 **UI-01~UI-21**(디자인 기준) ↔ 기존 `sns-platform` 실제 화면을 대조하여,
> 재설계 시 **기능·데이터·`data-*`·JS 훅·`data-i18n` 보존** 근거를 명시한다.
> **이 표 승인 전에는 화면 코드를 수정하지 않는다.**

---

## 0. 조사로 확정된 전역 사실

1. **`data-i18n`(ko/en/vi) 적용 화면은 `index.html`(대시보드) 단 하나.** 나머지 `pages/*`·`admin/*` 27개 화면은 `data-i18n` **0건**. → "i18n 유지"는 사실상 **대시보드에만 해당**. 다른 화면 재설계 시 i18n은 "신규 작업"이며 이번 Phase 1 범위에 **추가하지 않는다**(별도 승인 사항).
2. **기존 화면 전부 영구 좌측 사이드바(`.sidebar`/`.nav-section`) 구조.** 목업 원칙은 "상단 메뉴 + 영구 좌측 메뉴 없음". → 재설계의 **핵심 구조 변경점**.
3. **5단계 파이프라인/칸반 보드(`plan→produce→localize→distribute→publish`) 화면은 기존에 존재하지 않음.** (`kanban`/`pipeline`/`칸반` 문자열 전역 0건.) 목업 UI-04의 칸반은 **기존에 없는 신규 UI 패턴**.
4. 기존 상호작용 패턴: 대부분 inline `onclick="fn()"` + `id` 기반 JS 렌더. `data-*` 훅은 일부 화면만(아래 표 "JS 훅" 열).
5. **관리자 콘솔(`admin/*` 12화면)은 목업 21화면(사용자 워크스페이스)과 범위가 다름.** 목업에 직접 대응 화면이 없으므로 **Phase 1·이번 매핑의 재설계 대상에서 제외**하고 별도 단계로 다룬다(표 §3).

---

## 1. 목업 UI-01~UI-21 ↔ 기존 화면 매핑표

| 목업 ID | 목업 화면 | 대응 기존 파일 | URL(배포) | 매핑 | 기존 주요 기능 | JS 훅 / `data-*` | `data-i18n` |
|---|---|---|---|---|---|---|---|
| **UI-01** | 오늘 마케팅 관제 | **`index.html`** | `/sns-platform/` | **부분**(데이터 성격 상이) | 체험플랜·공지·FAQ 카드 / SNS 바로가기 / 전체·오늘 발행 통계 + 채널표 / 통합 KPI 6종 / 최근 콘텐츠 / 주간 인터렉션 | id: `kpi-posts/likes/comments/shares/views/channels`, `recentPosts`, `snsShortcuts`, `totalChannelTable`, `todayChannelTable`, `totalCount`, `todayCount`, `langSelect`, `menuBtn`, `sidebar`, `planDaysLeft/Period`. onclick=`location`만 | **O (70키)** |
| **UI-02** | 캠페인 | — (신규) | — | **신규** | 기존에 캠페인 CRUD 화면 없음(analytics에 성과만) | — | — |
| **UI-03** | 콘텐츠 캘린더 | `pages/calendar.html` | `/pages/calendar.html` | **근접 1:1** | 월 그리드(`cal-grid`), 요약 카드, 월 이동 | onclick=`changeMonth`,`location`. id:`calTitle`. data-*: 없음 | X |
| **UI-04** | **콘텐츠 스튜디오** | **`pages/create.html`** (+`ai-writer.html` AI작성 보조) | `/pages/create.html` | **부분**(작성폼 O / 칸반 X) | 기본정보·채널선택·AI생성·채널별 미리보기·수동입력·AI이미지/영상·저장(초안/확인/발행) | onclick=`toggleCh`,`generateAI`,`switchTab`,`toggleEdit`,`savePost`,`confirmPublish`,`aiGenerateNow`. data-*:`data-value`,`data-channel` | X |
| **UI-05** | 게시 최적화 | `pages/ai-writer.html`(점수·해시태그) | `/pages/ai-writer.html` | **부분** | 주제/키워드·플랫폼·생성옵션·멀티탭 결과·AI프롬프트·추천 해시태그 | onclick=`selectChip`,`selectPlatform`,`generateContent`,`switchMultiTab`,`toggleHashtagEdit`. data-*:`data-p`,`data-platform`,`data-value` | X |
| **UI-06** | 트렌드·리스닝 | `pages/listening.html` | `/pages/listening.html` | **근접 1:1** | 멘션 카드 리스트, 리스닝 시작 | onclick=`startListening`. data-*: 없음 | X |
| **UI-07** | AI 숏폼 팩토리 | — (신규, `create.html`의 AI영상 일부와 중복) | — | **신규** | 숏폼 콘티·9:16·QC 전용 화면 없음 | (create.html `aiGenerateNow` 등 일부) | — |
| **UI-08** | 게시·예약 | `pages/publish.html` + `pages/schedule.html` | `/pages/publish.html`, `/pages/schedule.html` | **분할** | publish: 즉시 발행 폼+대상 트리+미리보기 / schedule: 예약 폼+리스트+AI추천시간 | publish: `togglePlatformExpand`,`toggleAccount`,`publishToSelected`, `data-require-auth`. schedule: `suggestTime`,`addSchedule`,`cancelSchedule` | X |
| **UI-09** | 인터랙션(댓글·DM) | `pages/engagement.html` | `/pages/engagement.html` | **근접 1:1** | 통계 카드, 댓글 카드 리스트, 인라인 답글, 전체 읽음 | onclick=`toggleReply`,`postReply`,`markRead`,`markAllRead`,`fetchRealComments`. data-*: 없음 | X |
| **UI-10** | 성과 분석 | `pages/analytics.html` | `/pages/analytics.html` | **근접 1:1** | KPI 카드, 막대 차트, 데이터표 2개, 기간 선택, CSV | onclick=`setPeriod`,`exportCSV`,`exportReport`,`fetchInstagramInsights`. data-*:`data-period` | X |
| **UI-11** | KOC/KOL(인플루언서) | — (신규) | — | **신규** | 인플루언서 관리 화면 없음 | — | — |
| **UI-12** | 광고 관리 | — (신규) | — | **신규** | 광고비/매출 비교 화면 없음(admin/subscriptions는 구독매출) | — | — |
| **UI-13** | 라이브 운영 | — (신규) | — | **신규** | 라이브 화면 없음 | — | — |
| **UI-14** | 자산 라이브러리 | `pages/media.html` (+`templates.html`) | `/pages/media.html` | **근접 1:1** | 타입탭(전체/이미지/동영상), 미디어 그리드, 업로드/URL 등록 | onclick=`filterType`,`useMedia`,`saveUrl`,`openUrlModal`. data-*: 없음 | X |
| **UI-15** | 승인함 | `admin/content-moderation.html`(성격 부분) | `/admin/content-moderation.html` | **부분/신규** | 검토 대상 콘텐츠 카드(자동검토규칙은 "(계획)" 스텁) | onclick 없음, data-* 없음 | X |
| **UI-16** | AI 직원 5종 | — (신규) | — | **신규** | AI 직원 운영 화면 없음 | — | — |
| **UI-17** | 채널 연결 | `pages/settings.html`(SNS 채널 섹션) + `pages/safety-guide.html`(정책) | `/pages/settings.html` | **부분** | 계정 카드 + 설정 마법사(`wz-step`) / safety-guide: 채널별 정책 가이드 | settings: `openSetupWizard`,`addAccount`,`wizardNext/Prev`, `data-ps-id`,`data-ps`,`data-require-auth`. safety: `openSetup` | X |
| **UI-18** | 고객사·조직 | `admin/users.html`(부분) | `/admin/users.html` | **부분/신규** | 회원 표·상세·제재(멀티테넌트/역할전환은 신규) | onclick=`viewUser`,`suspendUser`,`sendEmailToUser`,`refreshFromSupabase`. data-*: 없음 | X |
| **UI-19** | 구독·크레딧 | `pages/billing.html` (+`admin/subscriptions.html`) | `/pages/billing.html` | **근접 1:1** | 플랜 그리드, 크레딧 충전, 결제수단, 사용 이력 탭 | onclick=`selectTopup`,`selectPayMethod`,`switchHistoryTab`,`upgradePlan`. data-*:`data-amount`,`data-credits-cents`,`data-method`,`data-require-auth` | X |
| **UI-20** | EZworks 연동 | — (신규) | — | **신규** | 연동 화면 없음 | — | — |
| **UI-21** | 설정·출시 검수 | `pages/settings.html` + `pages/safety-guide.html` | `/pages/settings.html` | **부분** | settings: 계정/일반/AI기본값/데이터 / safety-guide: 보안·운영 가이드(S1~S8 성격) | settings 상동, safety `openSetup`/`closeSetup` | X |

**요약**: 기존 대응 있음 **11개**(근접 7 + 부분 4), **신규 설계 7개**(UI-02·07·11·12·13·16·20), 분할/복합 다수.

---

## 2. Phase 1 재설계 2화면 — 보존 항목 & 재설계 접근

### 2-A. 대시보드 (UI-01 = `index.html`)

**반드시 보존**(스타일만 교체):
- `data-i18n` 키 **70개 전량**(`nav_*`, `kpi_*`, `card_*`, `day_*`, `recent_*`, `setup_intro_*`, `total_*`, `today_*`, `weekly_title`, `shortcuts_title` 등)
- JS가 채우는 `id` 훅: `kpi-posts/likes/comments/shares/views/channels`, `recentPosts`, `snsShortcuts`, `totalChannelTable`/`todayChannelTable`, `totalCount`/`todayCount`, `langSelect`, `menuBtn`, `sidebar`, `planDaysLeft`/`planPeriod`
- 외부 스크립트: `js/i18n-common.js`, `js/i18n.js`, `js/secure-storage.js`, `js/auth-guard.js`
- 기존 기능 블록: 설정 안내, 체험플랜/공지/FAQ 카드, SNS 바로가기, 발행 통계+채널표, 통합 KPI 6종, 최근 콘텐츠, 주간 인터렉션

**긴장점**: 목업 UI-01은 "승인 대기·발행 예정·댓글 문의·AI직원 5종·결정할 일·게시 타임라인" 중심인데, **이 데이터는 기존 대시보드에 없음**. 반대로 기존 KPI(좋아요/공유/조회수)는 목업에 없음.

### 2-B. 콘텐츠 스튜디오 (UI-04 = `create.html`)

**반드시 보존**:
- 기능 블록: 기본정보·채널 선택(`toggleCh`/`data-value`)·AI 생성(`generateAI`/`aiGenerateNow`)·채널별 미리보기 탭(`switchTab`/`data-channel`)·수동 입력·AI 이미지/영상·저장 흐름(`savePost('draft'|'review')`/`confirmPublish`)
- 채널값: `facebook/tiktok/instagram/naver_blog/naver_cafe/xiaohongshu/douyin`

**긴장점**: 목업 UI-04의 **5단계 칸반 보드는 기존 데이터에 `phase` 필드가 없어** 그대로 구현 시 **데이터 구조 추가**가 필요(승인 사항). `create.html`의 저장 상태는 `draft/review`뿐.

---

## 3. 관리자 콘솔(`admin/*`) — Phase 1 범위 외

`admin/index, users, subscriptions, content-moderation, api-monitor, reports, email-center, audit-log, notifications, admin-settings, system-health, user-activity` (12화면).
목업 21화면(사용자 워크스페이스)과 성격이 다르므로 **이번 재설계 대상 아님**. 일부만 목업과 부분 대응(content-moderation→UI-15, users→UI-18, subscriptions→UI-19 보조). 별도 Phase에서 다룬다.

---

## 4. 마스터 승인·결정 필요 사항

재설계의 데이터/범위에 영향을 주는 결정이라 코드 착수 전 확인이 필요합니다.

| # | 결정 항목 | 옵션 A (보수·안전) | 옵션 B (목업 충실) | 영향 |
|---|---|---|---|
| **Q1** | 대시보드 정보구조 | 기존 블록(KPI/최근콘텐츠/주간인터렉션/채널표)을 **유지**하고 목업 시각 스타일(.ds-*)만 입힘 | 목업처럼 **승인 대기·AI직원 5종·게시 타임라인** 블록 추가 | A=데이터 변경 0 / B=**새 데이터·로직 추가(승인 필요)** |
| **Q2** | 스튜디오 5단계 칸반 | 기존 **작성 폼**을 .ds-*로 재스타일(칸반 미도입) | 목업처럼 **5단계 칸반 보드** 도입 | A=데이터 변경 0 / B=콘텐츠 `phase` 필드·상태기계 **추가(승인 필요)** |
| **Q3** | 좌측 사이드바 → 상단 메뉴 | 재설계 2화면만 상단 메뉴로, 나머지는 기존 사이드바 유지(과도기 공존) | — | 2화면만 `ds-root`로 격리(Strangler Fig), 충돌 0 |
| **Q4** | i18n | 2화면 모두 기존 수준 유지(대시보드만 i18n, 스튜디오는 i18n 없음 그대로) | 스튜디오에 i18n 신규 추가 | B=추가 작업·범위 확대 |

**권장(루나 의견)**: **Q1·Q2 모두 옵션 A**. 이유 — 원칙이 "기능·데이터 보존, 스타일만 재설계"이고, 목업 데이터(승인/AI직원/phase)는 아직 DB·로직에 없어 B를 택하면 "스타일 재설계"가 "기능 신설"로 번져 리스크·검증 범위가 커집니다. 먼저 A로 **시각 언어(다크 네이비·.ds-* 카드·상단 메뉴·반응형)**를 증명하고, 목업의 새 정보구조는 데이터·로직 설계를 별도 승인받아 Phase 2에서 추가하는 것을 제안합니다. **Q3=과도기 공존, Q4=기존 유지** 권장.

---

**다음 단계**: 위 표 + Q1~Q4 승인 → 승인된 범위로 대시보드·스튜디오 재설계 → Playwright 1280/390 검증 → 스크린샷 보고.
