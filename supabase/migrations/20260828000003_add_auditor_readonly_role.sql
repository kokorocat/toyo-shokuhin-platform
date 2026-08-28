-- 監査担当(閲覧専用)ロールの新設(2026-08-28、クライアント依頼: 監査時にその会社だけの情報を
-- 閲覧できるアカウント)。既存6ロールには閲覧専用に相当するものが無く、最も狭いcompany_adminも
-- フル書き込み権限を持つため新設する。
--
-- 設計の核心: private.user_company_ids()/user_store_ids()は多くのテーブルの「書き込み」ポリシーにも
-- 使われている汎用ヘルパーで、ロールを一切区別しない(例: haccp_temperature_records_insertは
-- store_id in (select private.user_store_ids())のみでロール不問)。新ロールを単純にcompany_admin同型の
-- user_access_scopes行として持たせると、この2関数を経由して書き込みまでできてしまう。そこで
-- (1) この2関数からauditorの行を除外し、(2) auditor専用の新しい閲覧ヘルパーを別途用意し、
-- (3) 既存のSELECTポリシーは一切変更せず許可的ポリシーを追加するだけに留める。追加を1つ忘れても
-- 「見えないだけ」で書き込み漏洩のような事故にはならない非対称性を意図的に利用している。

begin;

insert into roles (code, name, description) values
  ('auditor', '監査担当', '会社データの閲覧のみ(書き込み不可)');

-- (1) 汎用スコープヘルパーからauditorを除外
create or replace function private.user_company_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select distinct coalesce(uas.company_id, s.company_id, a.company_id)
  from user_access_scopes uas
  join roles r on r.id = uas.role_id
  left join stores s on uas.store_id = s.id
  left join areas a on uas.area_id = a.id
  where uas.user_id = auth.uid()
    and r.code <> 'auditor'
    and (uas.ended_on is null or uas.ended_on >= current_date)
    and coalesce(uas.company_id, s.company_id, a.company_id) is not null
$$;

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
        join roles r on r.id = uas.role_id
        where uas.user_id = auth.uid() and uas.company_id = s.company_id
          and uas.area_id is null and uas.store_id is null
          and r.code <> 'auditor'
          and (uas.ended_on is null or uas.ended_on >= current_date)
      )
    )
$$;

-- (2) auditor専用の閲覧ヘルパー(private.is_company_admin_forと同型)
create or replace function private.is_auditor_for_company(p_company_id uuid)
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
      and r.code = 'auditor'
      and uas.company_id = p_company_id
      and uas.area_id is null
      and uas.store_id is null
      and (uas.ended_on is null or uas.ended_on >= current_date)
  )
$$;
revoke all on function private.is_auditor_for_company(uuid) from public;
grant execute on function private.is_auditor_for_company(uuid) to authenticated;

