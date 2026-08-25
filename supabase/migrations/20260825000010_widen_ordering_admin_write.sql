-- 商品管理・受注管理(OM-30/OM-10)は当初super_admin限定だったが、
-- HACCP/人事労務と同様に会社管理者にも管理者権限を暫定的に許可する。

create or replace function private.is_ordering_admin()
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

drop policy if exists "products_write" on products;
create policy "products_write" on products
  for all using (private.is_ordering_admin()) with check (private.is_ordering_admin());

drop policy if exists "product_categories_write" on product_categories;
create policy "product_categories_write" on product_categories
  for all using (private.is_ordering_admin()) with check (private.is_ordering_admin());

drop policy if exists "product_images_write" on product_images;
create policy "product_images_write" on product_images
  for all using (private.is_ordering_admin()) with check (private.is_ordering_admin());

drop policy if exists "orders_update" on orders;
create policy "orders_update" on orders
  for update using (
    private.is_ordering_admin() or store_id in (select private.user_store_ids())
  );

drop policy if exists "order_status_histories_insert" on order_status_histories;
create policy "order_status_histories_insert" on order_status_histories
  for insert with check (
    exists (
      select 1 from orders o
      where o.id = order_status_histories.order_id
        and (private.is_ordering_admin() or o.store_id in (select private.user_store_ids()))
    )
  );
