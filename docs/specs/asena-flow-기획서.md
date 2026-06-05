# Asena Flow — 통합 업무·협업 플랫폼 상세 기획서

> 문서 버전: v1.0 (제작 착수 전 통합 기획서)
> 작성일: 2026-06-06
> 선행 문서: SRS v0.1 (요구사항 정의서) — 본 문서는 SRS의 "무엇을"을 "어떻게"로 구체화한다.
> 기반 자산: Asena Trellis (React + Firebase, 글로벌 ~50명 사용)
> 대상 스택: Next.js (App Router) + Supabase (PostgreSQL/Auth/Realtime/Storage)
> 대상 조직: 한국·중국·베트남·싱가포르·말레이시아·필리핀 (6개국 분산)

---

## 0. 이 문서의 위치와 읽는 법

| 단계 | 문서 | 상태 |
|---|---|---|
| 요구사항 (What) | SRS v0.1 | ✅ 완료 |
| **설계 (How) — 본 문서** | **Asena Flow 기획서 v1.0** | ✅ 본 문서 |
| 데이터 DDL 실행본 | `docs/specs/asena-flow-schema.sql` | ⏳ 본 문서 §5 기반 후속 생성 |
| ADR (의사결정 기록) | `docs/adr/ADR-0xx-*.md` | ⏳ §16 미정사항 확정 시 |

**읽는 순서 권장**: §2(시나리오) → §3(화면맵) → §6(권한/보안) → §5(데이터) → §8(화면별 상세) → §14(로드맵)

---

## 1. 용어 정의 (Glossary)

| 용어 | 정의 |
|---|---|
| 워크스페이스(Workspace) | 최상위 격리 단위. 회사/조직 1개 = 워크스페이스 1개. 모든 데이터의 멀티테넌시 경계 |
| 팀(Team) | 워크스페이스 내 부서/조직 단위 (예: 한국팀, 베트남 물류팀) |
| 프로젝트(Project) | 목표를 가진 업무 묶음. 권한·채널·파일·워크플로우의 컨테이너 |
| 업무(Task) | 실행 단위. 담당자·마감일·상태를 가짐 |
| 하위업무(SubTask) | Task의 자식. 무제한 중첩(self-reference) |
| 워크플로우(Workflow) | 커스텀 필드 테이블 (Notion DB 유사). 레코드+필드로 구성 |
| 채널(Channel) | 채팅방 (1:1 / 그룹 / 프로젝트) |
| 액션아이템(Action Item) | 회의록에서 추출된, Task로 승격 가능한 할 일 |
| RBAC | 역할 기반 접근 제어 (Owner/Admin/Member/Guest) |
| RLS | Row Level Security. Postgres 행 단위 접근 정책 |
| flowAI | 플랫폼 데이터 기반 자연어 AI 어시스턴트 (FR-8) |

---

## 2. 제품 비전 & 핵심 시나리오

### 2.1 한 줄 비전
> "출근과 동시에 오늘 할 일이 정리되고, 회의는 자동으로 업무가 되며, AI에게 물어보면 회사 상태를 답하는 — 6개국이 한 화면에서 일하는 플랫폼."

### 2.2 페르소나

| 페르소나 | 역할 | 핵심 니즈 | Pain Point |
|---|---|---|---|
| 마스터(대표) | Owner | 전사 현황 한눈에, AI 질의 | 각국 보고가 흩어짐, 시차 |
| 팀장(한국) | Admin | 프로젝트 설계·배정·진척 관리 | 수동 일정 수립 시간 |
| 멤버(베트남) | Member | 내 업무·마감 명확히 | 언어 장벽, 알림 누락 |
| 협력사(공장) | Guest | 초대된 프로젝트만 안전하게 | 과도한 권한 노출 우려 |

### 2.3 핵심 사용자 시나리오 (User Journey)

**S1. 아침 출근 (마스터)**
1. 로그인 → 대시보드. "좋은 아침입니다, 마스터님 · 6월 6일 (금)" 인사말.
2. 위젯: 오늘 일정 3건, 내 결재 대기 2건, 전사 프로젝트 진행률 87%.
3. flowAI에 "이번 주 마감 임박 업무?" 질의 → 권한 범위 내 12건 응답.

**S2. 프로젝트 시작 (팀장)**
1. 프로젝트 생성 → 목표·유형·기간 입력 → "AI 설계" 클릭.
2. AI가 전략 + 주차별 일정 + 업무 초안 12개 생성 (편집 가능 드래프트).
3. 일부 수정 → "일괄 등록" → 담당자 배정 → 멤버에게 알림 발송.

**S3. 회의 → 업무 (팀)**
1. 회의 시작 → 모바일 녹음. (한국어+영어 혼용)
2. 종료 → STT 전사 → AI 요약(안건/결정/액션 5건).
3. 액션아이템 각각 담당자·마감일 자동 추출 → "업무로 생성" → Task 5개 생성.

**S4. 외부 협력사 협업 (Guest)**
1. 공장 담당자가 초대 메일 수신 → 가입 → 해당 프로젝트만 진입.
2. 다른 프로젝트·전사 데이터·멤버 목록 일절 비노출 (RLS 격리).
3. 본인 배정 업무 코멘트·파일만 접근.

---

## 3. 정보 구조(IA) & 화면 맵

### 3.1 네비게이션 구조

