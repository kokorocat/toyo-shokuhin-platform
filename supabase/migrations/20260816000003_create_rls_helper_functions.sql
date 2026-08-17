create schema if not exists private;

-- 現在ログイン中のユーザーがアクセスできる会社IDの集合
create or replace function private.user_company_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select distinct coalesce(uas.company_id, s.company_id, a.company_id)
  from user_access_scopes uas
  left join stores s on uas.store_id = s.id
  left join areas a on uas.area_id = a.id
  where uas.user_id = auth.uid()
    and (uas.ended_on is null or uas.ended_on >= current_date)
    and coalesce(uas.company_id, s.company_id, a.company_id) is not null
$$;

-- 全社・全権限を持つ管理者かどうか(company_idを指定しないscopeでsuper_adminロールを持つ場合)
create or replace function private.is_super_admin()
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
      and r.code = 'super_admin'
      and uas.company_id is null
      and uas.area_id is null
      and uas.store_id is null
      and (uas.ended_on is null or uas.ended_on >= current_date)
  )
$$;

-- 現在ログイン中のユーザーがアクセスできる店舗IDの集合(店舗単位のRLSで使用)
create or replace function private.user_store_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select s.id
  from stores s
  where s.company_id in (select private.user_company_ids())
    and (
      s.id in (
        select uas.store_id from user_access_scopes uas
        where uas.user_id = auth.uid() and uas.store_id is not null
          and (uas.ended_on is null or uas.ended_on >= current_date)
      )
      or s.area_id in (
        select uas.area_id from user_access_scopes uas
        where uas.user_id = auth.uid() and uas.area_id is not null
          and (uas.ended_on is null or uas.ended_on >= current_date)
      )
      or exists (
        select 1 from user_access_scopes uas
        where uas.user_id = auth.uid() and uas.company_id = s.company_id
          and uas.area_id is null and uas.store_id is null
          and (uas.ended_on is null or uas.ended_on >= current_date)
      )
    )
$$;

revoke all on function private.user_company_ids() from public;
revoke all on function private.is_super_admin() from public;
revoke all on function private.user_store_ids() from public;
grant execute on function private.user_company_ids() to authenticated;
grant execute on function private.is_super_admin() to authenticated;
grant execute on function private.user_store_ids() to authenticated;
