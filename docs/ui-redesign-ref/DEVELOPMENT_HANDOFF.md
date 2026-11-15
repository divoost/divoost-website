# HubOnTrade SNS / DIVOOST SNS — 전체 제품 UI 및 개발 인수지시서

**버전:** UI Prototype 1.0 · **작성 기준일:** 2026-11-14  
**사용:** 독립형 AI SNS·콘텐츠 마케팅 SaaS, 한국·베트남·중국·기타 국가, 개인·기업·대행사 고객  
**입력 근거:** 사용자가 제공한 `sns-v2-benchmark-comparison.md`, 기존 EZworks AI Office/SNS 기획 대화, 경쟁사 조사 자료.  
**중요:** 이 산출물은 브라우저에서 실제로 조작하는 인터랙티브 UI 목업 + 서버 구현 지시서다. GitHub 원본 코드·Supabase 운영 DB·Vercel 배포 콘솔의 직접 감사, 실제 SNS 연결, 유료 모델 실행은 수행하지 않았다. 따라서 UI 구현 완료를 외부 서비스 연동 완료로 혼동하지 않는다.

## 0. 이번 의사결정 — 기존 기획과 달라진 점

**최신 의사결정:** EZworks에서 SNS 전문 기능을 HubOnTrade/DIVOOST SNS로 이전하여 **DIVOOST SNS를 독립형 SaaS**로 운영한다. EZworks는 일반 회사 업무·프로젝트·업무일지·전사 결재·전체 AI 관제 역할을 유지한다.

| 기능 / 데이터 | 최종 정본 시스템 | 마이그레이션 방향 |
|---|---|---|
| SNS 브랜드·캠페인·월간 콘텐츠 계획 | DIVOOST SNS | EZworks 기존 `sns_brands`와 콘텐츠 업무 규칙 이관 |
| 기획→제작→현지화→배포→게시 5단계 | DIVOOST SNS | 규칙·상태 전이·이력 보존. 이것은 **5단계 결재**가 아님 |
| 콘텐츠·시리즈·고정 캐릭터·제작 산출물 | DIVOOST SNS | 기존 영상 프록시 연계·라이선스 관리 확장 |
| SNS 게시 큐·플랫폼 계정·토큰 | DIVOOST SNS | 기존 HubOnTrade 커넥터 재사용 및 보안 수정 |
| 댓글/DM 수신·상담·KOC·라이브 | DIVOOST SNS | 신규 도메인 서비스. 기존 고객/업무와 연결 |
| 광고 데이터·KPI·성과 | DIVOOST SNS | EZworks 집계 규칙을 그대로 이관하고 API 수집기 확장 |
| SNS 승인 | DIVOOST SNS | 외부 고객 승인 가능. EZworks 전사 결재와 서명된 이벤트 연동 |
| 직원 인사·팀·일반 프로젝트·업무일지 | EZworks | 이동하지 않음. 연동 ID와 링크만 보관 |
| 외부 SaaS 구독·AI 크레딧 | DIVOOST SNS | 기존 `plans/subscriptions/payments/credit_*/ai_usage_logs` 재사용 |

**금지:** 전체 EZworks DB를 SNS에 복제하지 않는다. 이전 도중 동일 콘텐츠를 두 시스템에서 동시에 쓰는 **dual-write** 금지. 업무·결재 관련 기존 데이터 및 권한 삭제 금지. EZworks 기존 F-01~F-30 보존 규칙과 충돌 시 승인된 이관 계획이 선행되어야 한다.

## 1. 제품 포지셔닝과 설계 원칙

**제품 정의:** “개인·브랜드·마케팅 대행사가 국가별 SNS를 하나의 장소에서 기획·제작·게시 준비·댓글/DM 처리·KOC 협업·광고 분석까지 연결하고, AI가 초안을 만들되 사람의 승인과 정책을 따라 실행하는 플랫폼.”

- 개인: 1인 크리에이터용 단순 시작. 워크스페이스 하나, 복잡한 팀 승인/대행사 메뉴 기본 접힘.
- 기업: 브랜드별 캠페인, 팀·국가별 협업, 콘텐츠 승인, ROI 분석.
- 마케팅 대행사: 고객사→브랜드→채널 계층, 외부 고객 승인 포털, 고객사별 보고서·결제·권한 분리.
- EZworks 병행 기업: SNS 결과를 EZworks 업무지시·승인·업무일지로 자동 연결하지만 사용자에게 중복 작성 요구 금지.
- 기본 화면은 **이메일 수신함 형태 금지**. 결정할 일 4개, 오늘 게시, 5명 AI 직원, 캠페인 핵심 결과로 시작.
- UI 레이아웃: 네이비/인디고, 데스크톱 상단 메뉴(영구 좌측 메뉴 없음), 390px 모바일 하단 빠른 탭 4개 + 전체 기능, 1280px/390px 반응형.
- 날짜는 브랜드·계정 타임존을 따르고, 서버 저장은 UTC. 실시간 연결·수정 시 데이터 충돌 UX 제공.
- AI 기능은 `준비/생성 → 검토 → 승인 → 실행 → 결과 확인`의 명확한 상태 기계로 구현.

