-- /master/usersの新規ロール付与UIから使用するヘルパー。既存のgrant_user_access_scope RPC
-- (20260826000003)はuser_idを引数に取るが、通常のauthenticatedロールはauthスキーマへの
-- アクセス権を持たないため、アプリからメールアドレス→user_idの検索ができない。
-- 2026-08-27の監査用アカウント作成作業(SQL Editorでの手作業)で、会社名の完全一致ミス
-- (「東洋食品」vs実際の「東洋食品株式会社」)によりuser_access_scopes.company_idがNULLの
-- まま挿入されてしまう事例が実際に発生した — この種の手作業ミスをUI側で防ぐのがこの関数の目的。
--
-- アカウント自体の新規作成(auth.users行の作成)は本関数の範囲外で、引き続きSupabase
-- ダッシュボードでの事前作成が必要(SUPABASE_SERVICE_ROLE_KEYが未設定のため、
-- auth.admin.inviteUserByEmail等のアプリ内アカウント作成は別途対応が必要な既知の制約)。
--
-- 付与対象の会社/エリア/店舗(p_company_id/p_area_id/p_store_id)を引数に取り、呼び出し元が
-- 「その対象への付与権限を持つか」をauth.users参照より先に検証する。これがない版では、
-- どの会社のcompany_adminであってもメールアドレスさえ知っていれば任意の他社ユーザーの
-- アカウント有無を確認できてしまう(「見つかりません」と「権限がありません」のエラー文言が
-- 異なるため、他社のメールアドレスに対する存在確認オラクルとして悪用され得た)。
create or replace function public.find_or_create_user_profile_by_email(
  p_email text,
  p_display_name text default null,
  p_company_id uuid default null,
  p_area_id uuid default null,
  p_store_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_profile_id uuid;
  v_resolved_company_id uuid := p_company_id;
  v_authorized boolean;
begin
  if p_area_id is not null then
    select company_id into v_resolved_company_id from areas where id = p_area_id;
  elsif p_store_id is not null then
    select company_id into v_resolved_company_id from stores where id = p_store_id;
  end if;

  v_authorized := private.is_super_admin()
    or (
      v_resolved_company_id is not null
      and exists (
        select 1 from user_access_scopes uas
        join roles r on r.id = uas.role_id
        where uas.user_id = auth.uid()
          and r.code = 'company_admin'
          and uas.company_id = v_resolved_company_id
          and uas.area_id is null
          and uas.store_id is null
          and (uas.ended_on is null or uas.ended_on >= current_date)
      )
    );

  if not v_authorized then
    raise exception 'この操作を行う権限がありません';
  end if;

  select id into v_user_id from auth.users where email = p_email;
  if v_user_id is null then
    raise exception 'このメールアドレスのアカウントが見つかりません。先にSupabaseダッシュボードでアカウントを作成してください: %', p_email;
  end if;

  select id into v_profile_id from user_profiles where id = v_user_id;
  if v_profile_id is null then
    insert into user_profiles (id, display_name)
    values (v_user_id, coalesce(nullif(trim(p_display_name), ''), split_part(p_email, '@', 1)))
    returning id into v_profile_id;
  end if;

  return v_profile_id;
end;
$$;

revoke all on function public.find_or_create_user_profile_by_email(text, text, uuid, uuid, uuid) from public;
grant execute on function public.find_or_create_user_profile_by_email(text, text, uuid, uuid, uuid) to authenticated;