```
[전역]
 ├─ 워크스페이스 스위처 (상단)
 ├─ 사이드바 (좌)
 │   ├─ 🏠 대시보드(홈)
 │   ├─ 📁 프로젝트            → 목록 → 상세(보드/리스트/간트/캘린더)
 │   │     └─ 업무 상세 (드로어/패널)
 │   ├─ 💬 메신저
 │   ├─ 🎙 AI 회의록
 │   ├─ 🗂 워크플로우(DB)
 │   ├─ 📅 캘린더
 │   ├─ ✍️ 전자결재
 │   ├─ 📎 파일
 │   └─ ⚙️ 설정 (멤버/권한/언어/연동)
 ├─ flowAI 패널 (우측 슬라이드, 전역 호출)
 ├─ 🔔 알림 센터 (상단 우)
 └─ 퀵 런처 (Cmd/Ctrl+K)
```

### 3.2 화면 맵 (Screen List → Route)

| # | 화면 | Route | 주요 권한 | Phase |
|---|---|---|---|---|
| 1 | 로그인/워크스페이스 선택 | `/login`, `/select-workspace` | 전체 | 1 |
| 2 | 대시보드(홈) | `/` | 전체 | 1 |
| 3 | 프로젝트 목록 | `/projects` | M+ | 1 |
| 4 | 프로젝트 생성(AI 설계) | `/projects/new` | Admin+ | 2 |
| 5 | 업무 보드/리스트/간트/캘린더 | `/projects/[id]?view=` | 참여자 | 1(보드/리스트), 3(간트/캘린더) |
| 6 | 업무 상세 | `/projects/[id]/tasks/[taskId]` (드로어) | 참여자 | 1 |
| 7 | 메신저 | `/messages/[channelId]` | 참여자 | 2 |
| 8 | AI 회의록 | `/meetings`, `/meetings/[id]` | M+ | 2 |
| 9 | 워크플로우 테이블 | `/workflows/[id]` | 참여자 | 3 |
| 10 | AI 어시스턴트 패널 | 전역 오버레이 | 전체 | 2 |
| 11 | 캘린더/결재/파일 | `/calendar`, `/approvals`, `/files` | 역할별 | 1(파일)~3(결재) |
| 12 | 설정 | `/settings/*` | 역할별 | 1 |

*권한 표기: Owner > Admin > Member(M) > Guest. "M+"=Member 이상, "Admin+"=Admin 이상*

---

## 4. 시스템 아키텍처

### 4.1 구성도

```
┌───────────────────────────── Client (Browser / PWA) ─────────────────────────────┐
│  Next.js App Router (React)  ·  i18n(next-intl)  ·  TanStack Query  ·  Zustand     │
│  Supabase JS Client (Auth/Realtime/Storage)                                       │
└───────────────┬───────────────────────────────────────────────┬──────────────────┘
                │ HTTPS (TLS1.2+)                                 │ WSS (Realtime)
                ▼                                                 ▼
┌─────────────────────────────────── Supabase ─────────────────────────────────────┐
│  Auth (JWT)                                                                        │
│  PostgreSQL + RLS  ──  Realtime (변경 스트림: tasks/messages/notifications)         │
│  Storage (버킷: project-files, meeting-audio, avatars)                             │
│  Edge Functions (Deno/TS) ── 회사 마스터 키 보관 / 외부 API 프록시                  │
│        ├─ ai-project-design   (FR-2.2)                                             │
│        ├─ ai-assistant-query  (FR-8, RAG)                                          │
│        ├─ ai-meeting-stt      (FR-6, STT+요약)                                     │
│        ├─ notify-dispatch     (FR-11, 푸시/메일)                                   │
│        └─ webhook-gateway     (FR-10.3, n8n/Open API)                              │
└───────────────┬───────────────────────────────────────────────┬──────────────────┘
                │                                                 │
                ▼ (서버 측에서만 키 사용)                          ▼
   ┌───────────────────────────┐                    ┌───────────────────────────┐
   │ LLM: Claude / OpenAI       │                    │ STT: Whisper / 상용 STT    │
   │ Google Calendar / Drive    │                    │ Resend (메일) / FCM (푸시) │
   └───────────────────────────┘                    └───────────────────────────┘
```

### 4.2 기술 스택 결정 (보안 트레이드오프 포함)

> CLAUDE.md I2: 모든 외부 서비스 도입은 보안 컬럼을 포함하여 비교한다.

| 영역 | 선택 | 대안 | 보안/리스크 | 결정 근거 |
|---|---|---|---|---|
| FE 프레임워크 | Next.js App Router | Vite SPA | 동등 (SSR 시 토큰 취급 주의) | Trellis React 자산 재활용 + SEO/SSR |
| BE/DB | Supabase | Firebase(현 자산) | 중. RLS 강제 안 하면 노출 위험 → **RLS 필수** | Postgres RLS·Realtime·Storage 일괄, 멀티마켓 SQL 친화 |
| 상태관리 | TanStack Query + Zustand | Redux | 낮음 | 서버상태/클라상태 분리 |
| i18n | next-intl | i18next | 낮음 | App Router 호환 우수 |
| 실시간 | Supabase Realtime | Pusher/Ably | 중(채널 인가 필요) | BE 일원화 |
| AI | Claude/OpenAI (Edge 프록시) | 클라 직접 호출 | **높음**: 클라 직접=키 노출 → **반드시 Edge Function 프록시** | 회사 마스터 키 서버 격리 |
| STT | Whisper API / 상용 | 온프레미스 | 중: 음성에 기밀 가능 → 처리 후 원본 보존정책 필요(§6.6) | 다국어 정확도 |
| 배포 | Vercel(FE) + Supabase(BE) | 자체 호스팅 | 낮음 (관리형) | 운영 부담↓ |

