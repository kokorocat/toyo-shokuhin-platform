-- 20260826000005でarea_adminにレシピ管理画面(/recipe/admin/submit)への到達を許可したが、
-- 実際のファイルアップロード先であるstorage.objectsの"recipe_files_admin_write"ポリシーは
-- private.is_recipe_admin()(会社非依存、company_admin/super_adminのみ)のまま残っていた
-- (20260826000001で既知の課題として明記・先送りされていたもの)。このままではarea_adminが
-- レシピ行(recipes/recipe_versions)の作成には成功する一方、原本ファイルのアップロードだけが
-- RLSで拒否され、UIは成功画面を表示するのに実際にはファイルが保存されない状態になる
-- (src/app/recipe/admin/submit/actions.tsのsubmitRecipeはアップロード失敗を握りつぶし
-- console.errorのみで登録自体は継続する既知の仕様のため、症状が目に見えにくい)。
--
-- アップロード先パスの先頭セグメントにcompany_idを含める形にsubmitRecipe側を修正済み
-- (例: "{companyId}/submissions/{recipeCode}-{timestamp}.{ext}")。これに合わせ、ポリシーも
-- パス先頭のcompany_idを private.is_recipe_admin_for_company() に渡す形へ変更する。
-- 旧パス("submissions/...", 会社フォルダなし)で既に保存済みのファイルは対象外(このポリシーは
-- 新規INSERTのみに影響し、既存オブジェクトの閲覧(recipe_files_select, auth.role()='authenticated'
-- のみで会社非依存)には影響しない)。
drop policy if exists "recipe_files_admin_write" on storage.objects;
create policy "recipe_files_admin_write" on storage.objects
  for insert with check (
    bucket_id = 'recipe-files'
    and private.is_recipe_admin_for_company(((storage.foldername(name))[1])::uuid)
  );
