-- HACCP日常点検の対象(店舗ごとの温度管理ポイント。冷蔵庫・冷凍庫・調理後の中心温度など)
create table haccp_check_points (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  store_id uuid not null references stores(id),
  name text not null,
  category text not null default 'refrigerator' check (category in ('refrigerator','freezer','cooking','other')),
  unit text not null default '℃',
  min_value numeric,
  max_value numeric,
  display_order int not null default 0,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 温度点検の実施記録(1点検ポイント×1回。訂正は新規記録を追加する運用とし、更新・削除は行わない)
create table haccp_temperature_records (
  id uuid primary key default gen_random_uuid(),
  check_point_id uuid not null references haccp_check_points(id),
  store_id uuid not null references stores(id),
  recorded_on date not null default current_date,
  recorded_at timestamptz not null default now(),
  value numeric not null,
  is_out_of_range boolean not null default false,
  note text,
  recorded_by uuid not null references user_profiles(id),
  created_at timestamptz not null default now()
);

-- 判定はクライアントを信用せずDB側で確定させる(check_pointsのmin/maxとの比較)
create or replace function public.haccp_set_out_of_range()
returns trigger
language plpgsql
as $$
declare
  v_min numeric;
  v_max numeric;
begin
  select min_value, max_value into v_min, v_max
  from haccp_check_points where id = new.check_point_id;

  new.is_out_of_range :=
    (v_min is not null and new.value < v_min)
    or (v_max is not null and new.value > v_max);
  return new;
end;
$$;

create trigger haccp_temperature_records_set_out_of_range
  before insert on haccp_temperature_records
  for each row execute function public.haccp_set_out_of_range();

create index on haccp_check_points (company_id);
create index on haccp_check_points (store_id);
create index on haccp_temperature_records (check_point_id);
create index on haccp_temperature_records (store_id);
create index on haccp_temperature_records (recorded_on);