### 4.3 디렉토리 구조 (제안)

```
asena-flow/                         # (신규 리포 또는 모노레포 패키지)
├── app/                            # Next.js App Router
│   ├── (auth)/login/
│   ├── (app)/                      # 인증 가드 레이아웃
│   │   ├── page.tsx                # 대시보드
│   │   ├── projects/
│   │   ├── messages/
│   │   ├── meetings/
│   │   ├── workflows/
│   │   ├── calendar/ approvals/ files/
│   │   └── settings/
│   └── api/                        # (얇게) Route Handlers — 대부분 Edge Function 호출
├── components/                     # UI 컴포넌트 (디자인 시스템 §8.0)
│   ├── ui/                         # 원자 컴포넌트 (Button, Badge, ...)
│   ├── task/ project/ chat/ ...    # 도메인 컴포넌트
├── lib/
│   ├── supabase/                   # 클라이언트/서버 클라이언트
│   ├── i18n/                       # 메시지 카탈로그 (ko/en/zh/vi)
│   ├── tz/                         # 타임존 유틸
│   └── api/                        # 데이터 액세스 레이어 (쿼리 함수 + 테스트)
├── supabase/
│   ├── migrations/                 # SQL 마이그레이션 (스키마 + RLS)
│   └── functions/                  # Edge Functions (위 4.1)
├── messages/                       # i18n json (ko.json, en.json, zh.json, vi.json)
└── tests/                          # 통합/E2E
```

---

## 5. 데이터 모델 상세

### 5.1 ERD (논리 모델)

```
workspaces ─1:N─ teams ─1:N─ team_members ─N:1─ users
workspaces ─1:N─ workspace_members ─N:1─ users   (역할 부여 지점)
workspaces ─1:N─ projects ─1:N─ project_members ─N:1─ users
projects   ─1:N─ tasks (self ref: parent_task_id → 하위업무)
tasks      ─1:N─ comments, task_assignees(N:M), attachments
projects   ─1:N─ channels ─1:N─ messages
projects   ─1:N─ workflows ─1:N─ records ; workflows ─1:N─ fields
records    ─(jsonb)─ field 값 저장
projects   ─1:N─ files
workspaces ─1:N─ events (calendar)
meetings   ─1:1─ transcripts ─1:N─ action_items ─0:1─ tasks (승격)
users      ─1:N─ notifications
projects   ─1:N─ approvals ─1:N─ approval_steps
```

### 5.2 핵심 테이블 DDL (요지)

> 전체 실행본은 후속 `asena-flow-schema.sql`로 분리. 아래는 설계 확정용 스켈레톤.
> 공통 규칙: PK `uuid default gen_random_uuid()`, `created_at/updated_at timestamptz`, 컬럼 `snake_case`, 모든 테넌트 테이블에 `workspace_id`(RLS 키).

