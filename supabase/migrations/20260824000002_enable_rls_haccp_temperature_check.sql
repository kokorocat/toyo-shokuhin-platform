alter table haccp_check_points enable row level security;
alter table haccp_temperature_records enable row level security;

create policy "haccp_check_points_select" on haccp_check_points for select
  using (private.is_super_admin() or store_id in (select private.user_store_ids()));

create policy "haccp_temperature_records_select" on haccp_temperature_records for select
  using (private.is_super_admin() or store_id in (select private.user_store_ids()));

-- 記録の登録は自店舗分・本人名義のみ。check_pointがその店舗のものであることも確認
create policy "haccp_temperature_records_insert" on haccp_temperature_records for insert
  with check (
    recorded_by = auth.uid()
    and store_id in (select private.user_store_ids())
    and exists (
      select 1 from haccp_check_points cp
      where cp.id = check_point_id and cp.store_id = haccp_temperature_records.store_id
    )
  );
