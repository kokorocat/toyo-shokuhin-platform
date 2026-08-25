-- 東洋食品HACCP管理システム 本番移行実装仕様書 v1.0 に基づく正式スキーマ。
-- 3帳票(重要ポイント・温度・ラベル/従業員衛生管理/食品衛生自主点検)を分離して実装する。

-- ============================================================
-- 1. 重要ポイント・温度・ラベル(日次、店舗ごとに1回以上)
-- ============================================================
create table haccp_keypoint_responses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  store_id uuid not null references stores(id),
  target_date date not null,
  version int not null default 1,
  recorded_by uuid not null references user_profiles(id),
  created_at timestamptz not null default now()
);

-- 重要ポイント6項目(加熱/非加熱×常温/冷蔵、混合2種)。全店舗共通の固定項目のため
-- item_codeをcheck制約で固定する(店舗ごとのマスターテーブルは持たない)
create table haccp_keypoint_items (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references haccp_keypoint_responses(id) on delete cascade,
  item_code text not null check (item_code in (
    'heat_room', 'heat_cold', 'nonheat_room', 'nonheat_cold', 'mixed_room', 'mixed_cold'
  )),
  checked boolean not null default false,
  note text,
  unique (response_id, item_code)
);

-- 温度・ラベルチェック(1回答につき複数件。区分・測定値・判定・備考の正確な入力欄は
-- 仕様書内「要確認事項No.1」により未確定のため、暫定的に汎用構造で実装)
create table haccp_temperature_labels (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references haccp_keypoint_responses(id) on delete cascade,
  label_type text not null check (label_type in ('temperature', 'label')),
  measured_value numeric,
  judgment text check (judgment in ('ok', 'ng')),
  note text
);

-- ============================================================
-- 2. 従業員衛生管理(日次、営業日・従業員ごと)
-- ============================================================
create table haccp_employee_responses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  store_id uuid not null references stores(id),
  target_date date not null,
  employee_id uuid references employees(id),
  manual_employee_code text,
  manual_name text,
  is_unmatched boolean not null default false,
  version int not null default 1,
  recorded_by uuid not null references user_profiles(id),
  created_at timestamptz not null default now(),
  check (employee_id is not null or manual_name is not null)
);

-- 従業員衛生8項目(全店舗共通の固定項目)
create table haccp_employee_items (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references haccp_employee_responses(id) on delete cascade,
  item_code text not null check (item_code in (
    'handwash', 'clean_uniform', 'proper_cap', 'nails',
    'no_accessory', 'skin_injury', 'stomach_symptom', 'body_temp'
  )),
  answer text not null check (answer in ('good', 'bad')),
  note text,
  action_taken text,
  unique (response_id, item_code)
);

-- ============================================================
-- 3. 食品衛生自主点検(月次、店舗ごとに1回)
-- ============================================================
create table haccp_inspections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  store_id uuid not null references stores(id),
  target_month date not null,
  store_manager_name text,
  hygiene_officer_name text,
  implementer_name text not null,
  submitted_on date not null default current_date,
  overall_evaluation text not null check (overall_evaluation in ('good', 'needs_improvement')),
  improvement_reason text,
  version int not null default 1,
  recorded_by uuid not null references user_profiles(id),
  created_at timestamptz not null default now(),
  check (extract(day from target_month) = 1)
);

-- 自主点検17問(原紙準拠。仕様書に問題文の記載がなく、旧GAS原紙も未提供のため、
-- 一般的な食品衛生自主点検の構成に基づく暫定の17問で実装。正式な問題文は別途確認要)
create table haccp_inspection_items (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references haccp_inspections(id) on delete cascade,
  question_code text not null check (question_code ~ '^q(1[0-7]|[1-9])$'),
  answer text not null check (answer in ('good', 'needs_improvement')),
  reason text,
  action_taken text,
  unique (inspection_id, question_code)
);

-- ============================================================
-- 4. 店休日
-- ============================================================
create table store_holidays (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  store_id uuid not null references stores(id),
  holiday_date date not null,
  reason text,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  registered_by uuid not null references user_profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 5. 責任者確認(半月・月次)
-- ============================================================
create table manager_confirmations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  store_id uuid not null references stores(id),
  period_type text not null check (period_type in ('half_month', 'monthly')),
  period_start date not null,
  period_end date not null,
  confirmed_by uuid not null references user_profiles(id),
  confirmed_on date not null default current_date,
  comment text,
  status text not null default 'confirmed' check (status in ('confirmed', 'needs_action')),
  version int not null default 1,
  created_at timestamptz not null default now()
);

create index on haccp_keypoint_responses (store_id, target_date);
create index on haccp_keypoint_items (response_id);
create index on haccp_temperature_labels (response_id);
create index on haccp_employee_responses (store_id, target_date);
create index on haccp_employee_responses (employee_id);
create index on haccp_employee_items (response_id);
create index on haccp_inspections (store_id, target_month);
create index on haccp_inspection_items (inspection_id);
create index on store_holidays (store_id, holiday_date);
create index on manager_confirmations (store_id, period_type, period_start);
