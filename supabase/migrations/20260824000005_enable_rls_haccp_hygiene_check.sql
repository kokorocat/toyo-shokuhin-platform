alter table haccp_hygiene_items enable row level security;
alter table haccp_hygiene_records enable row level security;

create policy "haccp_hygiene_items_select" on haccp_hygiene_items for select
  using (private.is_super_admin() or store_id in (select private.user_store_ids()));

create policy "haccp_hygiene_records_select" on haccp_hygiene_records for select
  using (private.is_super_admin() or store_id in (select private.user_store_ids()));

create policy "haccp_hygiene_records_insert" on haccp_hygiene_records for insert
  with check (
    checked_by = auth.uid()
    and store_id in (select private.user_store_ids())
    and exists (
      select 1 from haccp_hygiene_items hi
      where hi.id = item_id and hi.store_id = haccp_hygiene_records.store_id
    )
  );