```sql
-- 5.2.1 테넌시 & 사용자
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id),
  default_locale text not null default 'ko',     -- ko/en/zh/vi
  default_timezone text not null default 'Asia/Seoul',
  created_at timestamptz not null default now()
);

create table users (                              -- auth.users 미러 프로필
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  avatar_url text,
  locale text,                                    -- 사용자별 언어 (없으면 ws 기본)
  timezone text,                                  -- 사용자별 타임존
  phone text,
  org_title text,                                 -- 소속/직함 (검색용 FR-3.5)
  created_at timestamptz not null default now()
);

create type workspace_role as enum ('owner','admin','member','guest');

create table workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role workspace_role not null default 'member',
  invited_by uuid references users(id),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create table team_members (
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  primary key (team_id, user_id)
);

-- 5.2.2 프로젝트 & 업무
create table projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  goal text,
  start_date date,
  end_date date,
  status text not null default 'active',          -- active/archived
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);
create type project_role as enum ('lead','member','guest');
create table project_members (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role project_role not null default 'member',    -- 프로젝트 단위 오버라이드
  primary key (project_id, user_id)
);

-- 상태 라벨은 커스텀 가능 → 테이블화 (FR-3.2)
create table task_statuses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  key text not null,                              -- requested/in_progress/feedback/done
  label text not null,                            -- 표시명(다국어는 i18n 키 or 원문)
  color text not null default '#888',
  sort_order int not null default 0
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  parent_task_id uuid references tasks(id) on delete cascade,  -- 하위업무(무제한 중첩)
  title text not null,
  description text,
  status_id uuid references task_statuses(id),
  priority smallint not null default 2,           -- 0 낮음 ~ 3 긴급 (상수 §17)
  start_date timestamptz,
  due_date timestamptz,                           -- UTC 저장, 표시 시 사용자 TZ 변환
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table task_assignees (                     -- 담당자 N:M
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  primary key (task_id, user_id)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_id uuid not null references users(id),
  body text not null,                             -- 멘션 @uuid 토큰 포함, 렌더 시 escape
  created_at timestamptz not null default now()
);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id),
  task_id uuid references tasks(id) on delete cascade,
  storage_path text not null,                     -- Storage 경로
  file_name text not null, mime text, size_bytes bigint,
  uploaded_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- 5.2.3 메신저
create type channel_type as enum ('dm','group','project');
create table channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  type channel_type not null,
  project_id uuid references projects(id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);
create table channel_members (
  channel_id uuid not null references channels(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  last_read_at timestamptz,                        -- 읽음 표시
  primary key (channel_id, user_id)
);
create table messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references channels(id) on delete cascade,
  author_id uuid not null references users(id),
  body text,
  attachment_path text,                            -- 파일/이미지/음성
  linked_task_id uuid references tasks(id),         -- 채팅→업무 링크(FR-5.2)
  created_at timestamptz not null default now()
);

-- 5.2.4 워크플로우 (커스텀 DB)
create type field_type as enum
  ('text','number','date','select','checkbox','person','money','status');
create table workflows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create table fields (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows(id) on delete cascade,
  key text not null, label text not null,
  type field_type not null,
  options jsonb,                                    -- select 보기/색상 등
  sort_order int not null default 0
);
create table records (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows(id) on delete cascade,
  values jsonb not null default '{}',              -- {field_key: value} (검증은 앱+제약)
  created_at timestamptz not null default now()
);

-- 5.2.5 회의록
create table meetings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid references projects(id),
  title text, audio_path text,
  locale text,                                     -- STT 언어 힌트
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create table transcripts (
  meeting_id uuid primary key references meetings(id) on delete cascade,
  full_text text, summary jsonb                    -- {agenda[],decisions[],action_items[]}
);
create table action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  text text not null,
  suggested_assignee uuid references users(id),
  suggested_due timestamptz,
  promoted_task_id uuid references tasks(id)       -- 업무 승격 시 연결
);

-- 5.2.6 캘린더 / 결재 / 알림
create table events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid references projects(id),
  owner_id uuid references users(id),
  title text not null, starts_at timestamptz not null, ends_at timestamptz,
  scope text not null default 'personal',          -- personal/project/team
  external_ref text                                -- Google Calendar 연동 ID
);

create type approval_status as enum ('draft','pending','approved','rejected');
create table approvals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null, form jsonb,
  status approval_status not null default 'draft',
  drafter_id uuid not null references users(id),
  created_at timestamptz not null default now()
);
create table approval_steps (
  id uuid primary key default gen_random_uuid(),
  approval_id uuid not null references approvals(id) on delete cascade,
  approver_id uuid not null references users(id),
  step_order int not null,
  decision approval_status,                          -- approved/rejected/null(대기)
  decided_at timestamptz
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id),
  type text not null,                               -- mention/assigned/due_soon/approval (§17)
  payload jsonb not null,                           -- {task_id, actor, ...}
  read_at timestamptz,
  created_at timestamptz not null default now()
);
```

### 5.3 인덱스 전략 (성능, NFR 1초/2초)

| 테이블 | 인덱스 | 이유 |
|---|---|---|
| tasks | `(project_id, status_id)`, `(workspace_id, due_date)` | 보드/필터, "마감 임박" 질의 |
| tasks | `(parent_task_id)` | 하위업무 트리 조회 |
| messages | `(channel_id, created_at desc)` | 채팅 페이지네이션 |
| notifications | `(user_id, read_at, created_at desc)` | 알림 센터 |
| task_assignees | `(user_id)` | "내 업무" 조회 |
| records | `gin(values)` | jsonb 필드 검색 |

---

## 6. 권한 & 보안 설계 ⚠️ (보안 우선)

> CLAUDE.md 최우선 원칙 2·3 및 I1~I7 준수. Supabase는 RLS 미적용 시 전체 노출 위험(과거 다수 사고 사례) → **모든 테넌트 테이블 RLS 필수, default deny.**

### 6.1 RBAC 권한 매트릭스

| 기능 | Owner | Admin | Member | Guest |
|---|---|---|---|---|
| 워크스페이스 설정/결제 | ✅ | ❌ | ❌ | ❌ |
| 멤버 초대/역할 변경 | ✅ | ✅(member/guest) | ❌ | ❌ |
| 프로젝트 생성 | ✅ | ✅ | ❌ | ❌ |
| 프로젝트 참여(배정) | ✅ | ✅ | ✅ | 초대된 것만 |
| 업무 생성/수정 | ✅ | ✅ | ✅(참여 프로젝트) | 배정된 것만 |
| 워크플로우 생성 | ✅ | ✅ | ✅(참여) | ❌ |
| 전사 통계/AI 전사 질의 | ✅ | ✅(팀 범위) | 본인 범위 | ❌ |
| 멤버 목록 열람 | ✅ | ✅ | ✅ | ❌ (격리) |
| 파일 다운로드 | ✅ | ✅ | 참여 프로젝트 | 배정 업무 첨부만 |

### 6.2 권한 상속/오버라이드 (SRS §2)
- 기본: `workspace_members.role` → 프로젝트에 `project_members.role`로 오버라이드.
- 예: 워크스페이스 Member여도 특정 프로젝트에서 `lead` 가능.
- Guest는 워크스페이스 레벨 권한 없음 → **오직 `project_members`에 행이 있는 프로젝트만** 접근.

### 6.3 RLS 정책 패턴 (핵심)

