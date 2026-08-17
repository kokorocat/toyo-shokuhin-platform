-- お知らせ(マニュアルとは別エンティティ)
create table portal_notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  importance text not null default 'normal' check (importance in ('normal','important','urgent')),
  external_url text,
  display_start_at timestamptz not null default now(),
  display_end_at timestamptz,
  status text not null default 'draft' check (status in ('draft','scheduled','published','ended','unpublished')),
  is_deleted boolean not null default false,
  created_by uuid references user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- お知らせの公開対象(全店舗/会社/エリア/複数店舗/個別店舗を正規化して保持)
create table notice_scopes (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references portal_notices(id) on delete cascade,
  scope_type text not null check (scope_type in ('all','company','area','store')),
  company_id uuid references companies(id),
  area_id uuid references areas(id),
  store_id uuid references stores(id)
);

-- 既読管理(ユーザー単位を原則とし、共用アカウントの場合は店舗単位で代用)
create table notice_reads (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references portal_notices(id) on delete cascade,
  user_id uuid references user_profiles(id),
  store_id uuid references stores(id),
  read_at timestamptz not null default now(),
  unique (notice_id, user_id),
  unique (notice_id, store_id)
);

-- マニュアル(PDF原本を保持し、アプリ内ビューアで閲覧)
create table manuals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  status text not null default 'processing' check (status in ('processing','ready','error','unpublished')),
  current_version_id uuid,
  is_deleted boolean not null default false,
  created_by uuid references user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- マニュアルの版管理(原本を残したまま差替え可能)
create table manual_versions (
  id uuid primary key default gen_random_uuid(),
  manual_id uuid not null references manuals(id) on delete cascade,
  version_no int not null,
  original_file_path text not null,
  update_reason text,
  published_at timestamptz,
  created_by uuid references user_profiles(id),
  created_at timestamptz not null default now(),
  unique (manual_id, version_no)
);

alter table manuals
  add constraint manuals_current_version_fkey
  foreign key (current_version_id) references manual_versions(id);

-- マニュアルのページ・目次情報(指定ページだけ差替え可能)
create table manual_pages (
  id uuid primary key default gen_random_uuid(),
  manual_version_id uuid not null references manual_versions(id) on delete cascade,
  page_no int not null,
  chapter_title text,
  page_title text,
  replacement_file_path text,
  status text not null default 'active' check (status in ('active','replaced')),
  unique (manual_version_id, page_no)
);

-- マニュアルの公開対象(お知らせと同様の考え方)
create table manual_scopes (
  id uuid primary key default gen_random_uuid(),
  manual_id uuid not null references manuals(id) on delete cascade,
  scope_type text not null check (scope_type in ('all','company','area','store')),
  company_id uuid references companies(id),
  area_id uuid references areas(id),
  store_id uuid references stores(id)
);

-- 重い変換処理(PDFページ化等)のジョブキュー
create table processing_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  target_table text not null,
  target_id uuid not null,
  status text not null default 'queued' check (status in ('queued','processing','completed','error')),
  progress_percent int not null default 0,
  error_message text,
  retry_count int not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index on notice_scopes (notice_id);
create index on notice_scopes (company_id);
create index on notice_scopes (area_id);
create index on notice_scopes (store_id);
create index on notice_reads (notice_id);
create index on manual_versions (manual_id);
create index on manual_pages (manual_version_id);
create index on manual_scopes (manual_id);
create index on processing_jobs (status);
