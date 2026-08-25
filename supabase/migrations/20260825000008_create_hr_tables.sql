-- 人事労務管理システム: MVP schema per 東洋食品_人事労務管理システム_本番移行実装仕様書_v1.0
--
-- 方針(仕様書4章): 会社・エリア・店舗・社員(persons以外)は複製せず、既存の共通マスター
-- (public.companies/areas/stores/employees)を参照する。hr固有の新規実体のみをここで作成する。
--
-- テーブル名にhr_接頭辞を付ける理由: 仕様書6章は"employee_assignments"という新規テーブルを
-- 定義しているが、これは既存のpublic.employee_assignments(店舗×従業員の在籍期間、
-- HACCP/受発注等のスコープ判定に使用)とは全くの別実体(部署・役職・異動区分の履歴)であり、
-- 同名では衝突する。本来はhr_sensitive(仕様書4-A、マイナンバー)のように専用スキーマへ
-- 分離したいところだが、この環境のSupabase REST APIはpublicスキーマのみ公開されており、
-- 追加スキーマの公開にはダッシュボード/Management API側の設定変更が必要でこの場からは
-- 行えない。そのためpublicスキーマ内でhr_接頭辞により衝突を避ける。
--
-- MVPスコープ: 社員・雇用管理の中核(persons/employments/addresses/assignments)のみ。
-- 契約書・保険・健診・外国人・障害者・有給・労災・住民税・定年再雇用・36協定・退職金・
-- 封筒発送・CSV連携・マイナンバー(hr_sensitive)は、仕様書自身が未確定と明記している事項
-- (4-A.3の暗号化方式未確定、9章の実データ・旧Access資料が未提供)を含む大きな別スコープの
-- ため、本移行では見送る。

create table hr_persons (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  full_name_kana text,
  birth_date date,
  gender_code text,
  identity_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index hr_persons_identity_hash_idx on hr_persons(identity_hash) where identity_hash is not null;

create table hr_employments (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references hr_persons(id),
  employee_id uuid not null references employees(id),
  hired_on date not null,
  retired_on date,
  retirement_reason text,
  employment_category text,
  salary_category text,
  is_rehire boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index hr_employments_person_id_idx on hr_employments(person_id);
create index hr_employments_employee_id_idx on hr_employments(employee_id);

create table hr_employee_addresses (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references hr_persons(id),
  effective_from date not null,
  effective_to date,
  postal_code text,
  address text,
  phone text,
  emergency_contact text,
  created_at timestamptz not null default now()
);

create index hr_employee_addresses_person_id_idx on hr_employee_addresses(person_id, effective_from desc);

-- 仕様書の"employee_assignments"(雇用、店舗・部署・役職、発効期間、異動区分)に相当。
create table hr_assignments (
  id uuid primary key default gen_random_uuid(),
  employment_id uuid not null references hr_employments(id),
  store_id uuid references stores(id),
  department text,
  position text,
  effective_from date not null,
  effective_to date,
  change_type text,
  created_at timestamptz not null default now()
);

create index hr_assignments_employment_id_idx on hr_assignments(employment_id, effective_from desc);
