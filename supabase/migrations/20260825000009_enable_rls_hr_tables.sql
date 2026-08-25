-- 人事労務管理システムRLS(MVPスコープ)。仕様書2章は9ロール・6段階スコープを定義しているが、
-- 既存の共通ロールモデル(super_admin/company_admin/area_admin/store_manager/store_user)には
-- 人事責任者等に相当するロールがまだ存在しないため、MVPでは暫定的にcompany_admin/super_adminの
-- みアクセス可能とする(店舗責任者・店舗閲覧向けの自店舗限定参照や、9ロールの権限マトリクスは
-- 未実装であることを明示的な制約として残す)。3社分離は仕様書必須要件のため、company_adminは
-- 自社データのみに制限する。

create or replace function private.is_hr_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from user_access_scopes uas
    join roles r on r.id = uas.role_id
    where uas.user_id = auth.uid()
      and r.code in ('company_admin', 'super_admin')
      and (uas.ended_on is null or uas.ended_on >= current_date)
  )
$$;

alter table hr_persons enable row level security;
create policy hr_persons_select on hr_persons
  for select using (
    private.is_super_admin() or exists (
      select 1 from hr_employments em
      join employees e on e.id = em.employee_id
      where em.person_id = hr_persons.id
        and e.company_id in (select private.user_company_ids())
    )
  );
create policy hr_persons_write on hr_persons
  for all using (private.is_hr_admin()) with check (private.is_hr_admin());

alter table hr_employments enable row level security;
create policy hr_employments_select on hr_employments
  for select using (
    private.is_super_admin() or exists (
      select 1 from employees e
      where e.id = hr_employments.employee_id
        and e.company_id in (select private.user_company_ids())
    )
  );
create policy hr_employments_write on hr_employments
  for all using (private.is_hr_admin()) with check (private.is_hr_admin());

alter table hr_employee_addresses enable row level security;
create policy hr_employee_addresses_select on hr_employee_addresses
  for select using (
    private.is_super_admin() or exists (
      select 1 from hr_employments em
      join employees e on e.id = em.employee_id
      where em.person_id = hr_employee_addresses.person_id
        and e.company_id in (select private.user_company_ids())
    )
  );
create policy hr_employee_addresses_write on hr_employee_addresses
  for all using (private.is_hr_admin()) with check (private.is_hr_admin());

alter table hr_assignments enable row level security;
create policy hr_assignments_select on hr_assignments
  for select using (
    private.is_super_admin() or exists (
      select 1 from hr_employments em
      join employees e on e.id = em.employee_id
      where em.id = hr_assignments.employment_id
        and e.company_id in (select private.user_company_ids())
    )
  );
create policy hr_assignments_write on hr_assignments
  for all using (private.is_hr_admin()) with check (private.is_hr_admin());
