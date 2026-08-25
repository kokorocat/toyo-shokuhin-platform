-- 店舗責任者(store_manager)以上の権限で、指定店舗に対する責任者確認操作が可能かを判定
create or replace function private.can_confirm_store(p_store_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    private.is_super_admin()
    or exists (
      select 1
      from user_access_scopes uas
      join roles r on r.id = uas.role_id
      join stores s on s.id = p_store_id
      where uas.user_id = auth.uid()
        and (uas.ended_on is null or uas.ended_on >= current_date)
        and (
          (uas.store_id = p_store_id and r.code = 'store_manager')
          or (r.code = 'company_admin' and uas.company_id = s.company_id and uas.area_id is null and uas.store_id is null)
          or (r.code = 'area_admin' and uas.area_id = s.area_id)
        )
    )
$$;

revoke all on function private.can_confirm_store(uuid) from public;
grant execute on function private.can_confirm_store(uuid) to authenticated;

alter table haccp_keypoint_responses enable row level security;
alter table haccp_keypoint_items enable row level security;
alter table haccp_temperature_labels enable row level security;
alter table haccp_employee_responses enable row level security;
alter table haccp_employee_items enable row level security;
alter table haccp_inspections enable row level security;
alter table haccp_inspection_items enable row level security;
alter table store_holidays enable row level security;
alter table manager_confirmations enable row level security;

-- 重要ポイント・温度・ラベル
create policy "haccp_keypoint_responses_select" on haccp_keypoint_responses for select
  using (private.is_super_admin() or store_id in (select private.user_store_ids()));
create policy "haccp_keypoint_responses_insert" on haccp_keypoint_responses for insert
  with check (recorded_by = auth.uid() and store_id in (select private.user_store_ids()));

create policy "haccp_keypoint_items_select" on haccp_keypoint_items for select
  using (exists (
    select 1 from haccp_keypoint_responses r where r.id = response_id
      and (private.is_super_admin() or r.store_id in (select private.user_store_ids()))
  ));
create policy "haccp_keypoint_items_insert" on haccp_keypoint_items for insert
  with check (exists (
    select 1 from haccp_keypoint_responses r where r.id = response_id
      and r.recorded_by = auth.uid() and r.store_id in (select private.user_store_ids())
  ));

create policy "haccp_temperature_labels_select" on haccp_temperature_labels for select
  using (exists (
    select 1 from haccp_keypoint_responses r where r.id = response_id
      and (private.is_super_admin() or r.store_id in (select private.user_store_ids()))
  ));
create policy "haccp_temperature_labels_insert" on haccp_temperature_labels for insert
  with check (exists (
    select 1 from haccp_keypoint_responses r where r.id = response_id
      and r.recorded_by = auth.uid() and r.store_id in (select private.user_store_ids())
  ));

-- 従業員衛生管理
create policy "haccp_employee_responses_select" on haccp_employee_responses for select
  using (private.is_super_admin() or store_id in (select private.user_store_ids()));
create policy "haccp_employee_responses_insert" on haccp_employee_responses for insert
  with check (recorded_by = auth.uid() and store_id in (select private.user_store_ids()));

create policy "haccp_employee_items_select" on haccp_employee_items for select
  using (exists (
    select 1 from haccp_employee_responses r where r.id = response_id
      and (private.is_super_admin() or r.store_id in (select private.user_store_ids()))
  ));
create policy "haccp_employee_items_insert" on haccp_employee_items for insert
  with check (exists (
    select 1 from haccp_employee_responses r where r.id = response_id
      and r.recorded_by = auth.uid() and r.store_id in (select private.user_store_ids())
  ));

-- 食品衛生自主点検
create policy "haccp_inspections_select" on haccp_inspections for select
  using (private.is_super_admin() or store_id in (select private.user_store_ids()));
create policy "haccp_inspections_insert" on haccp_inspections for insert
  with check (recorded_by = auth.uid() and store_id in (select private.user_store_ids()));

create policy "haccp_inspection_items_select" on haccp_inspection_items for select
  using (exists (
    select 1 from haccp_inspections i where i.id = inspection_id
      and (private.is_super_admin() or i.store_id in (select private.user_store_ids()))
  ));
create policy "haccp_inspection_items_insert" on haccp_inspection_items for insert
  with check (exists (
    select 1 from haccp_inspections i where i.id = inspection_id
      and i.recorded_by = auth.uid() and i.store_id in (select private.user_store_ids())
  ));

-- 店休日
create policy "store_holidays_select" on store_holidays for select
  using (private.is_super_admin() or store_id in (select private.user_store_ids()));
create policy "store_holidays_insert" on store_holidays for insert
  with check (registered_by = auth.uid() and store_id in (select private.user_store_ids()));

-- 責任者確認: 登録はstore_manager以上のみ
create policy "manager_confirmations_select" on manager_confirmations for select
  using (private.is_super_admin() or store_id in (select private.user_store_ids()));
create policy "manager_confirmations_insert" on manager_confirmations for insert
  with check (
    confirmed_by = auth.uid()
    and store_id in (select private.user_store_ids())
    and private.can_confirm_store(store_id)
  );
