-- auth.usersに紐づくアプリ側プロフィール
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  status text not null default 'active' check (status in ('active','suspended')),
  must_change_password boolean not null default true,
  employee_id uuid references employees(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ロール定義(店舗利用者・店舗責任者・エリア管理者・会社管理者・全権限管理者 等)
create table roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text
);

-- 6システムのレジストリ(広域ポータル/HACCP/販促物受発注/レシピ閲覧/店舗マスター/人事労務管理)
create table system_applications (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  base_url text,
  status text not null default 'active' check (status in ('active','inactive'))
);

-- ユーザーの権限範囲(会社・エリア・店舗・システム単位。異動・兼務を有効期間で管理)
create table user_access_scopes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  role_id uuid not null references roles(id),
  system_id uuid references system_applications(id),
  company_id uuid references companies(id),
  area_id uuid references areas(id),
  store_id uuid references stores(id),
  started_on date not null default current_date,
  ended_on date,
  created_at timestamptz not null default now(),
  created_by uuid
);

-- 全システム共通の監査ログ
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references user_profiles(id),
  system_code text not null,
  action text not null,
  target_table text,
  target_id text,
  before_data jsonb,
  after_data jsonb,
  ip_address text,
  occurred_at timestamptz not null default now()
);

create index on user_access_scopes (user_id);
create index on user_access_scopes (company_id);
create index on user_access_scopes (store_id);
create index on audit_logs (system_code);
create index on audit_logs (actor_id);
create index on audit_logs (occurred_at);