## 2. 전체 화면 목록 — 21개, 실제 인터랙티브 HTML 포함

| ID | 화면 | 이번 HTML에서 실제 조작 가능한 범위 | 서버 구현 필수 영역 |
|---|---|---|---|
| UI-01 | 오늘 마케팅 관제 | 승인 대기, 발행 예정, 댓글 문의, AI 직원 카드 이동 | 실시간 이벤트·국가/브랜드별 집계 |
| UI-02 | 캠페인 | 추가·수정, 예산·목표·기간·담당자, 콘텐츠 연결 | 저장, 예산 승인, 프로젝트 이관 |
| UI-03 | 콘텐츠 캘린더 | 월 이동, 날짜 선택, 콘텐츠 추가, 월간 계획 제출 시연 | 예약 쿼리, 월간 계획 버전·결재 |
| UI-04 | 콘텐츠 스튜디오 | 5단계 칸반/목록, 브리프·캡션·채널·언어 작성 | 브리프/버전/RLS/승인 상태기계 |
| UI-05 | SNS 게시 최적화 | 문안 입력, 규칙 기반 글 길이·해시태그·CTA 점검 | 계정별 최적 시간·채널 성과·AI 최적화 |
| UI-06 | 트렌드·리스닝 | 키워드 등록, 캠페인 브리프 생성 | 공식/허가된 데이터 수집, 출처/신뢰도 관리 |
| UI-07 | AI 숏폼 팩토리 | 프로젝트·대본·6컷 콘티·권리 검수·9:16 프리뷰 | 자산 업로드, 영상 생성/렌더, 자막, QC, 재시도 |
| UI-08 | 게시·예약 | 승인된 콘텐츠로 게시 큐 추가, 채널별 수동 안내, 중복 요청 거절 | OAuth, 큐, 재시도, 게시 결과 ID, 앱 심사 |
| UI-09 | 인터랙션 | 댓글/DM 분류, 담당자 변경, FAQ 초안, 처리 완료, EZworks 업무 연결 시연 | 웹훅, 인바운드 메시지, 허용된 답장 전송 |
| UI-10 | 성과 분석 | 샘플 KPI·ROAS, 캠페인 연계, CSV 내보내기 | 플랫폼 메트릭 API, 데이터 품질/리포트 자동화 |
| UI-11 | KOC/KOL | 후보 등록/수정, 단계·견적·샘플·안전성 검토 | 계약·배송·발행 URL·성과 연결 |
| UI-12 | 광고 관리 | 수기 성과 등록·수정, CSV 로컬 가져오기, 광고비/매출 비교 | 매체 수집기, 권한, 예산 승인 |
| UI-13 | 라이브 | 방송 계획·목표·호스트·체크리스트 저장 | 각 라이브 플랫폼의 실시간 API 연동 검증 |
| UI-14 | 자산 라이브러리 | 이미지/영상/고정 모델/템플릿 메타데이터 | Supabase Storage, 리비전/라이선스/서명 URL |
| UI-15 | 승인함 | 콘텐츠·광고·KOC 검토/승인/수정 요청, 콘텐츠 상태 연동 | 승인 차수·위임·통지·EZworks 연동 |
| UI-16 | AI 직원 5종 | 역할·업무·상태, 샘플 결과, 자동화 토글, 긴급 중단 | 실제 LLM 프록시, 실행 큐, 비용 측정, 승인 게이트 |
| UI-17 | 채널 연결 | 9개 채널별 정책·연동 체크리스트 | OAuth/개발자 앱/권한심사/토큰 저장 |
| UI-18 | 고객사·조직 | 브랜드 등록, 관리자/국가직원/외부고객 역할 전환 | 다중테넌트 계층·SSO·RLS·SCIM 준비 |
| UI-19 | 구독·크레딧 | 플랜·크레딧·샘플 사용량·CSV 내보내기 | 실결제, 웹훅, 원장, 환불·한도 |
| UI-20 | EZworks 연동 | SNS↔EZworks 이벤트 생성 시연·연동 흐름 | 인증 위임, 서명된 서버 이벤트, 재처리/감사 |
| UI-21 | 설정·출시 검수 | 보안 S1~S8, 테마, 중단 상태, 데모 초기화 | 비밀키·역할·보안 게이트 자동 진단 |

