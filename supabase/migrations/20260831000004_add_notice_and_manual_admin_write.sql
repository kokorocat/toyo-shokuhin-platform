-- お知らせ・マニュアルの管理画面(KA-20/KA-30)追加のためのINSERT/UPDATE権限。
-- これまでSELECTポリシーのみが存在し、書き込みポリシーが一切無かったため、実際には
-- 誰も(全権限管理者ですら)お知らせやマニュアルを登録できない状態だった。
-- master/*(会社・店舗・ユーザー管理)と同じ境界(company_admin/super_admin)を採用する。
-- 対象範囲は「全社」(super_adminのみ)と「自社」(company_admin/super_admin)の2種類に絞り、
-- エリア・個別店舗単位の細かい絞り込みは今回は対象外とする(スキーマ上は将来対応可能)。

begin;

create or replace function private.is_notice_manual_admin()
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
revoke all on function private.is_notice_manual_admin() from public;
grant execute on function private.is_notice_manual_admin() to authenticated;

-- portal_notices
create policy "portal_notices_insert" on portal_notices
  for insert with check (created_by = auth.uid() and private.is_notice_manual_admin());
create policy "portal_notices_update" on portal_notices
  for update using (private.is_super_admin() or created_by = auth.uid());

-- notice_scopes: 全社指定はsuper_adminのみ、会社指定は自社のcompany_adminも可
create policy "notice_scopes_insert" on notice_scopes
  for insert with check (
    exists (select 1 from portal_notices n where n.id = notice_id and n.created_by = auth.uid())
    and (
      (scope_type = 'all' and private.is_super_admin())
      or (scope_type = 'company' and private.is_company_admin_for(company_id))
    )
  );
create policy "notice_scopes_delete" on notice_scopes
  for delete using (
    exists (select 1 from portal_notices n where n.id = notice_id and (private.is_super_admin() or n.created_by = auth.uid()))
  );

-- manuals
create policy "manuals_insert" on manuals
  for insert with check (created_by = auth.uid() and private.is_notice_manual_admin());
create policy "manuals_update" on manuals
  for update using (private.is_super_admin() or created_by = auth.uid());

-- manual_versions: 対象マニュアルを管理できる人のみ追加可能
create policy "manual_versions_insert" on manual_versions
  for insert with check (
    exists (select 1 from manuals m where m.id = manual_id and (private.is_super_admin() or m.created_by = auth.uid()))
  );

-- manual_scopes(notice_scopesと同じ境界)
create policy "manual_scopes_insert" on manual_scopes
  for insert with check (
    exists (select 1 from manuals m where m.id = manual_id and (private.is_super_admin() or m.created_by = auth.uid()))
    and (
      (scope_type = 'all' and private.is_super_admin())
      or (scope_type = 'company' and private.is_company_admin_for(company_id))
    )
  );
create policy "manual_scopes_delete" on manual_scopes
  for delete using (
    exists (select 1 from manuals m where m.id = manual_id and (private.is_super_admin() or m.created_by = auth.uid()))
  );

-- マニュアルPDF保存用バケット(recipe-filesと同じ非公開+認証済み読み取りのパターン)
insert into storage.buckets (id, name, public)
values ('manual-files', 'manual-files', false)
on conflict (id) do nothing;

create policy "manual_files_authenticated_read" on storage.objects
  for select using (bucket_id = 'manual-files' and auth.role() = 'authenticated');
create policy "manual_files_admin_write" on storage.objects
  for insert with check (bucket_id = 'manual-files' and private.is_notice_manual_admin());

commit;