```sql
-- 헬퍼: 현재 유저가 워크스페이스 멤버인가 + 역할
create or replace function is_ws_member(ws uuid) returns boolean
language sql security definer stable as $$
  select exists(select 1 from workspace_members
                where workspace_id = ws and user_id = auth.uid());
$$;

-- 헬퍼: 프로젝트 접근 가능 (멤버 or 게스트 초대)
create or replace function can_access_project(p uuid) returns boolean
language sql security definer stable as $$
  select exists(select 1 from project_members
                where project_id = p and user_id = auth.uid());
$$;

alter table tasks enable row level security;

-- SELECT: 참여 프로젝트의 업무만 (Guest는 자동 격리: project_members에 없으면 0행)
create policy task_select on tasks for select
  using ( can_access_project(project_id) );

-- INSERT/UPDATE: 참여자 + Guest는 배정된 업무만 수정
create policy task_write on tasks for update
  using ( can_access_project(project_id)
          and ( is_ws_member(workspace_id)                 -- 내부 멤버
                or exists(select 1 from task_assignees
                          where task_id = tasks.id and user_id = auth.uid()) )
        );
```

> 모든 테넌트 테이블에 `enable row level security` + `default deny`(정책 없으면 차단) 적용. Guest 격리는 "정책에서 workspace 헬퍼 대신 project 헬퍼만 사용"으로 달성.

### 6.4 인증 흐름
1. Supabase Auth (이메일/패스워드 + 추후 OAuth). JWT에 `sub=user_id`.
2. 클라는 **publishable(anon) key만** 보유. RLS가 실제 방어선.
3. 회사 마스터 키(LLM/STT/메일)는 **Edge Function 환경변수에만** 저장 — 클라/HTML 노출 금지.

### 6.5 데이터 흐름 보안 (I5 — 입력/외부 데이터)

| 데이터 | 경로 | 암호화 | 저장/보존 |
|---|---|---|---|
| 사용자 입력(업무/코멘트) | Client→TLS→Postgres | 전송 TLS, 저장 at-rest(Supabase) | escapeHtml 렌더, RLS |
| 채팅/파일 | Client→TLS→Storage | TLS + at-rest | 버킷 RLS, 서명 URL 만료 |
| 회의 음성 | Client→Edge→STT | TLS | **원본 보존정책 명시 필요(§6.6)** |
| AI 질의(flowAI) | Client→Edge→LLM | TLS | 프롬프트에 민감데이터 최소화, 로그 마스킹 |
| 외부 연동 토큰 | OAuth | TLS | 토큰 암호화 저장 + 만료 갱신 |

### 6.6 보안 미정사항 (마스터 결정 필요 — 위험도 표기, I6)

| 항목 | 옵션 | 보안 위험 | 권장 |
|---|---|---|---|
| 회의 음성 원본 보존 | (A)전사 후 즉시 삭제 (B)N일 보관 | A=낮음, B=중(유출 시 음성 노출) | **A(전사 후 삭제)** 권장, 필요 시 B+암호화 |
| AI에 보낼 데이터 범위 | (A)요약/메타만 (B)원문 포함 | A=낮음, B=높음(LLM 제공사 전송) | A 기본, B는 명시 동의 |
| LLM 제공사 데이터 학습 | 옵트아웃 계약 | 미설정 시 중 | **학습 옵트아웃 필수**(Claude/OpenAI Enterprise) |
| Guest 셀프 가입 | 초대 토큰만 | 공개 가입=높음 | **초대 토큰 only** |

### 6.7 보안 사고 패턴 사전 경고 (I7)
- Supabase RLS 미설정으로 anon key만으로 전 테이블 덤프된 사례 다수 → **RLS 테스트를 CI 게이트로.**
- LLM 프롬프트에 PII/키 포함 후 로그 유출 사례 → **프롬프트 마스킹 + 키는 Edge env.**
- Storage 버킷 public 오설정 → **버킷 private + 서명 URL(만료) 기본.**

---

## 7. API & 통신 설계

### 7.1 데이터 접근 원칙
- **CRUD 대부분은 Supabase 클라이언트 + RLS**로 직접 (별도 API 서버 최소화).
- **민감/복합 로직(AI, 결제, 외부키)**은 Edge Function 경유.
- 클라 데이터 액세스는 `lib/api/*` 함수로 캡슐화 (테스트 용이, TDD).

### 7.2 Edge Functions (계약)

| 함수 | 입력 | 출력 | 보안 |
|---|---|---|---|
| `ai-project-design` | `{goal, type, start, end, locale}` | `{strategy, weeks[], tasks[]}` (드래프트) | 인증 필수, ws 멤버 검증, 회사 키 |
| `ai-assistant-query` | `{question, workspace_id, locale}` | `{answer, sources[]}` | RAG는 **RLS 범위 내 데이터만** 검색 |
| `ai-meeting-stt` | `{audio_path, locale}` | `{transcript, summary, action_items[]}` | 음성 보존정책(§6.6) |
| `notify-dispatch` | `{user_ids, type, payload}` | `{queued}` | 내부 호출(서비스 롤) |
| `webhook-gateway` | 외부 payload | 처리 결과 | 서명 검증(HMAC), allowlist |

### 7.3 Realtime 채널

| 채널 | 구독 대상 | 인가 |
|---|---|---|
| `tasks:project_id=eq.{id}` | 보드/리스트 실시간 갱신 | RLS + 참여자 |
| `messages:channel_id=eq.{id}` | 채팅 | channel_members |
| `notifications:user_id=eq.{me}` | 알림 배지 | 본인만 |

### 7.4 표준 응답/에러 규약
- 에러는 삼키지 않음(CLAUDE.md 원칙 4). Edge Function은 `{error:{code,message_ko,message_en}}` 반환, 클라는 사용자 언어로 표시 + `console.error` 로깅.

---

## 8. 화면별 상세 기획