**HTML 화면 사용법:** ZIP에서 `HubOnTrade_SNS_Full_Interactive_UI.html`을 브라우저로 열어 사용. 새 콘텐츠 등록 → 승인함 → 승인 → 예약 게시 → 캘린더 이동을 시연. 모바일에서는 아래 `전체` 메뉴로 21개 기능에 접근. UI는 `localStorage`를 사용하는 브라우저 로컬 데모이며, 파일 URL/브라우저 보안 정책에 따라 영구 저장이 불가능할 수 있다. 서버가 있는 경우에도 내부 샘플 데이터 외 다른 계정에 접근하지 않는다.

## 3. 공통 기능 상세 기능 요구사항

### 3.1 마케팅 운영 흐름 (F-CONTENT)

1. 브랜드 가이드(톤앤매너, 금지 표현, 승인자, 국가/언어)를 캠페인별 템플릿으로 관리.
2. 월간 계획은 ‘제출일(기본 매월 5일, 조직별 변경)’을 가질 수 있고, 제출/반려/승인/재제출 버전을 분리.
3. 콘텐츠 기본 객체에 브랜드·캠페인·원본 브리프·책임자·검토자·국가·언어·채널·자산·제작 상태·예정시각·산출물·권리 검토·수정 이력 저장.
4. **5단계 콘텐츠 파이프라인**: `plan → produce → localize → distribute → publish`(코드에서 기획/제작/현지화/검수/예약의 현재 표기와 매핑 테이블 마련). 승인 흐름은 별도 상태 객체.
5. 카드형·칸반·캘린더 보기. 채널별 콘텐츠 버전 저장; 마스터 문구의 수정이 이미 승인된 현지어 버전을 임의 덮어쓰지 않음.
6. `content_status`와 `approval_status`와 `publish_job_status`를 별도 저장하여 서로 혼동하지 않음.
7. 일간/주간/월간 마케팅 캘린더, 콘텐츠 실패/성공/재시도/수동 게시 이력 추적.

### 3.2 AI 포스팅 최적화 (F-OPTIMIZE)

1. 국가·플랫폼·계정별 과거 노출·참여·전환 데이터를 기반으로 최적 게시시간 후보를 추천하되 데이터 부족은 `— / 데이터 부족`으로 표시.
2. 제목/캡션 길이, 해시태그 관련성/중복, CTA, 접근성(자막·대체텍스트), 금지·법적 표현, 브랜드 톤, 언어 혼합 오류 점검.
3. 업로드 가능 영상 비율·길이·용량·썸네일·자막 규격은 게시 시점의 플랫폼 공식 정책을 서버 동기화.
4. A/B 콘텐츠 변형: 한 캠페인 아래 `content_variant_id`로 분리, 동일 노출 구간·예산을 기반으로 비교; 작은 샘플의 성과를 과도하게 일반화하지 않음.
5. 기존 게시물/해시태그 반복·유사 카피 중복 감지. 플랫폼 정책상 스팸성 반복 게시 방지.

### 3.3 영상·숏폼 팩토리 (F-SHORTS)

1. 입력: 상품·브랜드 자료, 촬영 영상, 롱폼 영상, 음성, 고정 모델/배경/로고.
2. 생성: 목적(인지도/반응/판매/라이브 예고), 대본·훅·CTA, 9:16 콘티, 15/30/60초 템플릿, 국가별 언어, 자막·음성 검수.
3. **시리즈/에피소드/고정 캐릭터/기준 컷/복장·신체 비율/브랜드 안전** 정보를 한 세트로 유지; 출력물마다 변경 검토.
4. AI 생성은 기존 SNS 프록시(Replicate/fal/OpenAI) 우선 평가, 긴 영상 클립화는 OpusClip 등 검토, 템플릿 렌더는 Creatomate/Shotstack 후보.
5. 모델·템플릿별 요청 수, 렌더 성공률, 실패 사유, 사용 크레딧, 원본과 라이선스, 저작권 출처/음원/초상권 승인 기록.
6. '미리보기'는 저해상도, '최종본'은 해상도/비율/음원/자막 품질 확인 후 게시 승인.
7. 장시간 렌더를 Vercel HTTP 요청 안에서 동기로 기다리지 않음. Jobs/Queue/Worker와 상태 폴링 또는 웹훅 사용.

