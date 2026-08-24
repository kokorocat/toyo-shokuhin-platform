alter table haccp_corrective_actions enable row level security;
alter table haccp_daily_approvals enable row level security;

create policy "haccp_corrective_actions_select" on haccp_corrective_actions for select
  using (private.is_super_admin() or store_id in (select private.user_store_ids()));

create policy "haccp_corrective_actions_insert" on haccp_corrective_actions for insert
  with check (
    created_by = auth.uid()
    and store_id in (select private.user_store_ids())
    and (
      (temperature_record_id is not null and exists (
        select 1 from haccp_temperature_records r
        where r.id = temperature_record_id and r.store_id = haccp_corrective_actions.store_id
      ))
      or (hygiene_record_id is not null and exists (
        select 1 from haccp_hygiene_records r
        where r.id = hygiene_record_id and r.store_id = haccp_corrective_actions.store_id
      ))
    )
  );

create policy "haccp_daily_approvals_select" on haccp_daily_approvals for select
  using (private.is_super_admin() or store_id in (select private.user_store_ids()));

create policy "haccp_daily_approvals_insert" on haccp_daily_approvals for insert
  with check (
    approved_by = auth.uid()
    and store_id in (select private.user_store_ids())
  );
