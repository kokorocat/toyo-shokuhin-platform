-- HACCP日常点検のうち、温度以外の衛生管理チェック項目マスター(店舗ごと)
create table haccp_hygiene_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  store_id uuid not null references stores(id),
  name text not null,
  display_order int not null default 0,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 衛生管理チェックの実施記録(OK/NGの二値判定。温度記録と同様、訂正は新規追加で対応)
create table haccp_hygiene_records (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references haccp_hygiene_items(id),
  store_id uuid not null references stores(id),
  checked_on date not null default current_date,
  checked_at timestamptz not null default now(),
  is_ok boolean not null,
  note text,
  checked_by uuid not null references user_profiles(id),
  created_at timestamptz not null default now()
);

create index on haccp_hygiene_items (company_id);
create index on haccp_hygiene_items (store_id);
create index on haccp_hygiene_records (item_id);
create index on haccp_hygiene_records (store_id);
create index on haccp_hygiene_records (checked_on);