### 8.0 디자인 시스템 (공통)
- **레이아웃**: 좌측 사이드바(접이식) + 상단 바(워크스페이스/검색/알림/프로필) + 콘텐츠.
- **반응형**: ≥1024 데스크탑 3칼럼 / 768~ 태블릿 2칼럼 / <768 모바일 1칼럼 + 하단 탭바.
- **터치**: 버튼 최소 44px (CLAUDE.md 모바일 규칙).
- **상태 색**: 요청=회색, 진행=파랑, 피드백=주황, 완료=초록 (커스텀 가능).
- **공통 컴포넌트**: `Button, Badge(StatusBadge), Avatar, UserPicker, DatePicker(TZ인지), Drawer, Modal, Toast, EmptyState, Skeleton`.
- **빈/로딩/에러 3상태**: 모든 데이터 화면은 Skeleton/Empty/Error 필수(CLAUDE.md B2).

### 8.1 대시보드 (FR-1)
```
┌──────────────────────────────────────────────┐
│ 좋은 아침입니다, 마스터님 · 6월 6일 (금)        │  ← FR-1.1
│ [퀵런처: AI 회의록 OKR 결재 메일 외부앱]        │  ← FR-1.5
├───────────────┬──────────────┬─────────────────┤
│ 오늘/이번주    │ 내 업무 현황  │ 프로젝트 진행률  │
│ 미니캘린더+리스트│ 도넛(요청/진행│ 막대(프로젝트별) │
│ (FR-1.3)      │ /피드백/완료) │ (FR-1.7)        │
│               │ (FR-1.4)     │                 │
├───────────────┼──────────────┴─────────────────┤
│ 채팅 바로보기  │ (드래그로 위젯 재배치 FR-1.2)    │
└───────────────┴────────────────────────────────┘
```
- 위젯 배치는 `user_dashboard_layout`(jsonb)로 저장. 드래그=react-grid-layout 또는 자체 구현(라이브러리 사전 보고, CLAUDE.md B7).
- 데이터: 각 위젯 독립 쿼리(TanStack Query), Skeleton 개별.
- 엣지케이스: 신규 유저(업무 0) → EmptyState + "첫 프로젝트 만들기" CTA.

### 8.2 프로젝트 목록 / 생성 (FR-2)
- 목록: 카드/리스트 토글, 진행률·멤버 아바타·마감.
- 생성(AI): ① 기본정보 입력 → ② "AI 설계" → ③ 드래프트 검토(주차별 일정·업무 체크박스 편집) → ④ 일괄 등록.
- **AI 드래프트는 등록 전까지 DB 미저장**(임시 상태) → 사용자가 확정해야 commit. (오생성 방지)
- 엣지: AI 실패 시 수동 생성 폴백 + 에러 토스트(삼키지 않음).

### 8.3 업무 뷰: 보드/리스트/간트/캘린더 (FR-4)
- **리스트**: 컬럼(상태/담당/시작/마감/우선순위), 인라인 편집, 필터·그룹·정렬·컬럼숨김.
- **보드(칸반)**: 상태별 컬럼, 드래그로 status_id 변경 → Realtime 반영 + 알림.
- **간트**(Phase3): 기간 막대, 의존성(후속).
- **캘린더**(Phase3): 마감일 기준 배치, TZ 변환 표시.
- 공통 필터 바(저장 가능한 뷰 프리셋).
- 성능: 가상 스크롤(대량 업무), 페이지네이션.

### 8.4 업무 상세 (FR-3.7)
- 우측 드로어. 제목/설명/담당(UserPicker)/일정/우선순위/상태 + 탭(코멘트/하위업무/첨부).
- 하위업무: 트리(무제한), 진행률 자동 집계(자식 완료 비율).
- 코멘트: 멘션(@) 자동완성 → notifications insert. 입력은 escape 렌더(XSS 방지).
- 첨부: Storage 업로드, 서명 URL.

### 8.5 메신저 (FR-5)
- 좌 채널 리스트(DM/그룹/프로젝트) + 우 대화. Realtime.
- 메시지 우클릭 → "업무로 전환"(linked_task_id) / 채팅에서 업무 카드 미리보기.
- 읽음: `channel_members.last_read_at` 갱신. 검색.
- 파일/이미지/음성 전송.

### 8.6 AI 회의록 (FR-6)
```
녹음 → 업로드 → [STT 전사] → [AI 요약: 안건/결정/액션] → 액션아이템 카드
                                                  └ [업무로 생성] → Task
```
- 모바일 녹음 중 백그라운드 업로드. 진행 상태(전사 중/요약 중) 표시.
- 다국어 STT(locale 힌트). 화자 분리는 Phase 후순위.
- 액션아이템: 담당자/마감 추출값 편집 후 일괄 Task 생성.

### 8.7 워크플로우 테이블 (FR-7)
- 필드 정의(타입별) → 레코드 행 추가/편집(인라인). 상태 뱃지.
- 뷰 전환(테이블/보드/캘린더). 자동화 규칙(조건→액션) Phase3.
- 템플릿: 예약관리/거래처/CS (fields+sample 프리셋).

### 8.8 flowAI 어시스턴트 패널 (FR-8)
- 전역 우측 슬라이드. 자연어 질의 → `ai-assistant-query`(RAG, RLS 범위).
- 응답에 **출처(업무/프로젝트 링크)** 표기 → 신뢰성.
- 옵션: 웹검색/이미지생성(권한·비용 게이트). 초안 작성 보조.
- **권한 경계**: AI는 호출 유저가 RLS로 볼 수 있는 데이터만 검색(서버에서 강제).

