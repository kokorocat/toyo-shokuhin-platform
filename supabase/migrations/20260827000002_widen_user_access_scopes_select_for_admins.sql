-- /master/usersのユーザー一覧画面から、管理者(company_admin/super_admin)が自社スコープ内の
-- ユーザーの権限付与状況を閲覧できるようにする。user_profilesの同種の拡張(20260825000007)とは
-- 異なり、user_access_scopesは「誰がどの権限を持つか」という機微情報そのものであり、かつ
-- クライアントが監査時に明示的に懸念していた「他社データを一切見せたくない」という要件
-- (2026-08-26のやり取り)に直結するため、無条件開放はせず自社スコープ内のみに限定する。
-- /master/users自体もisMasterAdminRole(company_admin/super_adminのみ、area_adminは対象外)で
-- ゲートしているため、ここもcompany_admin/super_adminのみを対象とする。
--
-- private.viewer_company_admin_company_ids()経由にする理由: user_access_scopes自身へのポリシー内で
-- user_access_scopesを直接サブクエリすると、Postgresが自己参照ポリシーとみなし
-- 「infinite recursion detected in policy」でこのテーブルへの**あらゆる**SELECT(自分の行のみを
-- 見る既存の許可済みクエリも含む)が失敗する。private.is_company_admin_for等と同じ
-- SECURITY DEFINER関数でRLSを迂回させることで回避する(このテーブル固有の対策)。
-- また、area_id is null and store_id is null の条件も付与する(既存のprivate.is_company_admin_for
-- と同じ「真に全社スコープの会社管理者行」であることの確認 — この条件を欠くと、手作業SQL
-- (2026-08-27に実際発生したcompany_id NULLの誤挿入のような)によるcompany_id+area_id/store_id
-- が同時に入った不整合行を、誤って正当な全社スコープとして扱ってしまう)。
create or replace function private.viewer_company_admin_company_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select uas2.company_id
  from user_access_scopes uas2
  join roles r on r.id = uas2.role_id
  where uas2.user_id = auth.uid()
    and r.code = 'company_admin'
    and uas2.company_id is not null
    and uas2.area_id is null
    and uas2.store_id is null
    and (uas2.ended_on is null or uas2.ended_on >= current_date)
$$;

revoke all on function private.viewer_company_admin_company_ids() from public;
grant execute on function private.viewer_company_admin_company_ids() to authenticated;

create policy "user_access_scopes_select_admin" on user_access_scopes
  for select using (
    private.is_super_admin()
    or coalesce(
      company_id,
      (select s.company_id from stores s where s.id = user_access_scopes.store_id),
      (select a.company_id from areas a where a.id = user_access_scopes.area_id)
    ) in (select private.viewer_company_admin_company_ids())
  );