### 3.4 게시·인터랙션 (F-PUBLISH / F-ENGAGE)

1. 플랫폼별 OAuth와 권한 심사 완료 여부를 `connected`, `needs_review`, `manual`, `blocked`로 구분. UI 위저드가 있다고 자동 게시 가능이라고 주장하지 않음.
2. 승인된 콘텐츠만 큐에 적재, 채널별 크리에이티브 규격/타임존/앱 심사/쿼터/스팸 정책 검사.
3. 중복 발행 방지 키: `(tenant, brand, content_variant_id, channel_account_id, schedule_slot)`; 네트워크 재시도 시 플랫폼 결과 조회 후 재송신.
4. 수동 안내 채널: 게시 준비 링크/복사 문구/파일 내보내기/담당자 지정/완료 시 URL 및 증빙 첨부.
5. 댓글·DM은 공식 허용된 인바운드 채널만. 수신 구분(문의/구매/클레임/스팸/위기), SLA, 언어, 담당자, 답장 초안, 승인 후 전송. 고객 개인정보는 AI/직원 최소 권한.
6. 무차별 선제 DM·가짜 참여·대량 좋아요/팔로우 자동화·허가되지 않은 스크래핑 금지.
7. EZworks 연결: 고객 클레임→직원 업무지시, 댓글/DM 결과→프로젝트 보고, 콘텐츠 승인→업무 완료.

### 3.5 KOC·광고·성과 (F-KOC / F-ADS / F-REPORT)

1. KOC 후보: 플랫폼·국가·팔로워·최근 참여(근거), 견적, 브랜드 적합/위험, 연락·협의, 계약/샘플 배송, 승인·게시 URL·성과.
2. 라이브: 상품/가격·쿠폰/호스트/스크립트/리허설/방송 스케줄/실적/사후 숏폼 재활용.
3. 광고 데이터: Meta·Google·TikTok 등의 승인된 API, CSV/xlsx 수동 업로드. 원본, 기간/타임존, currency, campaign ID, creative ID, `source`, `last_synced` 보존.
4. EZworks의 **광고 일 안분 금지** 계산 규칙을 이관. 일별 미수집 데이터는 0이 아니라 누락/미연결로 표시. 기간 총계를 임의로 일수로 나누지 않음.
5. ROAS, CTR, CPC, CPM, 전환, 전환 매출은 각 플랫폼 정의·어트리뷰션 창을 함께 표시하며, 불명확한 추정치를 사실로 보이지 않음.
6. 캠페인 → 콘텐츠 → 소재 → 게시 ID → 광고 ID → 성과 ID 추적.
7. 리포트: 계정별/국가별/브랜드별/콘텐츠별/크리에이터별, API/수기/CSV의 출처와 공백 명시. 공유는 승인된 고객사만.

## 4. 플랫폼별 게시·수신 제품 정책 (실제 연동 전 재검증)

| 채널 | UI에서 제공할 기능 | 서버 연동 게이트 |
|---|---|---|
| Facebook Page | 이미지/영상/예약/댓글 관리 | Meta 앱 라이브/권한 심사·Page 역할·Graph 버전 점검 |
| Instagram Professional | 피드·Reels·댓글·DM | 프로 계정, 게시/메시지 권한 및 앱 심사 |
| TikTok 글로벌 | 숏폼 제작·게시 승인·예약 준비 | Direct Post 심사·클라이언트 키·권한·공개 범위 |
| YouTube Shorts | 업로드/스케줄/댓글·성과 | Google OAuth/쿼터/기능별 정책 최신 검증 |
| Zalo OA | 베트남 고객 메시징·담당자 연결 | 공식 OA 인증, 메시징 창·옵트인 규칙 |
| Naver Blog | 글·이미지 준비·수동 게시 체크리스트 | 공식 글쓰기 API 종료, 임의 브라우저 자동화는 정책/보안 검토 |
| Naver Cafe | 콘텐츠 초안·수동 가이드 | 공식 글쓰기 지원 현재 여부 확인 |
| Xiaohongshu 小红书 | 중국어 카피·KOC·수동 게시 준비 | 자동 게시 공식/파트너 권한 검증 전 자동화 약속 금지 |
| Douyin 抖音 | 숏폼·라이브·광고 운영 브리프 | 인증 앱·중국 사업자/계정 권한·API 심사 |
| Shopee/TikTok Shop/Lazada/Taobao/Tmall | 상품·라이브·캠페인·링크·판매 기여 분석 | SNS와 커머스 계정·광고 API는 별도 승인이 필요 |

