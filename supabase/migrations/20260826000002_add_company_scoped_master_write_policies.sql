-- 店舗・従業員マスター管理機能の追加(1/2): 会社スコープの書き込みポリシー。
--
-- companies/blocks/areas/stores/employees/employee_assignments はこれまでSELECTポリシーのみで、
-- INSERT/UPDATE/DELETEの経路が一つも存在しなかった(README「未実装(次のフェーズ)」の記載どおり)。
-- private.can_confirm_store()(20260825000003)と同じ「対象行の会社IDを引数に取るパラメータ化
-- ヘルパー」方式で、company_adminは自社データのみ、super_adminは無制限に書き込めるようにする。
--
-- companiesのみ super_admin 限定とする: 新規テナント作成にはまだ紐づくuser_access_scopesが
-- 存在しないため、company_adminがこれを通過する会社スコープチェックはそもそも成立しない。
--
-- DELETEは意図的に許可しない(INSERT/UPDATEのみ)。既存の慣例(products等、業務エンティティは
-- status列によるソフト削除のみでハード削除は行わない)に合わせ、companies/stores/employees等は
-- 既存のstatus列(active/inactive等)をトグルする形で運用する。

create or replace function private.is_company_admin_for(p_company_id uuid)
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

revoke all on function private.is_company_admin_for(uuid) from public;
grant execute on function private.is_company_admin_for(uuid) to authenticated;

-- companies: super_adminのみ
create policy "companies_insert" on companies
  for insert with check (private.is_super_admin());
create policy "companies_update" on companies
  for update using (private.is_super_admin()) with check (private.is_super_admin());

-- blocks: 自社に限定されたcompany_admin + 無制限のsuper_admin
create policy "blocks_insert" on blocks
  for insert with check (private.is_company_admin_for(company_id));
create policy "blocks_update" on blocks
  for update using (private.is_company_admin_for(company_id)) with check (private.is_company_admin_for(company_id));

-- areas: 自社に限定されたcompany_admin + 無制限のsuper_admin。block_idを指定する場合は、
-- そのブロックが同じ会社に属することも検証する(会社をまたいだ親子関係の混入を防ぐ)。
create policy "areas_insert" on areas
  for insert with check (
    private.is_company_admin_for(company_id)
    and (block_id is null or exists (select 1 from blocks b where b.id = block_id and b.company_id = areas.company_id))
  );
create policy "areas_update" on areas
  for update
  using (private.is_company_admin_for(company_id))
  with check (
    private.is_company_admin_for(company_id)
    and (block_id is null or exists (select 1 from blocks b where b.id = block_id and b.company_id = areas.company_id))
  );

-- stores: 同様にarea_idが同じ会社に属することも検証する。
create policy "stores_insert" on stores
  for insert with check (
    private.is_company_admin_for(company_id)
    and (area_id is null or exists (select 1 from areas a where a.id = area_id and a.company_id = stores.company_id))
  );
create policy "stores_update" on stores
  for update
  using (private.is_company_admin_for(company_id))
  with check (
    private.is_company_admin_for(company_id)
    and (area_id is null or exists (select 1 from areas a where a.id = area_id and a.company_id = stores.company_id))
  );

-- employees: 自社に限定されたcompany_admin + 無制限のsuper_admin
create policy "employees_insert" on employees
  for insert with check (private.is_company_admin_for(company_id));
create policy "employees_update" on employees
  for update using (private.is_company_admin_for(company_id)) with check (private.is_company_admin_for(company_id));

-- employee_assignments: employees/storesを経由して会社を解決する(employee_id/store_idが
-- 異なる会社を指す誤操作を防ぐため、両者が同一会社であることも合わせて検証する)。
-- 履歴テーブルとして追記のみが想定される(既存の「上書きしない」規約)が、直近の割当を終了させる
-- ためのUPDATE(ended_onの設定)も同じスコープ判定でよい。
create policy "employee_assignments_insert" on employee_assignments
  for insert with check (
    exists (
      select 1 from employees e
      join stores s on s.id = employee_assignments.store_id
      where e.id = employee_assignments.employee_id
        and s.company_id = e.company_id
        and private.is_company_admin_for(e.company_id)
    )
  );
create policy "employee_assignments_update" on employee_assignments
  for update
  using (
    exists (
      select 1 from employees e
      where e.id = employee_assignments.employee_id
        and private.is_company_admin_for(e.company_id)
    )
  )
  with check (
    exists (
      select 1 from employees e
      join stores s on s.id = employee_assignments.store_id
      where e.id = employee_assignments.employee_id
        and s.company_id = e.company_id
        and private.is_company_admin_for(e.company_id)
    )
  );

-- roles: 意図的に書き込みポリシーを追加しない。6ロールは固定の初期投入データであり、
-- 新ロールの追加はマスター管理の範疇を超えるスキーマ変更として扱う。