create or replace function private.is_auditor_for_store(p_store_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select private.is_auditor_for_company((select company_id from stores where id = p_store_id))
$$;
revoke all on function private.is_auditor_for_store(uuid) from public;
grant execute on function private.is_auditor_for_store(uuid) to authenticated;

-- (3) 対象範囲: マスタデータ + HACCP全体。既存SELECTポリシーは無変更、追加のみ。

-- マスタデータ(company_id直接保持)
create policy "companies_select_auditor" on companies for select using (private.is_auditor_for_company(id));
create policy "blocks_select_auditor" on blocks for select using (private.is_auditor_for_company(company_id));
create policy "areas_select_auditor" on areas for select using (private.is_auditor_for_company(company_id));
create policy "stores_select_auditor" on stores for select using (private.is_auditor_for_company(company_id));
create policy "employees_select_auditor" on employees for select using (private.is_auditor_for_company(company_id));

-- マスタデータ(store_id経由)
create policy "employee_assignments_select_auditor" on employee_assignments for select using (private.is_auditor_for_store(store_id));

-- HACCP(store_id直接保持)
-- 注: haccp_check_points/haccp_temperature_records/haccp_hygiene_items/haccp_hygiene_records/
-- haccp_corrective_actions/haccp_daily_approvalsは初期の汎用実装のテーブルで、
-- 20260825000001_drop_generic_haccp_tables.sqlで削除済み(仕様書ベースの正しい設計に置き換え)。
-- 現行スキーマはhaccp_keypoint_responses等(下記)なので、ここでの対象はそれらのみ。
create policy "haccp_keypoint_responses_select_auditor" on haccp_keypoint_responses for select using (private.is_auditor_for_store(store_id));
create policy "haccp_employee_responses_select_auditor" on haccp_employee_responses for select using (private.is_auditor_for_store(store_id));
create policy "haccp_inspections_select_auditor" on haccp_inspections for select using (private.is_auditor_for_store(store_id));
create policy "store_holidays_select_auditor" on store_holidays for select using (private.is_auditor_for_store(store_id));
create policy "manager_confirmations_select_auditor" on manager_confirmations for select using (private.is_auditor_for_store(store_id));

-- HACCP(親テーブル経由の子テーブル)
create policy "haccp_keypoint_items_select_auditor" on haccp_keypoint_items for select using (
  exists (select 1 from haccp_keypoint_responses r where r.id = response_id and private.is_auditor_for_store(r.store_id))
);
create policy "haccp_temperature_labels_select_auditor" on haccp_temperature_labels for select using (
  exists (select 1 from haccp_keypoint_responses r where r.id = response_id and private.is_auditor_for_store(r.store_id))
);
create policy "haccp_employee_items_select_auditor" on haccp_employee_items for select using (
  exists (select 1 from haccp_employee_responses r where r.id = response_id and private.is_auditor_for_store(r.store_id))
);
create policy "haccp_inspection_items_select_auditor" on haccp_inspection_items for select using (
  exists (select 1 from haccp_inspections i where i.id = inspection_id and private.is_auditor_for_store(i.store_id))
);

-- (4) grant_user_access_scope/revoke_user_access_scope: auditorをcompany_id専用形状として受け付け、
-- super_adminのみが付与・取消できるようにする(元の定義: 20260826000003_create_grant_revoke_user_access_scope_rpc.sql)。
create or replace function public.grant_user_access_scope(
  p_target_user_id uuid,
  p_role_code text,
  p_company_id uuid default null,
  p_area_id uuid default null,
  p_store_id uuid default null,
  p_started_on date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_id uuid;
  v_resolved_company_id uuid;
  v_existing_role_id uuid;
  v_existing_role_code text;
  v_new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'ログインが必要です';
  end if;

  select id into v_role_id from roles where code = p_role_code;
  if v_role_id is null then
    raise exception '不正なロールコードです: %', p_role_code;
  end if;

  if p_role_code in ('super_admin', 'system_maintenance') then
    if p_company_id is not null or p_area_id is not null or p_store_id is not null then
      raise exception '%ロールはcompany_id/area_id/store_idをすべて空にしてください', p_role_code;
    end if;
  elsif p_role_code in ('company_admin', 'auditor') then
    if p_company_id is null or p_area_id is not null or p_store_id is not null then
      raise exception '%ロールはcompany_idのみを指定してください', p_role_code;
    end if;
  elsif p_role_code = 'area_admin' then
    if p_area_id is null or p_company_id is not null or p_store_id is not null then
      raise exception 'area_adminロールはarea_idのみを指定してください';
    end if;
  elsif p_role_code in ('store_user', 'store_manager') then
    if p_store_id is null or p_company_id is not null or p_area_id is not null then
      raise exception 'store_user/store_managerロールはstore_idのみを指定してください';
    end if;
  else
    raise exception '不正なロールコードです: %', p_role_code;
  end if;

  if p_company_id is not null then
    select id into v_resolved_company_id from companies where id = p_company_id;
    if v_resolved_company_id is null then
      raise exception '不正なcompany_idです';
    end if;
  elsif p_area_id is not null then
    select company_id into v_resolved_company_id from areas where id = p_area_id;
    if v_resolved_company_id is null then
      raise exception '不正なarea_idです';
    end if;
  elsif p_store_id is not null then
    select company_id into v_resolved_company_id from stores where id = p_store_id;
    if v_resolved_company_id is null then
      raise exception '不正なstore_idです';
    end if;
  end if;

  if p_role_code in ('company_admin', 'super_admin', 'system_maintenance', 'auditor') and not private.is_super_admin() then
    raise exception '自分以上の権限を付与することはできません';
  end if;

  if not private.is_company_admin_for(v_resolved_company_id) then
    raise exception 'この操作を行う権限がありません';
  end if;

  select uas.role_id, r.code into v_existing_role_id, v_existing_role_code
  from user_access_scopes uas
  join roles r on r.id = uas.role_id
  where uas.user_id = p_target_user_id
    and (uas.ended_on is null or uas.ended_on >= current_date)
    and coalesce(uas.company_id, uas.area_id, uas.store_id) is not distinct from coalesce(p_company_id, p_area_id, p_store_id)
  limit 1;

  if v_existing_role_id is not null and v_existing_role_id <> v_role_id then
    if not private.is_super_admin() and v_existing_role_code in ('company_admin', 'super_admin', 'system_maintenance', 'auditor') then
      raise exception '既存の管理者権限を上書きすることはできません。先にrevoke_user_access_scopeで明示的に取り消してください';
    end if;
  end if;

  update user_access_scopes
  set ended_on = greatest(p_started_on - 1, started_on)
  where user_id = p_target_user_id
    and (ended_on is null or ended_on >= current_date)
    and coalesce(company_id, area_id, store_id) is not distinct from coalesce(p_company_id, p_area_id, p_store_id);

  insert into user_access_scopes (user_id, role_id, company_id, area_id, store_id, started_on, created_by)
  values (p_target_user_id, v_role_id, p_company_id, p_area_id, p_store_id, p_started_on, auth.uid())
  returning id into v_new_id;

  return v_new_id;
end;
$$;

create or replace function public.revoke_user_access_scope(
  p_scope_id uuid,
  p_ended_on date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_role_code text;
  v_target_company_id uuid;
  v_target_area_id uuid;
  v_target_store_id uuid;
  v_resolved_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'ログインが必要です';
  end if;

  if p_ended_on > current_date then
    raise exception '取り消し日は本日以前を指定してください';
  end if;

  select r.code, uas.company_id, uas.area_id, uas.store_id
  into v_target_role_code, v_target_company_id, v_target_area_id, v_target_store_id
  from user_access_scopes uas
  join roles r on r.id = uas.role_id
  where uas.id = p_scope_id;

  if v_target_role_code is null then
    raise exception '対象のスコープが見つかりません';
  end if;

  v_resolved_company_id := v_target_company_id;
  if v_target_area_id is not null then
    select company_id into v_resolved_company_id from areas where id = v_target_area_id;
  elsif v_target_store_id is not null then
    select company_id into v_resolved_company_id from stores where id = v_target_store_id;
  end if;

  if v_target_role_code in ('company_admin', 'super_admin', 'system_maintenance', 'auditor') then
    if not private.is_super_admin() then
      raise exception 'この権限の取り消しはできません';
    end if;
  else
    if not private.is_company_admin_for(v_resolved_company_id) then
      raise exception 'この操作を行う権限がありません';
    end if;
  end if;

  update user_access_scopes
  set ended_on = p_ended_on
  where id = p_scope_id
    and (ended_on is null or ended_on > p_ended_on);
end;
$$;

commit;
