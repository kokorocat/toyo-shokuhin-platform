-- private.is_hr_admin() / private.is_ordering_admin() / private.is_recipe_admin() はロールコードのみを
-- 検証しており、会社IDの比較を一切行っていない。20260825000009の移行コメントは
-- 「3社分離は仕様書必須要件のため、company_adminは自社データのみに制限する」と明記しているが、
-- 実装(is_hr_admin等をそのままfor allのusing/with checkに使う書き込みポリシー)はそれを満たしていない。
-- 現状、Company Aのcompany_adminがCompany B/CのHR個人情報・レシピ・受注データを、RLSを唯一の境界とする
-- Supabase API経由で直接書き換え・削除できる(アプリのUIが見せないことは防御にならない)。
--
-- private.can_confirm_store()(20260825000003)と同じ「対象行のcompany_idを引数に取るパラメータ化
-- ヘルパー」方式に倣い、書き込みポリシーが対象行の会社と呼び出し元の会社を実際に比較するよう修正する。
-- 既存の private.is_hr_admin() / is_ordering_admin() / is_recipe_admin() 自体は、会社非依存の共有カタログ
-- (products/product_categories/product_images)およびhr_persons新規作成(挿入時点では会社を紐づける
-- 手がかりがまだ存在しないため越境の余地がない)に限り、そのまま使い続ける。

-- ============================================================
-- 受発注: orders / order_status_histories
-- ============================================================

