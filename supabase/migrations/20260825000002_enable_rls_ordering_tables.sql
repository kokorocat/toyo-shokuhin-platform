-- 販促物受発注システム RLS. Catalog tables are readable to any authenticated portal user
-- (public commerce-style listing); order data is scoped to the ordering store/company,
-- reusing the existing private.user_store_ids()/user_company_ids()/is_super_admin() helpers.

alter table product_categories enable row level security;
create policy product_categories_select on product_categories
  for select using (auth.role() = 'authenticated');

alter table seal_sizes enable row level security;
create policy seal_sizes_select on seal_sizes
  for select using (auth.role() = 'authenticated');

alter table products enable row level security;
create policy products_select on products
  for select using (auth.role() = 'authenticated');
create policy products_write on products
  for all using (private.is_super_admin()) with check (private.is_super_admin());

alter table product_images enable row level security;
create policy product_images_select on product_images
  for select using (auth.role() = 'authenticated');
create policy product_images_write on product_images
  for all using (private.is_super_admin()) with check (private.is_super_admin());

alter table bulk_orders enable row level security;
create policy bulk_orders_select on bulk_orders
  for select using (
    private.is_super_admin() or company_id in (select private.user_company_ids())
  );
create policy bulk_orders_insert on bulk_orders
  for insert with check (
    private.is_super_admin() or company_id in (select private.user_company_ids())
  );

alter table orders enable row level security;
create policy orders_select on orders
  for select using (
    private.is_super_admin() or store_id in (select private.user_store_ids())
  );
create policy orders_insert on orders
  for insert with check (
    private.is_super_admin() or store_id in (select private.user_store_ids())
  );
create policy orders_update on orders
  for update using (private.is_super_admin());

alter table order_lines enable row level security;
create policy order_lines_select on order_lines
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_lines.order_id
        and (private.is_super_admin() or o.store_id in (select private.user_store_ids()))
    )
  );
create policy order_lines_insert on order_lines
  for insert with check (
    exists (
      select 1 from orders o
      where o.id = order_lines.order_id
        and (private.is_super_admin() or o.store_id in (select private.user_store_ids()))
    )
  );

alter table order_status_histories enable row level security;
create policy order_status_histories_select on order_status_histories
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_status_histories.order_id
        and (private.is_super_admin() or o.store_id in (select private.user_store_ids()))
    )
  );
create policy order_status_histories_insert on order_status_histories
  for insert with check (
    exists (
      select 1 from orders o
      where o.id = order_status_histories.order_id
        and (private.is_super_admin() or o.store_id in (select private.user_store_ids()))
    )
  );
