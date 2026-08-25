-- レシピ閲覧システム: MVP schema per 東洋食品_レシピ閲覧システム_本番移行実装仕様書_v1.0
-- Search/view flow (RV-10, RV-20) with related files/products.申請・承認・アップロード
-- workflow (RV-30〜RV-80) and the ~40,000-record historical migration are a later phase.

create table recipes (
  id uuid primary key default gen_random_uuid(),
  recipe_code text not null,
  company_id uuid not null references companies(id),
  area_id uuid references areas(id),
  name text not null,
  category text,
  status text not null default 'published' check (status in ('draft', 'published')),
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, recipe_code)
);

create table recipe_versions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  version_no integer not null,
  original_storage_path text,
  preview_storage_path text,
  uploaded_by uuid,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (recipe_id, version_no)
);

alter table recipes
  add constraint recipes_current_version_id_fkey
  foreign key (current_version_id) references recipe_versions(id);

create table recipe_files (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  file_type text not null check (
    file_type in ('work_instruction', 'container', 'pop', 'seal_label', 'video', 'other')
  ),
  storage_path text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table recipe_related_products (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  product_code text,
  product_name text not null,
  spec text,
  supplier text,
  display_order integer not null default 0,
  source_type text not null default 'manual' check (source_type in ('auto', 'manual')),
  locked_by_user boolean not null default false,
  created_at timestamptz not null default now()
);

create table recipe_view_logs (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id),
  user_id uuid not null,
  viewed_at timestamptz not null default now()
);

create table recipe_search_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  keyword text,
  hit_count integer not null default 0,
  searched_at timestamptz not null default now()
);

create index recipes_company_id_idx on recipes(company_id);
create index recipes_area_id_idx on recipes(area_id);
create index recipe_versions_recipe_id_idx on recipe_versions(recipe_id);
create index recipe_files_recipe_id_idx on recipe_files(recipe_id);
create index recipe_related_products_recipe_id_idx on recipe_related_products(recipe_id);