### 8.9 캘린더 / 결재 / 파일 (FR-9)
- 캘린더: 개인/프로젝트/팀 토글, TZ 인지(§10), Google Calendar 양방향(Phase3).
- 결재: 기안→결재선(approval_steps 순차)→승인/반려, 양식(form jsonb), 알림 연동.
- 파일: 프로젝트별 트리 + 버전(동일 path 신규 레코드 + version).

### 8.10 설정 (FR-2/10/11)
- 멤버/권한(역할 변경, 초대), 언어(개인 locale), 타임존, 연동(Google/LLM/웹훅), 알림 채널.

---

## 9. AI 기능 상세 설계

### 9.1 AI 프로젝트 설계 (FR-2.2)
- 입력 정규화 → 프롬프트 템플릿(목표/유형/기간/조직 언어) → 구조화 출력(JSON: weeks[], tasks[]).
- 출력 스키마 검증(zod 등) → 실패 시 재시도 1회 → 폴백 수동.
- 드래프트만 반환(미저장).

### 9.2 AI 회의록 (FR-6)
- STT(다국어) → 요약 프롬프트(안건/결정/액션 + 담당/마감 추출).
- 담당자 매칭: 전사 텍스트의 이름 → 워크스페이스 멤버 fuzzy 매칭(검증 후 사용자 확정).

### 9.3 flowAI 어시스턴트 RAG (FR-8)
```
질문 → 의도분류 → (RLS 범위) 데이터 검색(tasks/projects/events 등)
     → 컨텍스트 구성(요약/메타 우선, §6.6 A) → LLM → 출처 포함 응답
```
- 검색은 **service role 아님**, 호출 유저 JWT로 RLS 적용 → 권한 누수 차단.

### 9.4 AI 비용/마진 (회사 키 사용)
- 모든 AI 호출 `ai_usage_logs`(모델/토큰/원가/유저) 기록 → 향후 과금/대시보드.
- 원가 × 마진 정책은 기존 billing 자산 재활용(추후 연동).

---

## 10. 다국어(i18n) & 타임존 설계 (차별 포인트)

### 10.1 i18n
- UI 문자열: `messages/{ko,en,zh,vi}.json` + next-intl. 키 네이밍 `domain.screen.label`.
- 콘텐츠(업무/코멘트): **번역 안 함**(원문 저장) — 단, AI 번역 보조는 옵션.
- 사용자 언어: `users.locale` 없으면 `workspaces.default_locale`.
- 날짜/숫자/통화: `Intl` API(표준, 라이브러리 불필요).

### 10.2 타임존 (TZ 인지)
- **저장은 항상 UTC(timestamptz)**, 표시 시 `users.timezone`으로 변환.
- 마감 임박/알림 계산은 UTC 기준, 표시 라벨만 변환.
- 캘린더/일정: 사용자 TZ 표기 + "상대 TZ"(예: 베트남 14:00 = 한국 16:00) 보조 표기.
- 6개국: Asia/Seoul, Asia/Shanghai, Asia/Ho_Chi_Minh, Asia/Singapore, Asia/Kuala_Lumpur, Asia/Manila.

---

## 11. 알림 시스템 (FR-11)
- 인앱: `notifications` + Realtime 배지 → 알림 센터.
- 푸시/메일: `notify-dispatch`(FCM/Resend). 채널·빈도 개인 설정(`notification_prefs`).
- 트리거: 멘션/배정/마감임박(스케줄)/결재. 마감임박은 Edge Cron(매시) UTC 계산.
- 중복 방지: idempotency key(type+entity+user).

---

## 12. 실시간 협업 설계
- 업무 상태·코멘트·채팅·알림 = Realtime 구독.
- 동시 편집 충돌: `updated_at` 기반 낙관적 잠금(stale 시 재조회 안내).
- 지연 목표 1초(NFR) → payload 최소화, 컬럼 변경 단위 구독.

---

## 13. 비기능 요구사항 구체화 (NFR)

| 구분 | 목표 | 구현 방안 |
|---|---|---|
| 성능 | 화면 2초, 실시간 1초 | 인덱스(§5.3), 가상스크롤, 쿼리캐시, 코드스플리팅 |
| 다국어 | 4개 언어 | §10.1 |
| 타임존 | 사용자별 변환 | §10.2, UTC 저장 |
| 보안 | RBAC/격리/암호화 | §6 (RLS, Edge 키격리, 서명URL) |
| 가용성 | 99.5%, 자동백업 | Supabase 일일 백업 + PITR 검토 |
| 반응형 | 웹+모바일 | §8.0, PWA(미정 §16) |
| 확장성 | 멀티 WS, 수백명 | workspace_id 파티션 키, 인덱스 |

---

## 14. 개발 로드맵 (Phase별 태스크 분해)

> 한 커밋=한 의도, 단계별 TDD(CLAUDE.md). 각 Phase는 머지 가능한 단위로.

### Phase 1 — MVP (핵심 협업)
1. 인프라: Next.js+Supabase 셋업, Auth, i18n 골격, 디자인 시스템 원자 컴포넌트.
2. 스키마+RLS: workspaces/members/teams/projects/tasks/statuses/assignees/comments/attachments + **RLS 테스트(CI 게이트)**.
3. 화면: 로그인/WS선택, 대시보드(FR-1.1~1.4), 프로젝트 목록, 업무 리스트+보드(FR-4.1/4.2/4.5), 업무 상세(FR-3.1~3.7), 참여자 초대(FR-3.5/3.6).
4. 알림 인앱(FR-11.1), RBAC 적용, 파일(FR-9.3).
- **DoD**: RLS 테스트 통과, 보드 Realtime, 모바일 반응형, 핵심 화면 2초 이내.

