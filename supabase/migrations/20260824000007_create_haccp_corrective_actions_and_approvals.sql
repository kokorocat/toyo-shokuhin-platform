-- 是正・対応管理: 範囲外/NGとなった記録に対する原因分析・是正処置の記録
-- (温度記録・衛生記録のどちらか一方に必ず紐づく)
create table haccp_corrective_actions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  temperature_record_id uuid references haccp_temperature_records(id),
  hygiene_record_id uuid references haccp_hygiene_records(id),
  cause text not null,
  action_taken text not null,
  status text not null default 'resolved' check (status in ('open','resolved')),
  created_by uuid not null references user_profiles(id),
  created_at timestamptz not null default now(),
  constraint haccp_corrective_actions_one_source check (
    (temperature_record_id is not null and hygiene_record_id is null)
    or (temperature_record_id is null and hygiene_record_id is not null)
  )
);

-- 承認・レビュー: 店舗責任者が当日分の点検記録をまとめて確認・承認したことを記録
create table haccp_daily_approvals (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  approved_date date not null default current_date,
  note text,
  approved_by uuid not null references user_profiles(id),
  approved_at timestamptz not null default now(),
  unique (store_id, approved_date)
);

create index on haccp_corrective_actions (store_id);
create index on haccp_corrective_actions (temperature_record_id);
create index on haccp_corrective_actions (hygiene_record_id);
create index on haccp_daily_approvals (store_id);
create index on haccp_daily_approvals (approved_date);
