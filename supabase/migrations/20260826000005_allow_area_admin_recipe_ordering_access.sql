-- クライアントより提供された組織図(役員→ブロック長→エリア長→営業→店長→一般従業員)により、
-- 「営業」層は複数エリアのレシピ・販促物受発注を横断的に取り扱うことが判明した。
-- 20260826000001時点のprivate.is_recipe_admin_for_company() / is_ordering_admin_for_company()は
-- company_adminとsuper_adminのみを許可しており、area_adminロールを一切考慮していなかった
-- (ordering/admin/guard.ts・recipe/admin/guard.tsのコメントで既に「専用ロールが存在しないための
-- 暫定措置」と明記されていた既知のギャップ)。area_adminは1ユーザーが複数のuser_access_scopes行
-- (エリアごとに1行)を持てるため、新たなロールやuser_access_scopesの次元追加は不要で、対象エリアが
-- 指定会社に属するかどうかの判定を追加するだけで対応できる。
create or replace function private.is_ordering_admin_for_company(p_company_id uuid)
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
  ) or exists (
    select 1
    from user_access_scopes uas
    join roles r on r.id = uas.role_id
    join areas a on a.id = uas.area_id
    where uas.user_id = auth.uid()
      and r.code = 'area_admin'
      and a.company_id = p_company_id
      and (uas.ended_on is null or uas.ended_on >= current_date)
  )
$$;

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
  ) or exists (
    select 1
    from user_access_scopes uas
    join roles r on r.id = uas.role_id
    join areas a on a.id = uas.area_id
    where uas.user_id = auth.uid()
      and r.code = 'area_admin'
      and a.company_id = p_company_id
      and (uas.ended_on is null or uas.ended_on >= current_date)
  )
$$;
