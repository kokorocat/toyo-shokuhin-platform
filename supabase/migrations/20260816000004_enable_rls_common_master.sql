alter table companies enable row level security;
alter table blocks enable row level security;
alter table areas enable row level security;
alter table stores enable row level security;
alter table employees enable row level security;
alter table employee_assignments enable row level security;
alter table user_profiles enable row level security;
alter table roles enable row level security;
alter table system_applications enable row level security;
alter table user_access_scopes enable row level security;
alter table audit_logs enable row level security;

-- companies: 自分がアクセスできる会社のみ。super_adminは全社
create policy "companies_select" on companies for select
  using (private.is_super_admin() or id in (select private.user_company_ids()));

-- blocks/areas/stores: company_idで分離
create policy "blocks_select" on blocks for select
  using (private.is_super_admin() or company_id in (select private.user_company_ids()));

create policy "areas_select" on areas for select
  using (private.is_super_admin() or company_id in (select private.user_company_ids()));

create policy "stores_select" on stores for select
  using (private.is_super_admin() or id in (select private.user_store_ids()));

-- employees: 会社単位で分離(店舗単位の絞り込みは各システムのビュー/APIで追加実施)
create policy "employees_select" on employees for select
  using (private.is_super_admin() or company_id in (select private.user_company_ids()));

create policy "employee_assignments_select" on employee_assignments for select
  using (
    private.is_super_admin()
    or store_id in (select private.user_store_ids())
  );

-- user_profiles: 本人 or super_admin のみ参照可(会社をまたぐ人事情報のため厳しめ)
create policy "user_profiles_select_self" on user_profiles for select
  using (id = auth.uid() or private.is_super_admin());

-- roles/system_applications: 認証済みユーザーなら参照可(マスターデータ)
create policy "roles_select" on roles for select
  using (auth.role() = 'authenticated');

create policy "system_applications_select" on system_applications for select
  using (auth.role() = 'authenticated');

-- user_access_scopes: 本人の割当 or super_admin
create policy "user_access_scopes_select_self" on user_access_scopes for select
  using (user_id = auth.uid() or private.is_super_admin());

-- audit_logs: super_adminのみ参照可(閲覧自体も監査対象とする運用)
create policy "audit_logs_select_admin" on audit_logs for select
  using (private.is_super_admin());