## 5. 데이터 모델 — 권장 신규/이관 테이블

테이블명은 신규 설계안이며 운영 스키마 확인 전 절대 실행하지 않는다. 모든 브랜드 리소스에 tenant/workspace/brand 관계를 강제한다.

| 영역 | 테이블 (예시) | 주요 필드 |
|---|---|---|
| SaaS | `tenants`, `workspaces`, `workspace_members`, `client_access`, `brands` | tenant_id, org_id, role, country_id, team_id, brand_id, client_id |
| 캠페인 | `sns_campaigns`, `sns_content_briefs`, `sns_monthly_plans` | brand_id, goal, budget, approvals, plan_version, deadline |
| 콘텐츠 | `sns_contents`, `sns_content_variants`, `sns_content_history` | content_id, channel, locale, version, pipeline_status |
| 자산 | `sns_assets`, `sns_asset_rights`, `sns_series`, `sns_character_profiles` | owner, source, license, canonical_ref, QC, storage_path |
| 숏폼 | `sns_short_jobs`, `sns_storyboards`, `sns_render_outputs` | input_asset_ids, model, status, cost, vendor_job_id |
| 게시 | `sns_channel_accounts`, `sns_publish_jobs`, `sns_post_results` | OAuth ref, scopes, schedule_utc, idempotency_key, remote_post_id |
| 고객 응대 | `sns_interaction_threads`, `sns_messages`, `sns_reply_drafts` | from_channel, conversation_id, sentiment, assignee, SLA |
| 크리에이터 | `sns_creators`, `sns_creator_campaigns`, `sns_samples`, `sns_lives` | rights, fee, ship_status, deliverables, post_url |
| 광고 | `sns_ad_imports`, `sns_ad_metrics`, `sns_performance_snapshots` | period, currency, source, attribution, creative_id, raw_id |
| 승인 | `sns_approval_requests`, `sns_approval_steps`, `sns_approval_history` | object_ref, reviewer, decision, comment, version |
| AI | `sns_ai_runs`, `sns_ai_templates`, `sns_automations` | model, prompt_version, budget, approval_gate, run_state |
| 사용량 | `credit_ledger`, `sns_subscription_entitlements` | append-only balance changes, payment webhook, limits |
| 연동 | `integration_connections`, `outbox_events`, `inbox_events`, `audit_events` | signed payload, schema_version, correlation_id, retry_state |

### 5.1 권한 모델

권한 판단은 단일 `role` 값만으로 끝나지 않는다. `tenant_id + workspace_id + brand_id + country_id/team_id + explicit grant + action + resource`를 모두 확인한다.

- Owner/Admin: 본인이 속한 tenant에서 브랜드/사용자/과금/승인 관리; 전역 SaaS 다른 tenant 접근 불가.
- Brand Manager: 배정된 브랜드/국가의 콘텐츠 작성, 팀 승인 요청, 실적 확인.
- Creator/Editor: 본인 캠페인에 할당된 콘텐츠 편집, 승인·과금 변경 제한.
- Approver: 지정된 브랜드·캠페인·문서 버전만 승인 가능.
- Client: 본인 고객사 브랜드의 승인·결과만 조회; 내부 인사·비용·다른 고객 캠페인 접근 불가.
- Finance: 청구·사용량 범위, OAuth 토큰/비공개 DM 내용 접근 불가.
- AI service identity: job-specific scoped token, 테넌트와 작업 만료 시간 강제, 무조건 superuser 사용 금지.
- Supabase RLS/Storage ACL/Search API/API Routes/Edge Function과 Export 다운로드의 전 경로에 동일 권한 적용.

### 5.2 초안/승인/게시 상태기계

- `draft → in_production → in_localization → review_requested → approved → ready_for_publish → queued → published`.
- `review_requested → needs_revision` 시 수정본 버전 증가 후 재승인 요청.
- `queued → failed/retry_scheduled/manual_required/cancelled`는 명시적 상태로 처리.
- 이미 승인된 내용 변경 시 승인 상태는 무효화하거나 영향 필드만 재검토 규칙을 문서화.
- `approved`가 곧 `published`가 아니며 `manual_required`가 실패도 성공도 아님.

## 6. API / 이벤트 초안

**DIVOOST SNS REST** (모든 API는 인증+권한+Idempotency, prefix 예시 `/api/v1`):