### Phase 2 — AI 차별화
- AI 프로젝트 설계(FR-2.2), flowAI(FR-8), AI 회의록(FR-6), 메신저(FR-5), 퀵런처(FR-1.5).
- Edge Functions(ai-*) + ai_usage_logs.

### Phase 3 — 확장
- 워크플로우 DB(FR-7), 간트/캘린더(FR-4.3/4.4, FR-9.1), 전자결재(FR-9.2), 외부연동(FR-10), 주간보고(FR-12), OKR(FR-2.4).

### Phase 4 — 글로벌화
- 다국어 완성(zh/vi 카탈로그), 타임존 고도화, 외부 협력사 협업 강화, 커머스 연동(FR-10.4).

---

## 15. 테스트 전략 (TDD — CLAUDE.md 의무)
- 단위: `lib/api/*` 쿼리 함수, TZ/i18n 유틸 → Red→Green→Refactor.
- 비동기 hook: loading/success/**error** 3분기 필수(규칙9).
- **RLS 보안 테스트**: 각 역할(Owner/Admin/Member/Guest)로 접근 시도 → 허용/차단 검증. CI 게이트.
- 통합: MSW로 Edge Function 모킹. E2E: 핵심 시나리오 S1~S4(Playwright).
- 커버리지 80/70 목표.

---

## 16. 미정 사항 / 의사결정 필요 (ADR 후보)

| # | 항목 | 옵션 | 영향 | 권장/메모 |
|---|---|---|---|---|
| D1 | 리포 구조 | 신규 리포 vs divoost 모노레포 | 빌드/배포 | 신규 리포 권장(스택 상이) |
| D2 | 모바일 | PWA vs 네이티브 | 비용/기능 | **PWA 먼저**, 네이티브 후순위 |
| D3 | Trellis 마이그레이션 범위 | 전체 vs 신규시작+선택이관 | 데이터 | 신규시작 + 핵심 데이터 이관 |
| D4 | Guest 과금/시트 정책 | 무료 vs 시트 차감 | 비용 | 정책 확정 필요(영업) |
| D5 | 회의 음성 보존 | 즉시삭제 vs 보관 | 보안(§6.6) | **즉시삭제** 권장 |
| D6 | AI 데이터 범위 | 요약만 vs 원문 | 보안(§6.6) | **요약/메타 우선** |
| D7 | LLM 제공사 | Claude vs OpenAI vs 병행 | 비용/품질 | 병행 추상화(어댑터) |
| D8 | 커머스 연동 우선순위 | IOR 통합 여부 | 범위 | Phase4, 별도 검토 |

> D1~D8 확정 시 각각 `docs/adr/ADR-0xx-*.md` 작성(CLAUDE.md E1).

---

## 17. 부록 — 상수 / 코드값 (매직넘버 금지, CLAUDE.md 규칙3)

```ts
// 우선순위
export const TASK_PRIORITY = { LOW:0, NORMAL:1, HIGH:2, URGENT:3 } as const;
// 기본 상태 키 (프로젝트 생성 시 시드)
export const DEFAULT_STATUS = ['requested','in_progress','feedback','done'] as const;
// 알림 타입
export const NOTIF_TYPE = ['mention','assigned','due_soon','approval','comment'] as const;
// 역할
export const WS_ROLE = ['owner','admin','member','guest'] as const;
// 지원 로케일 / 타임존
export const LOCALES = ['ko','en','zh','vi'] as const;
export const TZ_PRESETS = ['Asia/Seoul','Asia/Shanghai','Asia/Ho_Chi_Minh',
  'Asia/Singapore','Asia/Kuala_Lumpur','Asia/Manila'] as const;
```

---

## 18. SRS ↔ 기획서 추적 매트릭스 (요지)

| SRS FR | 기획서 반영 위치 |
|---|---|
| FR-1 대시보드 | §8.1, §3.1 |
| FR-2 AI 기획 | §8.2, §9.1 |
| FR-3 업무관리 | §5.2.2, §8.4 |
| FR-4 업무 뷰 | §8.3 |
| FR-5 메신저 | §5.2.3, §8.5, §7.3 |
| FR-6 AI 회의록 | §5.2.5, §8.6, §9.2 |
| FR-7 워크플로우 | §5.2.4, §8.7 |
| FR-8 flowAI | §8.8, §9.3, §7.2 |
| FR-9 캘린더/결재/파일 | §5.2.6, §8.9 |
| FR-10 외부연동 | §7.2, §8.10 |
| FR-11 알림 | §5.2.6, §11 |
| FR-12 인사이트 | §14 Phase3 |
| NFR 전체 | §13, §10, §6 |

---

**다음 액션 (마스터님 결정 필요)**
1. §16 D1~D8 의사결정 → ADR 작성 트리거
2. §6.6 보안 옵션(음성 보존·AI 데이터 범위·LLM 학습 옵트아웃) 승인
3. 승인 시 후속: `asena-flow-schema.sql`(전체 DDL+RLS) + 디자인 시스템 컴포넌트 착수

**문서 상태**: 제작 착수 가능 수준. 단, D1~D8 미확정 항목은 착수 전 결정 권장.
