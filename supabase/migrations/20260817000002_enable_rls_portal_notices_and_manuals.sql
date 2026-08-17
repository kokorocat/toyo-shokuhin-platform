alter table portal_notices enable row level security;
alter table notice_scopes enable row level security;
alter table notice_reads enable row level security;
alter table manuals enable row level security;
alter table manual_versions enable row level security;
alter table manual_pages enable row level security;
alter table manual_scopes enable row level security;
alter table processing_jobs enable row level security;

-- notice_scopes/manual_scopes自体は機微でないため、認証済みなら参照可(公開判定のJOINに使う)
create policy "notice_scopes_select" on notice_scopes for select
  using (auth.role() = 'authenticated');
create policy "manual_scopes_select" on manual_scopes for select
  using (auth.role() = 'authenticated');

-- 公開中かつ自分の会社・エリア・店舗が対象範囲に含まれるお知らせのみ閲覧可
create policy "portal_notices_select_published" on portal_notices for select
  using (
    is_deleted = false
    and status = 'published'
    and display_start_at <= now()
    and (display_end_at is null or display_end_at >= now())
    and exists (
      select 1 from notice_scopes ns
      where ns.notice_id = portal_notices.id
        and (
          ns.scope_type = 'all'
          or (ns.scope_type = 'company' and ns.company_id in (select private.user_company_ids()))
          or (ns.scope_type = 'area' and ns.area_id in (
                select distinct s.area_id from stores s where s.id in (select private.user_store_ids())
              ))
          or (ns.scope_type = 'store' and ns.store_id in (select private.user_store_ids()))
        )
    )
  );

-- 管理者(全権限管理者、または自分が作成したお知らせ)は下書き等も含めて参照可
create policy "portal_notices_select_admin" on portal_notices for select
  using (private.is_super_admin() or created_by = auth.uid());

-- 既読は本人分のみ参照・登録可
create policy "notice_reads_select_self" on notice_reads for select
  using (user_id = auth.uid() or private.is_super_admin());
create policy "notice_reads_insert_self" on notice_reads for insert
  with check (user_id = auth.uid());

-- マニュアルは公開中(ready)かつ対象範囲に含まれる場合のみ
create policy "manuals_select_published" on manuals for select
  using (
    is_deleted = false
    and status = 'ready'
    and exists (
      select 1 from manual_scopes ms
      where ms.manual_id = manuals.id
        and (
          ms.scope_type = 'all'
          or (ms.scope_type = 'company' and ms.company_id in (select private.user_company_ids()))
          or (ms.scope_type = 'area' and ms.area_id in (
                select distinct s.area_id from stores s where s.id in (select private.user_store_ids())
              ))
          or (ms.scope_type = 'store' and ms.store_id in (select private.user_store_ids()))
        )
    )
  );
create policy "manuals_select_admin" on manuals for select
  using (private.is_super_admin() or created_by = auth.uid());

create policy "manual_versions_select" on manual_versions for select
  using (
    private.is_super_admin()
    or exists (select 1 from manuals m where m.id = manual_versions.manual_id)
  );

create policy "manual_pages_select" on manual_pages for select
  using (
    exists (
      select 1 from manual_versions mv
      join manuals m on m.id = mv.manual_id
      where mv.id = manual_pages.manual_version_id
    )
  );

-- 処理ジョブは全権限管理者のみ参照可
create policy "processing_jobs_select_admin" on processing_jobs for select
  using (private.is_super_admin());