- `GET/POST/PATCH /workspaces/{id}/brands`
- `GET/POST/PATCH /campaigns`, `GET/POST /campaigns/{id}/briefs`, `/monthly-plans/{id}/submit`
- `GET/POST/PATCH /contents`, `/contents/{id}/variants`, `/contents/{id}/approval-request`
- `POST /assets/presign-upload`, `POST /short-jobs`, `GET /short-jobs/{id}`
- `GET /calendar?brand_id=&month=&channel_id=`
- `GET/POST /publish-jobs`, `POST /publish-jobs/{id}/cancel`, `GET /publish-jobs/{id}/result`
- `GET /inbox/threads`, `POST /inbox/threads/{id}/assign`, `POST /reply-drafts`, `POST /replies/{id}/approve`
- `GET/POST /creators`, `/creator-campaigns`, `/live-sessions`
- `POST /ad-imports`, `GET /analytics`, `GET /reports/export`
- `GET /billing/usage`, `GET /billing/credits`, `GET /audit-events`
- `GET /connectors`, `POST /oauth/{provider}/start`, `GET /oauth/{provider}/callback`
- `POST /integrations/ezworks/dispatch`, `POST /webhooks/{provider}` (provider signature verifier 필수)

**EZworks ↔ DIVOOST 이벤트**

| 이벤트 | 생성 시스템 | 수신 시스템 | 처리 |
|---|---|---|---|
| `content.approval_requested.v1` | DIVOOST | EZworks(선택) | 결재/업무 통지 |
| `content.approved.v1` | DIVOOST or EZworks 결재 승인 | DIVOOST | 승인 버전 확정·게시 준비 |
| `publish.requested.v1` | DIVOOST | SNS 게시 워커 | 큐 중복 방지 |
| `publish.completed.v1` | 게시 워커 | DIVOOST/EZworks | remote_post_id, URL, 결과 등록 |
| `publish.failed.v1` | 게시 워커 | DIVOOST/EZworks | 오류 분류, 담당자 알림 |
| `interaction.received.v1` | SNS 웹훅 | DIVOOST/EZworks(선택) | CS 분류·업무 생성 |
| `ai.job.completed.v1` | AI 워커 | DIVOOST/EZworks(선택) | 결과/비용/승인 요청 |
| `ad.metrics.imported.v1` | 광고 수집기 | DIVOOST/EZworks(선택) | 출처·기간 기록 |

각 이벤트에는 `event_id, tenant_id, brand_id, event_type, schema_version, occurred_at_utc, actor_id, correlation_id, idempotency_key, signature`를 포함하고, 수신 저장→처리→ACK/재시도→DLQ 이력을 관리한다.

## 7. 기술 배치: GitHub + Supabase + Vercel

### 초기 단계: 현재 제품 기술 스택을 살린다

- HubOnTrade/DIVOOST: **현재 정적 HTML/JS(ES5), Supabase Auth/DB/Edge Functions, Vercel API** 유지. 첫 배포에서 전체 프런트엔드를 Next.js로 전환하지 않는다.
- UI/도메인 레이어를 모듈화한 뒤 필요한 페이지부터 Next.js/React 전환의 ROI를 별도 평가.
- EZworks: 기존 Next.js 15 + React 19 유지. 같은 Supabase 프로젝트인지 미확인; 임의로 DB·Auth 합치지 않는다.
- GitHub: `main` 직접 배포 금지, feature branch → PR → lint/unit/e2e/security → staging → production. 콘텐츠 에이전트가 코드 변경을 자동 반영하는 경우 별도 배포 승인.
- Vercel: 짧은 API/승인/웹훅 수신, 프런트 제공. 긴 영상 렌더 및 다량 스케줄링은 장기 작업 워커/Queue + 렌더 공급자에 위임.
- Supabase: DB/RLS/Storage/Edge Function. 토큰·appSecret은 서버 비밀 저장소/Vault 등에서 보관, 공개 JS/localStorage 보관 금지.
- Queue/Retry: 단일 소스 원장(Outbox/Queues), idempotency, 재시도 횟수, DLQ, 운영 긴급정지.
- AI: 기존 생성 프록시 우선, 추후 Mastra/LangGraph 등 상태형 워크플로 PoC 가능. Postiz/Activepieces 등의 코드는 라이선스 확인 전 무단 이식하지 않는다.

### 먼저 점검할 실제 운영 자료