create or replace function private.is_ordering_admin_for_company(p_company_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select private.is_super_admin() or exists (
    select 1
    from user_access_scopes uas
    join roles r on r.id = uas.role_id
    where uas.user_id = auth.uid()
      and r.code = 'company_admin'
      and uas.company_id = p_company_id
      and uas.area_id is null
      and uas.store_id is null
      and (uas.ended_on is null or uas.ended_on >= current_date)
  )
$$;

revoke all on function private.is_ordering_admin_for_company(uuid) from public;
grant execute on function private.is_ordering_admin_for_company(uuid) to authenticated;

drop policy if exists "orders_update" on orders;
create policy "orders_update" on orders
  for update using (
    private.is_ordering_admin_for_company(company_id) or store_id in (select private.user_store_ids())
  );

drop policy if exists "order_status_histories_insert" on order_status_histories;
create policy "order_status_histories_insert" on order_status_histories
  for insert with check (
    exists (
      select 1 from orders o
      where o.id = order_status_histories.order_id
        and (private.is_ordering_admin_for_company(o.company_id) or o.store_id in (select private.user_store_ids()))
    )
  );

-- products / product_categories / product_images は会社非依存の共有カタログ(company_id列を持たない)
-- のため、private.is_ordering_admin() の既存ポリシーはそのまま変更しない。

-- ============================================================
-- レシピ閲覧: recipes / recipe_versions / recipe_files / recipe_related_products
-- ============================================================

create or replace function private.is_recipe_admin_for_company(p_company_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select private.is_super_admin() or exists (
    select 1
    from user_access_scopes uas
    join roles r on r.id = uas.role_id
    where uas.user_id = auth.uid()
      and r.code = 'company_admin'
      and uas.company_id = p_company_id
      and uas.area_id is null
      and uas.store_id is null
      and (uas.ended_on is null or uas.ended_on >= current_date)
  )
$$;

revoke all on function private.is_recipe_admin_for_company(uuid) from public;
grant execute on function private.is_recipe_admin_for_company(uuid) to authenticated;

drop policy if exists "recipes_write" on recipes;
create policy "recipes_write" on recipes
  for all
  using (private.is_recipe_admin_for_company(company_id))
  with check (private.is_recipe_admin_for_company(company_id));

drop policy if exists "recipe_versions_write" on recipe_versions;
create policy "recipe_versions_write" on recipe_versions
  for all
  using (exists (select 1 from recipes r where r.id = recipe_versions.recipe_id and private.is_recipe_admin_for_company(r.company_id)))
  with check (exists (select 1 from recipes r where r.id = recipe_versions.recipe_id and private.is_recipe_admin_for_company(r.company_id)));

drop policy if exists "recipe_files_write" on recipe_files;
create policy "recipe_files_write" on recipe_files
  for all
  using (exists (select 1 from recipes r where r.id = recipe_files.recipe_id and private.is_recipe_admin_for_company(r.company_id)))
  with check (exists (select 1 from recipes r where r.id = recipe_files.recipe_id and private.is_recipe_admin_for_company(r.company_id)));

drop policy if exists "recipe_related_products_write" on recipe_related_products;
create policy "recipe_related_products_write" on recipe_related_products
  for all
  using (exists (select 1 from recipes r where r.id = recipe_related_products.recipe_id and private.is_recipe_admin_for_company(r.company_id)))
  with check (exists (select 1 from recipes r where r.id = recipe_related_products.recipe_id and private.is_recipe_admin_for_company(r.company_id)));

-- 注: storage.objects の "recipe_files_admin_write"(recipe-filesバケットへのアップロード許可)は
-- private.is_recipe_admin() の会社非依存チェックのまま残っている。ストレージパスと recipe_id/company_id
-- の対応関係がこの調査だけでは確認しきれなかったため、今回は対象外とし、別途確認のうえ追って対応する。

-- ============================================================
-- 人事労務: hr_persons / hr_employments / hr_employee_addresses / hr_assignments
-- ============================================================

create or replace function private.is_hr_admin_for_employee(p_employee_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select private.is_super_admin() or exists (
    select 1
    from employees e
    join user_access_scopes uas on uas.company_id = e.company_id
    join roles r on r.id = uas.role_id
    where e.id = p_employee_id
      and uas.user_id = auth.uid()
      and r.code = 'company_admin'
      and uas.area_id is null
      and uas.store_id is null
      and (uas.ended_on is null or uas.ended_on >= current_date)
  )
$$;

revoke all on function private.is_hr_admin_for_employee(uuid) from public;
grant execute on function private.is_hr_admin_for_employee(uuid) to authenticated;

drop policy if exists hr_employments_write on hr_employments;
create policy hr_employments_write on hr_employments
  for all
  using (private.is_hr_admin_for_employee(employee_id))
  with check (private.is_hr_admin_for_employee(employee_id));

drop policy if exists hr_assignments_write on hr_assignments;
create policy hr_assignments_write on hr_assignments
  for all
  using (exists (select 1 from hr_employments em where em.id = hr_assignments.employment_id and private.is_hr_admin_for_employee(em.employee_id)))
  with check (exists (select 1 from hr_employments em where em.id = hr_assignments.employment_id and private.is_hr_admin_for_employee(em.employee_id)));

drop policy if exists hr_employee_addresses_write on hr_employee_addresses;
create policy hr_employee_addresses_write on hr_employee_addresses
  for all
  using (exists (select 1 from hr_employments em where em.person_id = hr_employee_addresses.person_id and private.is_hr_admin_for_employee(em.employee_id)))
  with check (exists (select 1 from hr_employments em where em.person_id = hr_employee_addresses.person_id and private.is_hr_admin_for_employee(em.employee_id)));

-- hr_persons: 新規作成時点ではまだ hr_employments が存在せず会社と紐づけられないため、insertのみ
-- 既存の private.is_hr_admin()(ロールのみのチェック)を維持する。update/deleteは対象personに紐づく
-- 既存employmentの会社スコープで判定する。
drop policy if exists hr_persons_write on hr_persons;

create policy hr_persons_insert on hr_persons
  for insert
  with check (private.is_hr_admin());

create policy hr_persons_update on hr_persons
  for update
  using (exists (select 1 from hr_employments em where em.person_id = hr_persons.id and private.is_hr_admin_for_employee(em.employee_id)))
  with check (exists (select 1 from hr_employments em where em.person_id = hr_persons.id and private.is_hr_admin_for_employee(em.employee_id)));

create policy hr_persons_delete on hr_persons
  for delete
  using (exists (select 1 from hr_employments em where em.person_id = hr_persons.id and private.is_hr_admin_for_employee(em.employee_id)));
