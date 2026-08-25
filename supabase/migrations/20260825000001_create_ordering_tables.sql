-- 販促物受発注システム: MVP schema per 東洋食品_販促物受発注システム_本番移行実装仕様書_v1.0
-- Store-facing flow (catalog -> cart -> order -> history). Admin screens (OM-*) are a later phase.

create table product_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references product_categories(id),
  level integer not null check (level in (1, 2, 3)),
  name text not null,
  display_order integer not null default 0,
  status text not null default 'active' check (status in ('active', 'hidden')),
  created_at timestamptz not null default now()
);

create table seal_sizes (
  id uuid primary key default gen_random_uuid(),
  faces integer not null unique,
  width_mm numeric(6, 1) not null,
  height_mm numeric(6, 1) not null,
  note text
);

create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references product_categories(id),
  product_type text not null check (
    product_type in ('normal_pop', 'price_input_pop', 'viking_price', 'normal_seal', 'seal_price_list', 'laminate', 'other')
  ),
  name text not null,
  description text,
  unit_price integer not null default 0,
  lot_size integer not null default 1,
  seal_size_id uuid references seal_sizes(id),
  requires_delivery_date boolean not null default false,
  allow_multi_store_order boolean not null default true,
  min_order_qty integer not null default 1,
  max_order_qty integer,
  display_order integer not null default 0,
  is_recommended boolean not null default false,
  recommend_badge text,
  recommend_title text,
  recommend_start date,
  recommend_end date,
  status text not null default 'active' check (status in ('active', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  storage_path text not null,
  display_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table bulk_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  created_by uuid not null,
  target_description text,
  store_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  company_id uuid not null references companies(id),
  store_id uuid not null references stores(id),
  ordered_by uuid not null,
  bulk_order_id uuid references bulk_orders(id),
  status text not null default 'new' check (
    status in ('new', 'in_production', 'preparing_shipment', 'shipped', 'cancelled')
  ),
  delivery_date date,
  shipping_address text,
  memo text,
  shipping_method text,
  shipping_fee integer not null default 0,
  tracking_number text,
  shipped_on date,
  delivered_on date,
  cancel_reason text,
  total_amount integer not null default 0,
  billed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  product_name_snapshot text not null,
  product_type_snapshot text not null,
  unit_price_snapshot integer not null,
  lot_size_snapshot integer not null default 1,
  quantity integer not null check (quantity > 0),
  subtotal integer not null,
  detail jsonb not null default '{}'::jsonb,
  memo text,
  created_at timestamptz not null default now()
);

create table order_status_histories (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid,
  note text,
  created_at timestamptz not null default now()
);

create index orders_store_id_idx on orders(store_id);
create index orders_company_id_idx on orders(company_id);
create index orders_bulk_order_id_idx on orders(bulk_order_id);
create index order_lines_order_id_idx on order_lines(order_id);
create index products_category_id_idx on products(category_id);