1. 두 제품의 `SUPABASE_URL` 프로젝트 식별자 동일 여부(비밀키는 기록/공유 금지).
2. HubOnTrade OAuth 토큰 저장 위치, 브라우저 직접 Graph 호출 여부, 앱 심사 상태 및 재발급 로직.
3. Supabase RLS 정책: guest, anon 소싱 테이블, 브랜드별 읽기/쓰기, storage buckets, service_role 경로.
4. Vercel cron/edge/실패 처리/배포 브랜치/환경변수/스테이징 분리.
5. SNS v2 기존 `sns_posts`, 과금/크레딧/usage, 광고 CSV 이관 스키마 충돌.
6. EZworks의 SNS 5단계 파이프라인·`sns_brands`·광고 테이블에 대응하는 마이그레이션 범위.
7. Meta/TikTok/YouTube/Douyin/Zalo 앱 인증·권한 심사 상태와 공식 API 가능 범위.

## 8. 마이그레이션 계획 — 무손실·무중단 우선

**G0 코드/데이터 감사** → **G1 보안 차단** → **G2 SNS 스키마 준비** → **G3 읽기 전용 이관·대조** → **G4 소수 고객 파일럿** → **G5 전환 승인·운영 모니터링**.

- 1. EZworks SNS DB 및 HubOnTrade SNS DB의 실제 테이블/필드/기본키/외래키/첨부 파일/승인 이력/감사 로그를 인벤토리로 확정한다.
- 2. `legacy_source_system`, `legacy_table`, `legacy_record_id`, `source_version`, `migration_batch_id`를 모든 이관 객체에 남긴다.
- 3. 100% ID 매핑, 사용자-팀-브랜드 권한 매핑, 중복 캠페인 병합 규칙, 멀티 언어 버전/리비전 보존을 문서화한다.
- 4. 검증된 백업 → 스테이징 read-only backfill → 건수·금액·승인·파일 해시·KPI 수치 대조. 누락 발견 시 쓰기 전환 보류.
- 5. 일정 기간 한쪽은 write-master, 다른 쪽은 이벤트 기반 읽기. 콘텐츠 테이블 동일 필드에 양방향 쓰기 금지.
- 6. 외부 고객 파일럿 전 S1~S8 및 권한 침투 테스트 통과. SNS 게시 API 심사 실패한 플랫폼은 가이드형만 노출.
- 7. 최종 cutover 전에 승인자 확인, 관리자 중단 스위치, 원복 프로세스와 장애 책임자 지정.
- 8. 기존 EZworks 데이터와 메뉴를 바로 삭제하지 않고 '읽기 전용 히스토리 → SNS 바로가기' 전환 후 해제 승인.

## 9. 반드시 해결할 P0 보안 게이트 (내부 비교 문서에 보고된 문제)

| 게이트 | 실패 위험 | 합격 조건 |
|---|---|---|
| S1. 채널 토큰/비밀키 | 브라우저 저장·유출 | 서버 전용 저장, 기존 키 회전, 로그 마스킹 |
| S2. EZworks guest RLS | 외부 고객이 내부 팀 자료 열람 | guest/brand/country 교차 접근 테스트 0건 |
| S3. SNS anon 쓰기 | 미인증 데이터 조작 | anon INSERT/UPDATE 차단, 서버 경유 검증 |
| S4. Meta API | 오래된 Graph 버전·심사 미완 | 프로덕션 버전, 권한별 앱 심사 증빙 |
| S5. TikTok/YouTube | 공개 게시 불가·심사 이슈 | 실제 앱·계정에서 권한/쿼터 검증 |
| S6. Naver 정책 | 지원하지 않는 자동 게시 약속 | 수동 게시 UX·정확한 고지 |
| S7. 다국어 | 중국어 누락·현지화 오류 | ko/en/vi/zh 리소스 및 언어별 QA |
| S8. DB 프로젝트 관계 | 인증·테넌트 혼동 | 동일 프로젝트 여부 확정 및 연결 아키텍처 승인 |

위 S1~S8은 **사용자 제공 비교 문서의 보고 내용**이며 실제 운영 코드 검사 결과가 아니다. 따라서 먼저 운영 저장소와 정책으로 재검증해야 한다.

## 10. 실제 개발 우선순위

| 묶음 | 개발 결과 | 게이트 |
|---|---|---|
| P0 보안·기반 | S1~S8, 제품 구분/정본 ID, 공통 디자인·테넌트 검사 | 외부 고객 온보딩 차단 해제 조건 |
| P1 핵심 운영 | 캠페인·5단계 파이프라인 이관, 승인, 캘린더, 게시 준비, 자산, 언어 | 기존 기능·데이터 대조 100% |
| P2 외부 실행 | Meta/YouTube/TikTok 공식 범위 게시, Zalo OA 응대, 인바운드 인터랙션 | 실제 앱 심사·권한 조건부 |
| P3 제작 | 숏폼 템플릿/클립 생성, 자막·현지화·QC·정산 | 권리·콘텐츠 품질·비용 검증 |
| P4 전문 운영 | KOC·라이브·광고 API 수집, ROI, 고객 포털·리포트 | 국가별 데이터 품질 검수 |
| P5 SaaS 확장 | 셀프 온보딩·워크스페이스·결제·이용량·SSO·API·EZworks 연동 | 고객별 과금/권한 완전 격리 |

