-- ============================================================================
-- ez-flow — 통합 업무·협업 플랫폼 데이터 스키마 (전체 DDL + RLS 실행본)
-- ----------------------------------------------------------------------------
-- 버전:     v1.0
-- 기반 문서: docs/specs/ez-flow-기획서.md  (§5 데이터모델 · §5.3 인덱스 · §6 권한/보안)
-- 대상 DB:   Supabase PostgreSQL
-- 실행 위치: Supabase SQL Editor 또는 supabase/migrations/
--
-- 공통 규칙 (기획서 §5.2):
--   - PK: uuid default gen_random_uuid()
--   - 시각: timestamptz (UTC 저장, 표시 시 사용자 TZ 변환 — §10.2)
--   - 컬럼: snake_case
--   - 모든 테넌트 테이블에 workspace_id (RLS 키)
--
-- 보안 규칙 (기획서 §6, CLAUDE.md 최우선 원칙 2·3):
--   - 모든 테넌트 테이블 RLS 필수 + default deny (정책 없으면 차단)
--   - Guest 격리: workspace 헬퍼 대신 project 헬퍼만 사용
--   - 클라는 publishable(anon) key만 보유 → RLS가 실제 방어선
--
-- ⚠️ 실행 전 확인: 이 스크립트는 테넌시 전체 스키마를 생성합니다.
--    재실행 안전성을 위해 enum/table은 가드(if not exists / do $$)를 사용합니다.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. 확장
-- ----------------------------------------------------------------------------
-- gen_random_uuid()는 pgcrypto 제공 (Supabase 기본 활성화되어 있으나 명시)
create extension if not exists pgcrypto;


-- ----------------------------------------------------------------------------
-- 1. ENUM 타입 (기획서 §5.2)
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'workspace_role') then
    create type workspace_role as enum ('owner','admin','member','guest');
  end if;
  if not exists (select 1 from pg_type where typname = 'project_role') then
    create type project_role as enum ('lead','member','guest');
  end if;
  if not exists (select 1 from pg_type where typname = 'channel_type') then
    create type channel_type as enum ('dm','group','project');
  end if;
  if not exists (select 1 from pg_type where typname = 'field_type') then
    create type field_type as enum
      ('text','number','date','select','checkbox','person','money','status');
  end if;
  if not exists (select 1 from pg_type where typname = 'approval_status') then
    create type approval_status as enum ('draft','pending','approved','rejected');
  end if;
end$$;


-- ----------------------------------------------------------------------------
-- 2. 테넌시 & 사용자 (기획서 §5.2.1)
-- ----------------------------------------------------------------------------

-- 최상위 격리 단위. 회사/조직 1개 = 워크스페이스 1개. 모든 데이터의 멀티테넌시 경계
create table if not exists workspaces (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  owner_id         uuid not null references auth.users(id),
  default_locale   text not null default 'ko',          -- ko/en/zh/vi (§17 LOCALES)
  default_timezone text not null default 'Asia/Seoul',  -- §17 TZ_PRESETS
  created_at       timestamptz not null default now()
);

-- auth.users 미러 프로필
create table if not exists users (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email        text not null,
  avatar_url   text,
  locale       text,                                    -- 사용자별 언어 (없으면 ws 기본)
  timezone     text,                                    -- 사용자별 타임존
  phone        text,
  org_title    text,                                    -- 소속/직함 (검색용 FR-3.5)
  created_at   timestamptz not null default now()
);

-- 역할 부여 지점 (기획서 §6.2 권한 상속의 기본 레벨)
create table if not exists workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  role         workspace_role not null default 'member',
  invited_by   uuid references users(id),
  joined_at    timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists teams (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  created_at   timestamptz not null default now()
);

create table if not exists team_members (
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  primary key (team_id, user_id)
);


-- ----------------------------------------------------------------------------
-- 3. 프로젝트 & 업무 (기획서 §5.2.2)
-- ----------------------------------------------------------------------------

create table if not exists projects (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  goal         text,
  start_date   date,
  end_date     date,
  status       text not null default 'active',          -- active/archived
  created_by   uuid not null references users(id),
  created_at   timestamptz not null default now()
);

