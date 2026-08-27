-- 回帰修正: 本日先に適用したrecipes_update_submit/recipes_update_approve(20260827000003)は
-- 「新規申請(status='draft'のまま)」と「承認(super_adminのみ)」の2ケースしか許可しておらず、
-- 承認済みレシピアップロード(/recipe/admin/upload、同日追加)がcompany_adminとして行う
-- 「status='published'で挿入した直後の行にcurrent_version_idを紐付けるUPDATE」を許可する
-- ポリシーが存在しなかった。company_adminが一括アップロードを実行すると、レシピ行・
-- レシピバージョン行・ストレージファイルは全て作成されるがcurrent_version_idの紐付けだけが
-- RLSにより無言で失敗し(0件更新、エラーも出ない)、レシピ原本が永久に開けない状態になる不具合
-- (アドバーサリアルレビューで発見、実機で確認済み)。
--
-- 当初、「application_id is null かつ status='published'」に限定した専用UPDATEポリシーを
-- 追加する形で修正したが、これは別の不具合を生んだ: Postgresは同一テーブルの複数の
-- permissiveなUPDATEポリシーについて、USING句同士をOR・WITH CHECK句同士をORで結合するが、
-- この2つの結合は独立している(同じポリシー由来のUSING/WITH CHECKが対になっているわけではない)。
-- そのため、company_adminは既存のrecipes_update_submitのUSING(status='draft'の行を対象にできる)と、
-- 新設ポリシーのWITH CHECK(新しい行がstatus='published'であれば許可)を組み合わせることで、
-- 「下書き中のレシピを直接publishedへ更新する」という、どちらのポリシー単体でも許可していない
-- 操作が可能になってしまっていた(全権限管理者専用のはずの承認ゲートを回避できる状態)。
-- 実機のPostgresで再現・確認済み。
--
-- RLSポリシーの単純な追加ではこの種の「新旧両方の行の状態を厳密に対にして検証する」要件を
-- 安全に表現できないため、grant_user_access_scope等と同じSECURITY DEFINER RPCパターンに
-- 切り替える。RPC内で対象行のapplication_id/statusを明示的に確認してから更新するため、
-- 複数ポリシーの組み合わせによる迂回が構造的に発生しない。
create or replace function public.link_recipe_current_version(p_recipe_id uuid, p_version_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipe record;
begin
  select id, company_id, application_id, status into v_recipe from recipes where id = p_recipe_id;
  if v_recipe.id is null then
    raise exception 'レシピが見つかりません';
  end if;

  if not private.is_recipe_admin_for_company(v_recipe.company_id) then
    raise exception 'この操作を行う権限がありません';
  end if;

  -- 承認済みレシピアップロード由来(application_id無し・既にpublished)の紐付けのみを許可する。
  -- 申請フロー由来(application_id有り)や、draft/approved状態の行はこの関数の対象外
  -- (それらはrecipes_update_submit/recipes_update_approveの既存の境界で保護されたままにする)。
  if v_recipe.application_id is not null or v_recipe.status <> 'published' then
    raise exception 'この操作は承認済みレシピアップロード由来のレシピにのみ使用できます';
  end if;

  update recipes set current_version_id = p_version_id where id = p_recipe_id;
end;
$$;

revoke all on function public.link_recipe_current_version(uuid, uuid) from public;
grant execute on function public.link_recipe_current_version(uuid, uuid) to authenticated;