**출시의 기준은 단계가 아니라 완성된 운영 흐름이다:** 신규 개인 사용자가 가입→브랜드 개설→채널 연결 권한 확인→콘텐츠 제작→승인→수동 또는 API 게시→인터랙션 처리→성과 확인까지 진행할 수 있어야 한다.

## 11. 필수 테스트·완료 기준

### 브라우저 UI (이번 HTML에서 자동 확인)
- [x] 21개 화면 라우팅 정상 (PC 1280px, 모바일 390px)
- [x] PC 상단/모바일 하단·전체 메뉴 이동
- [x] 캠페인 CRUD(추가/수정) 데모
- [x] 콘텐츠 생성→승인 요청→승인→예약 상태 전이
- [x] 동일 콘텐츠+채널 예약 중복 차단 (브라우저 상태 기준)
- [x] Naver Blog 등 채널을 수동 게시로 강제(데모)
- [x] 9:16 숏폼 콘티·QC·저장
- [x] 월간 캘린더·담당 작업 시각 시연
- [x] 댓글/DM FAQ 초안·담당 변경·완료 상태
- [x] KOC·라이브·광고·자산 등록 시연
- [x] 인터랙션·광고 CSV 시연 데이터(외부 전송 없음)
- [x] 시연 역할별 브랜드 표시 범위·긴급 중단 UI
- [x] 브라우저 에러 없이 화면 이동하는 자동 UI 테스트

### 실제 SaaS 출시 전 추가 테스트 (현재 미구현)
- [ ] tenant A 사용자가 tenant B의 REST/Edge/Storage/검색/CSV 내보내기 데이터를 볼 수 없음
- [ ] 사용자·국가·팀·브랜드·고객 권한 16가지 이상 조합 자동 테스트
- [ ] 채널 토큰 유출 XSS·공격 시나리오/서버 갱신/무효화
- [ ] 공식 플랫폼 앱 심사/권한 실제 게시(플랫폼·채널별)
- [ ] Webhook 재전송·순서 변경·오류·중복·임의 서명 이벤트 방어
- [ ] 동일 게시 동시 클릭 100회에서 외부 게시 1회 보장
- [ ] 실패한 영상 렌더·큐 재시도·크레딧 재청구 없음
- [ ] 저작권·초상권 검토 거절 시 공개 게시 차단
- [ ] 수기·CSV·API 성과 원본/중복·통화·타임존 정합성
- [ ] 개인정보·보존기간·탈퇴·다운로드/삭제·고객 데이터 이전
- [ ] 유료결제 Webhook 중복 호출 시 결제/크레딧 1회 반영
- [ ] 4개 언어 본문/에러/도움말 전체 현지화 QA
- [ ] 390/768/1280/1920 모바일·태블릿·PC, 키보드·스크린리더 접근성
- [ ] 장애/예산초과/정책 차단 시 대기·중단·수동 대체 경로

## 12. 승인해야 할 결정 항목

1. 제품 표기는 **DIVOOST SNS**를 고객 브랜드, `HubOnTrade SNS`를 기존 시스템/프로젝트 이름으로 유지할지.
2. 두 Supabase 프로젝트 동일 여부와 SNS/업무 DB 이관 방식.
3. 국가별 데이터 리전, 고객사 계약·개인정보/미성년자/중국 개인정보 규정 검토.
4. 정식 첫 출시 대상 채널: 권한 검증 가능한 Meta/YouTube 우선, TikTok 심사, 중국/네이버 가이드형.
5. 1차 AI 생성 예산 상한과 모델별 공급자(기존 프록시 활용).
6. 외부 고객용 승인 권한·요금제·크레딧 부여 방식.
7. 실제 코드를 이 HTML 디자인에 맞춰 이식할 때 사용되는 기존 페이지/DB 상세 매핑.

---

**개발팀 전달 원칙:** HTML은 인터랙션·화면 구현의 참고본이며 데이터 권한의 보안 근거가 아니다. 기존 제품과 비교하면서 빠진 기능이 있으면 기능을 삭제하거나 임의 추정하지 말고, 기능ID·기존 URL·기존 테이블·새 위치·검수 케이스를 추적표로 명시한 뒤 개발한다.
