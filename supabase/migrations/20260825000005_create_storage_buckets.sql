-- Storage buckets for 受発注 product images (public catalog) and レシピ閲覧 files
-- (private; served via authenticated client / signed URL, per spec's "Drive公開リンク依存は
-- 本番設計へ持ち込まない" and "公開リンクを無制限に生成しない" requirements).

insert into storage.buckets (id, name, public)
values ('recipe-files', 'recipe-files', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "recipe_files_authenticated_read" on storage.objects;
create policy "recipe_files_authenticated_read" on storage.objects
  for select using (bucket_id = 'recipe-files' and auth.role() = 'authenticated');

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "recipe_files_admin_write" on storage.objects;
create policy "recipe_files_admin_write" on storage.objects
  for insert with check (bucket_id = 'recipe-files' and private.is_super_admin());

drop policy if exists "product_images_admin_write" on storage.objects;
create policy "product_images_admin_write" on storage.objects
  for insert with check (bucket_id = 'product-images' and private.is_super_admin());
