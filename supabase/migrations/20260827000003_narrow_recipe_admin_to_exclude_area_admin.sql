-- 2026-08-27にクライアントから実際のGAS画面スクリーンショットと共に、レシピ閲覧システムの
-- 権限構成が確定した:
--   ・新規申請/申請履歴/承認済みレシピアップロード/ユーザー管理 = 広域(company_admin) + 全権限管理者(super_admin)
--   ・承認待ち申請/承認履歴/メール通知管理                     = 全権限管理者(super_admin)のみ
--   ・ブロック長/エリア長/営業(area_admin)                     = 自身の管轄エリアの閲覧のみ
--
-- 20260826000005で「営業が複数エリアのレシピを扱う」という組織図の記述のみに基づきarea_adminにも
-- recipes_write等を開放したが、これは誤りだったため撤回する(area_adminの閲覧はrecipes_select等の
-- 既存SELECTポリシーで元々十分に機能しており、書き込み権限は一切不要だった)。
create or replace function private.is_recipe_admin_for_company(p_company_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select private.is_super_admin() or exists (
    select 1
    from user_access_scopes uas
    join roles r on r.id = uas.role_id
    where uas.user_id = auth.uid()
      and r.code = 'company_admin'
      and uas.company_id = p_company_id
      and uas.area_id is null
      and uas.store_id is null
      and (uas.ended_on is null or uas.ended_on >= current_date)
  )
$$;

-- あわせて、「承認」(承認して公開/承認/差し戻し = recipes.statusの変更、rejection_noteの記録)は
-- 全権限管理者のみが行えるようRLSでも境界を引く(アプリのUIガード — src/app/recipe/admin/guard.ts —
-- だけでは、RPC/REST直叩きでの越権を防げないため)。recipes_writeを「新規作成」と
-- 「承認(既存行の状態変更を伴う書き込み)」の2ポリシーに分割する。
-- 新規作成(INSERT)はstatus in ('draft','published')の両方を許可する: 通常の新規レシピ申請は
-- 'draft'で作成するが、承認済みレシピアップロード(src/app/recipe/admin/upload/actions.ts、
-- 2026-08-27追加)は社内で既に承認済みのレシピを承認フローを経ずに直接'published'として
-- 登録する仕様のため。禁止したいのは「既存の(他者が申請した)draft行を広域が勝手にpublishedへ
-- 更新すること」であり、それはUPDATE側のrecipes_update_submit/recipes_update_approveで
-- 引き続き禁止される(新規INSERTでは"他者の申請"という概念自体が存在しないため問題にならない)。
drop policy if exists "recipes_write" on recipes;

create policy "recipes_insert" on recipes
  for insert
  with check (private.is_recipe_admin_for_company(company_id) and status in ('draft', 'published'));

-- 申請者(広域)は下書き状態のレシピについて、current_version_id等の付随情報を更新できるが、
-- statusを'draft'以外に変更することはできない(WITH CHECKで新しい行もdraftであることを要求)。
create policy "recipes_update_submit" on recipes
  for update
  using (private.is_recipe_admin_for_company(company_id) and status = 'draft')
  with check (private.is_recipe_admin_for_company(company_id) and status = 'draft');

-- 承認(公開・非公開のまま承認・差し戻し)は全権限管理者のみ。既存行がdraft/published問わず対象にできる。
create policy "recipes_update_approve" on recipes
  for update
  using (private.is_super_admin())
  with check (private.is_super_admin());

create policy "recipes_delete" on recipes
  for delete
  using (private.is_super_admin());
