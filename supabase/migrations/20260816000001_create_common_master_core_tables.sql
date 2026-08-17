create extension if not exists "pgcrypto";

-- 会社
create table companies (
  id uuid primary key default gen_random_uuid(),
  company_code text not null unique,
  name text not null,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ブロック(任意の中間階層)
create table blocks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  block_code text not null,
  name text not null,
  display_order int not null default 0,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, block_code)
);

-- エリア
create table areas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  block_id uuid references blocks(id),
  area_code text not null,
  name text not null,
  display_order int not null default 0,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, area_code)
);

-- 店舗
create table stores (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  area_id uuid references areas(id),
  store_code text not null,
  name text not null,
  status text not null default 'active' check (status in ('active','preparing','suspended','closed')),
  opened_on date,
  closed_on date,
  manager_name text,
  manager_contact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, store_code)
);

-- 従業員(基本情報。人事システムのemploymentsはこのemployeesを参照する)
create table employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  employee_code text not null,
  full_name text not null,
  employment_type text,
  status text not null default 'active' check (status in ('active','leave','retired')),
  hired_on date,
  retired_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, employee_code)
);

-- 従業員の所属店舗履歴(異動・退職を履歴化。過去回答は変更しない前提のため上書きしない)
create table employee_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  store_id uuid not null references stores(id),
  started_on date not null,
  ended_on date,
  reason text,
  created_at timestamptz not null default now(),
  created_by uuid
);

create index on blocks (company_id);
create index on areas (company_id);
create index on areas (block_id);
create index on stores (company_id);
create index on stores (area_id);
create index on employees (company_id);
create index on employee_assignments (employee_id);
create index on employee_assignments (store_id);
