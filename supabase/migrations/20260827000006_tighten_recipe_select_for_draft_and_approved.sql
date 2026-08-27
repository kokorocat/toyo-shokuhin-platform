-- recipes_select等に、承認待ち/承認済み(未公開)を関係者以外へ見せないための絞り込みを追加する。
-- 現状のrecipes_selectは会社スコープのみでstatusを一切見ておらず、同一会社の一般利用者
-- (店舗ユーザー等)がID直指定/API直叩きでdraft・rejection_note・新設のapproved状態を
-- 閲覧できてしまう(申請者/承認者向けにまだ非公開であるべき情報)。recipe_versions/
-- recipe_files/recipe_related_productsはrecipesへのSELECTポリシーを内側から評価するのではなく
-- 同条件を都度直接複製する既存の実装スタイルのため、3つとも同様に直す(recipes_selectだけを
-- 絞ってもこの3つ経由で同じ情報が漏れたままになるため)。

drop policy if exists "recipes_select" on recipes;
create policy "recipes_select" on recipes
  for select using (
    (status = 'published' and company_id in (select private.user_company_ids()))
    or private.is_recipe_admin_for_company(company_id)
  );

drop policy if exists "recipe_versions_select" on recipe_versions;
create policy "recipe_versions_select" on recipe_versions
  for select using (
    exists (
      select 1 from recipes r
      where r.id = recipe_versions.recipe_id
        and (
          (r.status = 'published' and r.company_id in (select private.user_company_ids()))
          or private.is_recipe_admin_for_company(r.company_id)
        )
    )
  );

drop policy if exists "recipe_files_select" on recipe_files;
create policy "recipe_files_select" on recipe_files
  for select using (
    exists (
      select 1 from recipes r
      where r.id = recipe_files.recipe_id
        and (
          (r.status = 'published' and r.company_id in (select private.user_company_ids()))
          or private.is_recipe_admin_for_company(r.company_id)
        )
    )
  );

drop policy if exists "recipe_related_products_select" on recipe_related_products;
create policy "recipe_related_products_select" on recipe_related_products
  for select using (
    exists (
      select 1 from recipes r
      where r.id = recipe_related_products.recipe_id
        and (
          (r.status = 'published' and r.company_id in (select private.user_company_ids()))
          or private.is_recipe_admin_for_company(r.company_id)
        )
    )
  );