-- 프로젝트 단위 역할 오버라이드 (기획서 §6.2). Guest는 이 테이블 행이 있는 프로젝트만 접근
create table if not exists project_members (
  project_id uuid not null references projects(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  role       project_role not null default 'member',
  primary key (project_id, user_id)
);

-- 상태 라벨 커스텀 가능 → 테이블화 (FR-3.2)
create table if not exists task_statuses (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  key        text not null,                             -- requested/in_progress/feedback/done (§17)
  label      text not null,                             -- 표시명 (다국어는 i18n 키 or 원문)
  color      text not null default '#888',
  sort_order int not null default 0
);

create table if not exists tasks (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references workspaces(id) on delete cascade,
  project_id     uuid not null references projects(id) on delete cascade,
  parent_task_id uuid references tasks(id) on delete cascade,  -- 하위업무 (무제한 중첩)
  title          text not null,
  description    text,
  status_id      uuid references task_statuses(id),
  priority       smallint not null default 2,           -- 0 낮음 ~ 3 긴급 (§17 TASK_PRIORITY)
  start_date     timestamptz,
  due_date       timestamptz,                           -- UTC 저장, 표시 시 사용자 TZ 변환
  created_by     uuid not null references users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- 담당자 N:M (FR-3)
create table if not exists task_assignees (
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  primary key (task_id, user_id)
);

create table if not exists comments (
  id        uuid primary key default gen_random_uuid(),
  task_id   uuid not null references tasks(id) on delete cascade,
  author_id uuid not null references users(id),
  body      text not null,                              -- 멘션 @uuid 토큰 포함, 렌더 시 escape (XSS 방지)
  created_at timestamptz not null default now()
);

create table if not exists attachments (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id),
  task_id      uuid references tasks(id) on delete cascade,
  storage_path text not null,                           -- Storage 경로
  file_name    text not null,
  mime         text,
  size_bytes   bigint,
  uploaded_by  uuid references users(id),
  created_at   timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 4. 메신저 (기획서 §5.2.3)
-- ----------------------------------------------------------------------------

create table if not exists channels (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  type         channel_type not null,
  project_id   uuid references projects(id) on delete cascade,
  name         text,
  created_at   timestamptz not null default now()
);

create table if not exists channel_members (
  channel_id   uuid not null references channels(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  last_read_at timestamptz,                             -- 읽음 표시
  primary key (channel_id, user_id)
);

create table if not exists messages (
  id             uuid primary key default gen_random_uuid(),
  channel_id     uuid not null references channels(id) on delete cascade,
  author_id      uuid not null references users(id),
  body           text,
  attachment_path text,                                 -- 파일/이미지/음성
  linked_task_id uuid references tasks(id),             -- 채팅→업무 링크 (FR-5.2)
  created_at     timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 5. 워크플로우 (커스텀 DB) (기획서 §5.2.4)
-- ----------------------------------------------------------------------------

create table if not exists workflows (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id   uuid references projects(id) on delete cascade,
  name         text not null,
  created_at   timestamptz not null default now()
);

create table if not exists fields (
  id          uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows(id) on delete cascade,
  key         text not null,
  label       text not null,
  type        field_type not null,
  options     jsonb,                                    -- select 보기/색상 등
  sort_order  int not null default 0
);

create table if not exists records (
  id          uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows(id) on delete cascade,
  values      jsonb not null default '{}',             -- {field_key: value} (검증은 앱+제약)
  created_at  timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 6. 회의록 (기획서 §5.2.5)
-- ----------------------------------------------------------------------------

create table if not exists meetings (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id   uuid references projects(id),
  title        text,
  audio_path   text,
  locale       text,                                    -- STT 언어 힌트
  created_by   uuid references users(id),
  created_at   timestamptz not null default now()
);

create table if not exists transcripts (
  meeting_id uuid primary key references meetings(id) on delete cascade,
  full_text  text,
  summary    jsonb                                      -- {agenda[], decisions[], action_items[]}
);

create table if not exists action_items (
  id                 uuid primary key default gen_random_uuid(),
  meeting_id         uuid not null references meetings(id) on delete cascade,
  text               text not null,
  suggested_assignee uuid references users(id),
  suggested_due      timestamptz,
  promoted_task_id   uuid references tasks(id)          -- 업무 승격 시 연결
);


-- ----------------------------------------------------------------------------
-- 7. 캘린더 / 결재 / 알림 (기획서 §5.2.6)
-- ----------------------------------------------------------------------------

create table if not exists events (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id   uuid references projects(id),
  owner_id     uuid references users(id),
  title        text not null,
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  scope        text not null default 'personal',        -- personal/project/team
  external_ref text                                      -- Google Calendar 연동 ID
);

create table if not exists approvals (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title        text not null,
  form         jsonb,
  status       approval_status not null default 'draft',
  drafter_id   uuid not null references users(id),
  created_at   timestamptz not null default now()
);

create table if not exists approval_steps (
  id          uuid primary key default gen_random_uuid(),
  approval_id uuid not null references approvals(id) on delete cascade,
  approver_id uuid not null references users(id),
  step_order  int not null,
  decision    approval_status,                           -- approved/rejected/null(대기)
  decided_at  timestamptz
);

create table if not exists notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id),
  type         text not null,                            -- mention/assigned/due_soon/approval/comment (§17)
  payload      jsonb not null,                           -- {task_id, actor, ...}
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 7.5 확장 테이블 (기획서 deferred 항목 정식 편입 — 2026-06-07 마스터 결정)
--   §8.9 files / §9.4 ai_usage_logs / §11 notification_prefs / §8.1 user_dashboard_layout
-- ----------------------------------------------------------------------------

-- 프로젝트 파일 + 버전 관리 (§8.9). 동일 storage_path 신규 업로드 시 version 증가
create table if not exists files (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id   uuid references projects(id) on delete cascade,
  name         text not null,
  storage_path text not null,
  mime         text,
  size_bytes   bigint,
  version      int not null default 1,
  uploaded_by  uuid references users(id),
  created_at   timestamptz not null default now()
);

-- AI 사용 로그 (§9.4 원가/마진). 삽입은 Edge Function(service_role)만 — 클라 차단
create table if not exists ai_usage_logs (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references workspaces(id) on delete cascade,
  user_id           uuid references users(id) on delete set null,
  feature           text not null,                  -- project_design/assistant/meeting_stt
  provider          text not null,                  -- claude/openai (ADR-007)
  model             text not null,
  prompt_tokens     int not null default 0,
  completion_tokens int not null default 0,
  cost_usd          numeric(12,6) not null default 0,
  created_at        timestamptz not null default now()
);

-- 알림 개인 설정 (§11). 사용자 × 워크스페이스 단위
create table if not exists notification_prefs (
  user_id       uuid not null references users(id) on delete cascade,
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  channel_email boolean not null default true,
  channel_push  boolean not null default true,
  prefs         jsonb not null default '{}',        -- 타입별 on/off·빈도 (§17 NOTIF_TYPE)
  updated_at    timestamptz not null default now(),
  primary key (user_id, workspace_id)
);

-- 대시보드 위젯 배치 (§8.1). 사용자 × 워크스페이스 단위, jsonb 레이아웃
create table if not exists user_dashboard_layout (
  user_id      uuid not null references users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  layout       jsonb not null default '[]',         -- 위젯 배치 (react-grid-layout 등)
  updated_at   timestamptz not null default now(),
  primary key (user_id, workspace_id)
);


-- ----------------------------------------------------------------------------
-- 8. updated_at 자동 갱신 트리거 (updated_at 컬럼 보유 테이블)
-- ----------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tasks_updated_at on tasks;
create trigger trg_tasks_updated_at
  before update on tasks
  for each row execute function set_updated_at();

drop trigger if exists trg_notif_prefs_updated_at on notification_prefs;
create trigger trg_notif_prefs_updated_at
  before update on notification_prefs
  for each row execute function set_updated_at();

drop trigger if exists trg_dash_layout_updated_at on user_dashboard_layout;
create trigger trg_dash_layout_updated_at
  before update on user_dashboard_layout
  for each row execute function set_updated_at();


-- ----------------------------------------------------------------------------
-- 9. 인덱스 전략 (기획서 §5.3 — 성능 NFR 1초/2초)
-- ----------------------------------------------------------------------------
create index if not exists idx_tasks_project_status  on tasks (project_id, status_id);   -- 보드/필터
create index if not exists idx_tasks_ws_due          on tasks (workspace_id, due_date);  -- "마감 임박" 질의
create index if not exists idx_tasks_parent          on tasks (parent_task_id);          -- 하위업무 트리
create index if not exists idx_messages_channel_time on messages (channel_id, created_at desc); -- 채팅 페이지네이션
create index if not exists idx_notifications_user    on notifications (user_id, read_at, created_at desc); -- 알림 센터
create index if not exists idx_task_assignees_user   on task_assignees (user_id);         -- "내 업무"
create index if not exists idx_records_values_gin    on records using gin (values);        -- jsonb 필드 검색
create index if not exists idx_files_project        on files (project_id);                 -- 프로젝트 파일 트리
create index if not exists idx_ai_usage_ws_time     on ai_usage_logs (workspace_id, created_at desc); -- 사용량/원가 집계
create index if not exists idx_ai_usage_user        on ai_usage_logs (user_id);            -- 유저별 사용량


-- ============================================================================
-- 10. RLS — 권한 & 보안 (기획서 §6)
-- ----------------------------------------------------------------------------
-- 원칙: 모든 테넌트 테이블 RLS enable + default deny. 정책 없으면 차단.
-- Guest 격리: workspace 헬퍼 대신 project 헬퍼만 사용.
-- ============================================================================

-- 10.1 헬퍼 함수 (기획서 §6.3) -----------------------------------------------
-- 주의: CREATE OR REPLACE는 파라미터 "이름" 변경을 허용하지 않는다(ERROR 42P13).
--   기존(이전 버전) 함수가 다른 파라미터명으로 존재할 수 있으므로 먼저 drop 후 생성.
--   cascade로 의존 정책이 함께 삭제돼도, 아래 §10.3에서 모두 재생성하므로 안전.
drop function if exists is_ws_member(uuid)        cascade;
drop function if exists ws_role(uuid)             cascade;
drop function if exists can_access_project(uuid)  cascade;
drop function if exists is_channel_member(uuid)   cascade;

-- 현재 유저가 워크스페이스 멤버인가
create or replace function is_ws_member(ws uuid) returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists(select 1 from workspace_members
                where workspace_id = ws and user_id = auth.uid());
$$;

-- 현재 유저의 워크스페이스 역할 (없으면 null)
create or replace function ws_role(ws uuid) returns workspace_role
language sql security definer stable
set search_path = public
as $$
  select role from workspace_members
   where workspace_id = ws and user_id = auth.uid();
$$;

-- 프로젝트 접근 가능 (내부 멤버 or Guest 초대 — project_members에 행 존재)
create or replace function can_access_project(p uuid) returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists(select 1 from project_members
                where project_id = p and user_id = auth.uid());
$$;

-- 채널 멤버인가
create or replace function is_channel_member(c uuid) returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists(select 1 from channel_members
                where channel_id = c and user_id = auth.uid());
$$;


-- 10.2 RLS 활성화 (모든 테넌트 테이블) --------------------------------------
alter table workspaces        enable row level security;
alter table users             enable row level security;
alter table workspace_members enable row level security;
alter table teams             enable row level security;
alter table team_members      enable row level security;
alter table projects          enable row level security;
alter table project_members   enable row level security;
alter table task_statuses     enable row level security;
alter table tasks             enable row level security;
alter table task_assignees    enable row level security;
alter table comments          enable row level security;
alter table attachments       enable row level security;
alter table channels          enable row level security;
alter table channel_members   enable row level security;
alter table messages          enable row level security;
alter table workflows         enable row level security;
alter table fields            enable row level security;
alter table records           enable row level security;
alter table meetings          enable row level security;
alter table transcripts       enable row level security;
alter table action_items      enable row level security;
alter table events            enable row level security;
alter table approvals         enable row level security;
alter table approval_steps    enable row level security;
alter table notifications     enable row level security;
alter table files                 enable row level security;
alter table ai_usage_logs         enable row level security;
alter table notification_prefs    enable row level security;
alter table user_dashboard_layout enable row level security;


-- 10.3 정책 (기획서 §6.1 RBAC 매트릭스 + §6.2 상속/오버라이드) ---------------
-- 표기: M+ = Member 이상, Admin+ = Admin 이상

-- workspaces: 멤버는 조회, Owner만 수정/삭제, 본인 소유로 생성
drop policy if exists ws_select on workspaces;
create policy ws_select on workspaces for select
  using ( is_ws_member(id) );
drop policy if exists ws_insert on workspaces;
create policy ws_insert on workspaces for insert
  with check ( owner_id = auth.uid() );
drop policy if exists ws_update on workspaces;
create policy ws_update on workspaces for update
  using ( ws_role(id) = 'owner' );
drop policy if exists ws_delete on workspaces;
create policy ws_delete on workspaces for delete
  using ( ws_role(id) = 'owner' );

-- users: 본인 프로필은 읽기/수정. 같은 워크스페이스 멤버 프로필은 조회 가능
--   (Guest 멤버목록 격리는 앱 쿼리 레벨에서 처리 — §6.1 "Guest 멤버 목록 ❌")
drop policy if exists users_select_self on users;
create policy users_select_self on users for select
  using (
    id = auth.uid()
    or exists (
      select 1 from workspace_members me
      join workspace_members them
        on them.workspace_id = me.workspace_id
      where me.user_id = auth.uid()
        and them.user_id = users.id
    )
  );
drop policy if exists users_upsert_self on users;
create policy users_upsert_self on users for insert
  with check ( id = auth.uid() );
drop policy if exists users_update_self on users;
create policy users_update_self on users for update
  using ( id = auth.uid() );

-- workspace_members: 멤버는 조회. 초대/역할변경은 Owner/Admin (§6.1)
drop policy if exists wm_select on workspace_members;
create policy wm_select on workspace_members for select
  using ( is_ws_member(workspace_id) );
drop policy if exists wm_write on workspace_members;
create policy wm_write on workspace_members for all
  using ( ws_role(workspace_id) in ('owner','admin') )
  with check ( ws_role(workspace_id) in ('owner','admin') );

-- teams / team_members: 워크스페이스 멤버 조회, Admin+ 관리
drop policy if exists teams_select on teams;
create policy teams_select on teams for select
  using ( is_ws_member(workspace_id) );
drop policy if exists teams_write on teams;
create policy teams_write on teams for all
  using ( ws_role(workspace_id) in ('owner','admin') )
  with check ( ws_role(workspace_id) in ('owner','admin') );

drop policy if exists tm_select on team_members;
create policy tm_select on team_members for select
  using ( exists (select 1 from teams t
                  where t.id = team_members.team_id
                    and is_ws_member(t.workspace_id)) );
drop policy if exists tm_write on team_members;
create policy tm_write on team_members for all
  using ( exists (select 1 from teams t
                  where t.id = team_members.team_id
                    and ws_role(t.workspace_id) in ('owner','admin')) )
  with check ( exists (select 1 from teams t
                  where t.id = team_members.team_id
                    and ws_role(t.workspace_id) in ('owner','admin')) );

-- projects: 접근 가능한 프로젝트만 조회 (Guest 자동 격리). 생성은 Admin+ (§6.1)
drop policy if exists projects_select on projects;
create policy projects_select on projects for select
  using ( can_access_project(id) );
drop policy if exists projects_insert on projects;
create policy projects_insert on projects for insert
  with check ( ws_role(workspace_id) in ('owner','admin')
               and created_by = auth.uid() );
drop policy if exists projects_update on projects;
create policy projects_update on projects for update
  using ( ws_role(workspace_id) in ('owner','admin')
          or exists (select 1 from project_members pm
                     where pm.project_id = projects.id
                       and pm.user_id = auth.uid()
                       and pm.role = 'lead') );
drop policy if exists projects_delete on projects;
create policy projects_delete on projects for delete
  using ( ws_role(workspace_id) in ('owner','admin') );

-- project_members: 프로젝트 접근자 조회, Admin+/프로젝트 lead가 관리
drop policy if exists pm_select on project_members;
create policy pm_select on project_members for select
  using ( can_access_project(project_id) );
drop policy if exists pm_write on project_members;
create policy pm_write on project_members for all
  using ( exists (select 1 from projects p
                  where p.id = project_members.project_id
                    and ws_role(p.workspace_id) in ('owner','admin')) )
  with check ( exists (select 1 from projects p
                  where p.id = project_members.project_id
                    and ws_role(p.workspace_id) in ('owner','admin')) );

-- task_statuses: 프로젝트 접근자 조회, 내부 멤버 관리
drop policy if exists ts_select on task_statuses;
create policy ts_select on task_statuses for select
  using ( can_access_project(project_id) );
drop policy if exists ts_write on task_statuses;
create policy ts_write on task_statuses for all
  using ( exists (select 1 from projects p
                  where p.id = task_statuses.project_id
                    and is_ws_member(p.workspace_id)
                    and can_access_project(p.id)) )
  with check ( exists (select 1 from projects p
                  where p.id = task_statuses.project_id
                    and is_ws_member(p.workspace_id)
                    and can_access_project(p.id)) );

-- tasks: 참여 프로젝트 업무 조회 (Guest 자동 격리). (기획서 §6.3 예시)
drop policy if exists task_select on tasks;
create policy task_select on tasks for select
  using ( can_access_project(project_id) );
-- 생성: 프로젝트 접근자
drop policy if exists task_insert on tasks;
create policy task_insert on tasks for insert
  with check ( can_access_project(project_id) and created_by = auth.uid() );
-- 수정: 내부 멤버 또는 배정된 Guest만 (기획서 §6.3 예시)
drop policy if exists task_write on tasks;
create policy task_write on tasks for update
  using ( can_access_project(project_id)
          and ( is_ws_member(workspace_id)
                or exists (select 1 from task_assignees
                           where task_id = tasks.id and user_id = auth.uid()) ) );
-- 삭제: 내부 멤버
drop policy if exists task_delete on tasks;
create policy task_delete on tasks for delete
  using ( can_access_project(project_id) and is_ws_member(workspace_id) );

-- task_assignees: 업무 접근자 조회, 내부 멤버 관리
drop policy if exists ta_select on task_assignees;
create policy ta_select on task_assignees for select
  using ( exists (select 1 from tasks t
                  where t.id = task_assignees.task_id
                    and can_access_project(t.project_id)) );
drop policy if exists ta_write on task_assignees;
create policy ta_write on task_assignees for all
  using ( exists (select 1 from tasks t
                  where t.id = task_assignees.task_id
                    and can_access_project(t.project_id)
                    and is_ws_member(t.workspace_id)) )
  with check ( exists (select 1 from tasks t
                  where t.id = task_assignees.task_id
                    and can_access_project(t.project_id)
                    and is_ws_member(t.workspace_id)) );

-- comments: 업무 접근자 조회, 작성자 본인이 작성/수정/삭제
drop policy if exists comments_select on comments;
create policy comments_select on comments for select
  using ( exists (select 1 from tasks t
                  where t.id = comments.task_id
                    and can_access_project(t.project_id)) );
drop policy if exists comments_insert on comments;
create policy comments_insert on comments for insert
  with check ( author_id = auth.uid()
               and exists (select 1 from tasks t
                           where t.id = comments.task_id
                             and can_access_project(t.project_id)) );
drop policy if exists comments_modify on comments;
create policy comments_modify on comments for update
  using ( author_id = auth.uid() );
drop policy if exists comments_delete on comments;
create policy comments_delete on comments for delete
  using ( author_id = auth.uid() );

-- attachments: 업무 접근자 조회, 업로더/내부 멤버 관리
drop policy if exists att_select on attachments;
create policy att_select on attachments for select
  using ( task_id is not null
          and exists (select 1 from tasks t
                      where t.id = attachments.task_id
                        and can_access_project(t.project_id)) );
drop policy if exists att_insert on attachments;
create policy att_insert on attachments for insert
  with check ( uploaded_by = auth.uid()
               and exists (select 1 from tasks t
                           where t.id = attachments.task_id
                             and can_access_project(t.project_id)) );
drop policy if exists att_delete on attachments;
create policy att_delete on attachments for delete
  using ( uploaded_by = auth.uid()
          or exists (select 1 from tasks t
                     where t.id = attachments.task_id
                       and is_ws_member(t.workspace_id)) );

-- channels: 채널 멤버만 조회. (프로젝트 채널은 프로젝트 접근자)
drop policy if exists channels_select on channels;
create policy channels_select on channels for select
  using ( is_channel_member(id)
          or (project_id is not null and can_access_project(project_id)) );
drop policy if exists channels_insert on channels;
create policy channels_insert on channels for insert
  with check ( is_ws_member(workspace_id) );

-- channel_members: 같은 채널 멤버 조회, 본인 행 추가/갱신(읽음표시)
drop policy if exists cm_select on channel_members;
create policy cm_select on channel_members for select
  using ( is_channel_member(channel_id) );
drop policy if exists cm_insert on channel_members;
create policy cm_insert on channel_members for insert
  with check ( exists (select 1 from channels c
                       where c.id = channel_members.channel_id
                         and is_ws_member(c.workspace_id)) );
drop policy if exists cm_update_self on channel_members;
create policy cm_update_self on channel_members for update
  using ( user_id = auth.uid() );

-- messages: 채널 멤버 조회, 본인 작성
drop policy if exists messages_select on messages;
create policy messages_select on messages for select
  using ( is_channel_member(channel_id) );
drop policy if exists messages_insert on messages;
create policy messages_insert on messages for insert
  with check ( author_id = auth.uid() and is_channel_member(channel_id) );
drop policy if exists messages_modify on messages;
create policy messages_modify on messages for update
  using ( author_id = auth.uid() );
drop policy if exists messages_delete on messages;
create policy messages_delete on messages for delete
  using ( author_id = auth.uid() );

-- workflows / fields / records: 프로젝트(있으면) 접근자 + 워크스페이스 멤버 (FR-7, Guest ❌)
drop policy if exists wf_select on workflows;
create policy wf_select on workflows for select
  using ( is_ws_member(workspace_id)
          and (project_id is null or can_access_project(project_id)) );
drop policy if exists wf_write on workflows;
create policy wf_write on workflows for all
  using ( is_ws_member(workspace_id) )
  with check ( is_ws_member(workspace_id) );

drop policy if exists fields_select on fields;
create policy fields_select on fields for select
  using ( exists (select 1 from workflows w
                  where w.id = fields.workflow_id
                    and is_ws_member(w.workspace_id)) );
drop policy if exists fields_write on fields;
create policy fields_write on fields for all
  using ( exists (select 1 from workflows w
                  where w.id = fields.workflow_id
                    and is_ws_member(w.workspace_id)) )
  with check ( exists (select 1 from workflows w
                  where w.id = fields.workflow_id
                    and is_ws_member(w.workspace_id)) );

drop policy if exists records_select on records;
create policy records_select on records for select
  using ( exists (select 1 from workflows w
                  where w.id = records.workflow_id
                    and is_ws_member(w.workspace_id)) );
drop policy if exists records_write on records;
create policy records_write on records for all
  using ( exists (select 1 from workflows w
                  where w.id = records.workflow_id
                    and is_ws_member(w.workspace_id)) )
  with check ( exists (select 1 from workflows w
                  where w.id = records.workflow_id
                    and is_ws_member(w.workspace_id)) );

-- meetings / transcripts / action_items: 워크스페이스 멤버 (M+, FR-6)
drop policy if exists meetings_select on meetings;
create policy meetings_select on meetings for select
  using ( is_ws_member(workspace_id)
          and (project_id is null or can_access_project(project_id)) );
drop policy if exists meetings_write on meetings;
create policy meetings_write on meetings for all
  using ( is_ws_member(workspace_id) )
  with check ( is_ws_member(workspace_id) );

drop policy if exists transcripts_select on transcripts;
create policy transcripts_select on transcripts for select
  using ( exists (select 1 from meetings m
                  where m.id = transcripts.meeting_id
                    and is_ws_member(m.workspace_id)) );
drop policy if exists transcripts_write on transcripts;
create policy transcripts_write on transcripts for all
  using ( exists (select 1 from meetings m
                  where m.id = transcripts.meeting_id
                    and is_ws_member(m.workspace_id)) )
  with check ( exists (select 1 from meetings m
                  where m.id = transcripts.meeting_id
                    and is_ws_member(m.workspace_id)) );

drop policy if exists ai_select on action_items;
create policy ai_select on action_items for select
  using ( exists (select 1 from meetings m
                  where m.id = action_items.meeting_id
                    and is_ws_member(m.workspace_id)) );
drop policy if exists ai_write on action_items;
create policy ai_write on action_items for all
  using ( exists (select 1 from meetings m
                  where m.id = action_items.meeting_id
                    and is_ws_member(m.workspace_id)) )
  with check ( exists (select 1 from meetings m
                  where m.id = action_items.meeting_id
                    and is_ws_member(m.workspace_id)) );

-- events: 워크스페이스 멤버 조회 (개인 일정은 본인). 본인/멤버 생성
drop policy if exists events_select on events;
create policy events_select on events for select
  using ( is_ws_member(workspace_id)
          and ( scope <> 'personal' or owner_id = auth.uid() ) );
drop policy if exists events_write on events;
create policy events_write on events for all
  using ( is_ws_member(workspace_id)
          and ( owner_id = auth.uid() or ws_role(workspace_id) in ('owner','admin') ) )
  with check ( is_ws_member(workspace_id) );

-- approvals / approval_steps: 기안자·결재자·Admin+ (FR-9.2)
drop policy if exists approvals_select on approvals;
create policy approvals_select on approvals for select
  using ( is_ws_member(workspace_id)
          and ( drafter_id = auth.uid()
                or ws_role(workspace_id) in ('owner','admin')
                or exists (select 1 from approval_steps s
                           where s.approval_id = approvals.id
                             and s.approver_id = auth.uid()) ) );
drop policy if exists approvals_insert on approvals;
create policy approvals_insert on approvals for insert
  with check ( drafter_id = auth.uid() and is_ws_member(workspace_id) );
drop policy if exists approvals_update on approvals;
create policy approvals_update on approvals for update
  using ( drafter_id = auth.uid() and status = 'draft' );

drop policy if exists asteps_select on approval_steps;
create policy asteps_select on approval_steps for select
  using ( exists (select 1 from approvals a
                  where a.id = approval_steps.approval_id
                    and is_ws_member(a.workspace_id)) );
-- 결재 의사결정: 해당 단계 결재자 본인만
drop policy if exists asteps_decide on approval_steps;
create policy asteps_decide on approval_steps for update
  using ( approver_id = auth.uid() );

-- notifications: 본인 알림만 (기획서 §7.3 notifications:user_id=eq.{me})
drop policy if exists notif_select on notifications;
create policy notif_select on notifications for select
  using ( user_id = auth.uid() );
-- 읽음 처리 등 본인 갱신
drop policy if exists notif_update on notifications;
create policy notif_update on notifications for update
  using ( user_id = auth.uid() );
-- INSERT는 Edge Function(service role)이 RLS 우회로 수행 (notify-dispatch, §7.2)
-- → 클라이언트 직접 insert 정책 없음 = 차단(default deny)

-- files: 프로젝트 접근자 조회(프로젝트 없으면 ws 멤버), 업로더/내부 멤버 관리
drop policy if exists files_select on files;
create policy files_select on files for select
  using ( case when project_id is null then is_ws_member(workspace_id)
               else can_access_project(project_id) end );
drop policy if exists files_insert on files;
create policy files_insert on files for insert
  with check ( uploaded_by = auth.uid()
               and case when project_id is null then is_ws_member(workspace_id)
                        else can_access_project(project_id) end );
drop policy if exists files_delete on files;
create policy files_delete on files for delete
  using ( uploaded_by = auth.uid() or is_ws_member(workspace_id) );

-- ai_usage_logs: 본인 사용량 또는 ws 관리자(owner/admin) 조회. 삽입은 service_role만(정책 없음)
drop policy if exists ai_usage_select on ai_usage_logs;
create policy ai_usage_select on ai_usage_logs for select
  using ( user_id = auth.uid() or ws_role(workspace_id) in ('owner','admin') );

-- notification_prefs: 본인 것만 (CRUD)
drop policy if exists notif_prefs_all on notification_prefs;
create policy notif_prefs_all on notification_prefs for all
  using ( user_id = auth.uid() )
  with check ( user_id = auth.uid() and is_ws_member(workspace_id) );

-- user_dashboard_layout: 본인 것만 (CRUD)
drop policy if exists dash_layout_all on user_dashboard_layout;
create policy dash_layout_all on user_dashboard_layout for all
  using ( user_id = auth.uid() )
  with check ( user_id = auth.uid() and is_ws_member(workspace_id) );


-- ============================================================================
-- 11. 부록 — 상수 참조 (기획서 §17, CLAUDE.md 규칙3 매직넘버 금지)
-- ----------------------------------------------------------------------------
-- 앱(TS)과 동기화할 코드값. DB는 자유 텍스트지만 앱에서 아래 상수로 강제.
--   TASK_PRIORITY  = { LOW:0, NORMAL:1, HIGH:2, URGENT:3 }   (tasks.priority)
--   DEFAULT_STATUS = ['requested','in_progress','feedback','done']  (task_statuses.key)
--   NOTIF_TYPE     = ['mention','assigned','due_soon','approval','comment']  (notifications.type)
--   WS_ROLE        = ['owner','admin','member','guest']      (workspace_role enum)
--   LOCALES        = ['ko','en','zh','vi']                   (locale 컬럼)
--   TZ_PRESETS     = ['Asia/Seoul','Asia/Shanghai','Asia/Ho_Chi_Minh',
--                     'Asia/Singapore','Asia/Kuala_Lumpur','Asia/Manila']
--
-- deferred 항목 정식 편입 완료 (2026-06-07 마스터 결정, §7.5):
--   ✅ files (§8.9 버전관리) / ai_usage_logs (§9.4) /
--      notification_prefs (§11) / user_dashboard_layout (§8.1)
--   → 모두 RLS 적용. 총 테이블 29개.
-- ============================================================================
