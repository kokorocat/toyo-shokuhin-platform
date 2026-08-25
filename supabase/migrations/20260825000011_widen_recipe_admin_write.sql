-- レシピ新規申請(RV-30)・承認(RV-50)のMVP実装のためのRLS拡張。
-- 仕様書の申請・承認は本来 applications/application_files 等の別テーブル・複数ファイル単位の
-- 判定・状態遷移を持つ大きなワークフローだが、今回のMVPでは既存のrecipes.status
-- ('draft'='承認待ち'相当 / 'published'='公開済み')を軽量な承認ゲートとして再利用する
-- (新規テーブルを増やさず、既存スキーマで申請→承認→公開の最小フローを成立させる)。

create or replace function private.is_recipe_admin()
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

drop policy if exists "recipes_write" on recipes;
create policy "recipes_write" on recipes
  for all using (private.is_recipe_admin()) with check (private.is_recipe_admin());

drop policy if exists "recipe_versions_write" on recipe_versions;
create policy "recipe_versions_write" on recipe_versions
  for all using (private.is_recipe_admin()) with check (private.is_recipe_admin());

drop policy if exists "recipe_files_write" on recipe_files;
create policy "recipe_files_write" on recipe_files
  for all using (private.is_recipe_admin()) with check (private.is_recipe_admin());

drop policy if exists "recipe_related_products_write" on recipe_related_products;
create policy "recipe_related_products_write" on recipe_related_products
  for all using (private.is_recipe_admin()) with check (private.is_recipe_admin());

drop policy if exists "recipe_files_admin_write" on storage.objects;
create policy "recipe_files_admin_write" on storage.objects
  for insert with check (bucket_id = 'recipe-files' and private.is_recipe_admin());
