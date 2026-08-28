-- 定期的な整理(2026-08-28): この1週間の作業で作られたSECURITY DEFINER関数はほぼ全て
-- search_pathを固定し、authenticatedのみに実行権を絞っているが、以下の3つだけが
-- この規約から漏れていた(アドバーサリアルレビューで発見。今日時点でanon/authenticatedが
-- publicスキーマにCREATE権限を持たないため実害は無いが、他の関数と扱いを揃えておく)。

-- is_hr_admin/is_ordering_adminは現役でhr_persons_insert/products_write等から
-- 参照されているため、同じ本体のままsearch_pathとgrant/revokeだけを是正する。
create or replace function private.is_hr_admin()
returns boolean
language sql
security definer
stable
set search_path = public
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
revoke all on function private.is_hr_admin() from public;
grant execute on function private.is_hr_admin() to authenticated;

create or replace function private.is_ordering_admin()
returns boolean
language sql
security definer
stable
set search_path = public
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
revoke all on function private.is_ordering_admin() from public;
grant execute on function private.is_ordering_admin() to authenticated;

-- is_recipe_admin()は20260826000006でis_recipe_admin_for_company()に置き換わって以降、
-- どのポリシーからも参照されていない(pg_policies照合済み)。孤立したまま残すと、将来
-- 誤って(会社スコープの無い)この関数を再利用してしまうリスクがあるため削除する。
drop function if exists private.is_recipe_admin();
