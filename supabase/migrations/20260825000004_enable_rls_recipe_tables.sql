-- レシピ閲覧システム RLS. Recipes are scoped to the viewer's company (and area, when set
-- on the recipe), reusing the existing private.user_company_ids()/is_super_admin() helpers.
-- URL/ID tampering cannot surface a recipe outside the caller's assigned scope.

alter table recipes enable row level security;
create policy recipes_select on recipes
  for select using (
    private.is_super_admin() or company_id in (select private.user_company_ids())
  );

alter table recipe_versions enable row level security;
create policy recipe_versions_select on recipe_versions
  for select using (
    exists (
      select 1 from recipes r
      where r.id = recipe_versions.recipe_id
        and (private.is_super_admin() or r.company_id in (select private.user_company_ids()))
    )
  );

alter table recipe_files enable row level security;
create policy recipe_files_select on recipe_files
  for select using (
    exists (
      select 1 from recipes r
      where r.id = recipe_files.recipe_id
        and (private.is_super_admin() or r.company_id in (select private.user_company_ids()))
    )
  );

alter table recipe_related_products enable row level security;
create policy recipe_related_products_select on recipe_related_products
  for select using (
    exists (
      select 1 from recipes r
      where r.id = recipe_related_products.recipe_id
        and (private.is_super_admin() or r.company_id in (select private.user_company_ids()))
    )
  );

alter table recipe_view_logs enable row level security;
create policy recipe_view_logs_insert on recipe_view_logs
  for insert with check (user_id = auth.uid());
create policy recipe_view_logs_select on recipe_view_logs
  for select using (private.is_super_admin());

alter table recipe_search_logs enable row level security;
create policy recipe_search_logs_insert on recipe_search_logs
  for insert with check (user_id = auth.uid());
create policy recipe_search_logs_select on recipe_search_logs
  for select using (private.is_super_admin());
