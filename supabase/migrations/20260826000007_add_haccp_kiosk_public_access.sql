-- ログイン不要のHACCP店舗側入力(重要ポイント・従業員衛生・食品衛生自主点検)。
-- クライアント指示: 「ログイン出来ない高齢者も多数いる」「回答が出来ない方がリスクになる。
-- セキュリティ面にはそこまで気を遣わなくて良い」(2026-08-26)。
--
-- 方式: 店舗ごとに推測不能なアクセストークン(公開URLの一部)を発行し、トークンを知っている
-- ことのみを許可条件とする「秘密のリンク」方式(Googleフォーム等と同じ考え方)。通常のRLS
-- (auth.uid()ベース)は未ログイン状態では機能しないため、トークン検証・書き込みは全て
-- SECURITY DEFINERのRPC(public schema)内で完結させる。既存の認証済みフロー
-- (src/app/haccp/{keypoint,employee,inspection}/actions.ts)と同じ検証・バージョニングロジックを
-- SQLに移植している。
--
-- recorded_byは未ログインのため実ユーザーに紐付けられない(nullable化)。実施者の識別は
-- 各フォーム自体が既に持つ自由記述欄(実施者名/従業員選択・手入力氏名)に委ねる。
-- どちらの経路から登録されたかをsubmitted_viaで区別し、管理画面側で判別できるようにする。

-- default付与により、既存のcreateStore(src/app/master/stores/actions.ts)等の既存INSERT経路を
-- 一切変更せずに、新規店舗にも自動でトークンが発行される。
-- gen_random_bytesはpgcrypto拡張の関数でextensionsスキーマに存在するため、schema修飾で呼び出す
-- (search_pathに依存すると環境によって解決できない場合がある — SECURITY DEFINER関数側の
-- 同種の呼び出し箇所も含め全てこの形にする)。
alter table stores add column public_access_token text unique default encode(extensions.gen_random_bytes(24), 'hex');
update stores set public_access_token = encode(extensions.gen_random_bytes(24), 'hex') where public_access_token is null;
alter table stores alter column public_access_token set not null;

alter table haccp_keypoint_responses
  alter column recorded_by drop not null,
  add column submitted_via text not null default 'portal' check (submitted_via in ('portal', 'public_link'));

alter table haccp_employee_responses
  alter column recorded_by drop not null,
  add column submitted_via text not null default 'portal' check (submitted_via in ('portal', 'public_link'));

alter table haccp_inspections
  alter column recorded_by drop not null,
  add column submitted_via text not null default 'portal' check (submitted_via in ('portal', 'public_link'));

-- ============================================================
-- 参照系(店舗特定・従業員一覧)
-- ============================================================

create or replace function public.kiosk_get_store(p_token text)
returns table (store_id uuid, company_id uuid, store_name text, store_code text)
language sql
security definer
stable
set search_path = public
as $$
  select id, company_id, name, store_code
  from stores
  where public_access_token = p_token and status = 'active'
$$;

revoke all on function public.kiosk_get_store(text) from public;
grant execute on function public.kiosk_get_store(text) to anon, authenticated;

create or replace function public.kiosk_get_employees(p_token text)
returns table (employee_id uuid, employee_code text, full_name text)
language sql
security definer
stable
set search_path = public
as $$
  select e.id, e.employee_code, e.full_name
  from stores s
  join employee_assignments ea on ea.store_id = s.id and ea.ended_on is null
  join employees e on e.id = ea.employee_id and e.status = 'active'
  where s.public_access_token = p_token and s.status = 'active'
  order by e.full_name
$$;

revoke all on function public.kiosk_get_employees(text) from public;
grant execute on function public.kiosk_get_employees(text) to anon, authenticated;

-- ============================================================
-- 重要ポイント・温度・ラベル(haccp/keypoint/actions.tsのrecordKeypointCheckに対応)
-- ============================================================

create or replace function public.kiosk_submit_keypoint(
  p_token text,
  p_target_date date,
  p_items jsonb,
  p_temp_value numeric default null,
  p_temp_judgment text default null,
  p_temp_note text default null,
  p_label_judgment text default null,
  p_label_note text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_company_id uuid;
  v_next_version int;
  v_response_id uuid;
  v_code text;
  v_codes text[] := array['heat_room', 'heat_cold', 'nonheat_room', 'nonheat_cold', 'mixed_room', 'mixed_cold'];
begin
  select id, company_id into v_store_id, v_company_id from stores where public_access_token = p_token and status = 'active';
  if v_store_id is null then
    raise exception '無効なアクセスリンクです';
  end if;
  if p_target_date is null then
    raise exception '対象日を入力してください';
  end if;

  foreach v_code in array v_codes loop
    if not (p_items ? v_code) then
      raise exception '項目が不足しています: %', v_code;
    end if;
  end loop;

  select coalesce(max(version), 0) + 1 into v_next_version
  from haccp_keypoint_responses
  where store_id = v_store_id and target_date = p_target_date;

  insert into haccp_keypoint_responses (company_id, store_id, target_date, version, recorded_by, submitted_via)
  values (v_company_id, v_store_id, p_target_date, v_next_version, null, 'public_link')
  returning id into v_response_id;

  foreach v_code in array v_codes loop
    insert into haccp_keypoint_items (response_id, item_code, checked, note)
    values (
      v_response_id,
      v_code,
      coalesce(p_items -> v_code ->> 'checked', '') in ('true', 't', '1'),
      nullif(p_items -> v_code ->> 'note', '')
    );
  end loop;

  if p_temp_value is not null or nullif(p_temp_judgment, '') is not null or nullif(p_temp_note, '') is not null then
    insert into haccp_temperature_labels (response_id, label_type, measured_value, judgment, note)
    values (v_response_id, 'temperature', p_temp_value, nullif(p_temp_judgment, ''), nullif(p_temp_note, ''));
  end if;

  if nullif(p_label_judgment, '') is not null or nullif(p_label_note, '') is not null then
    insert into haccp_temperature_labels (response_id, label_type, measured_value, judgment, note)
    values (v_response_id, 'label', null, nullif(p_label_judgment, ''), nullif(p_label_note, ''));
  end if;

  -- actor_idはnull(未ログインのため実ユーザーが存在しない)。監査ログ自体の欠落を防ぐため、
  -- authenticated actions.ts側と同じ system_code/action/target_table規約でnull-actor行を記録する。
  insert into audit_logs (actor_id, system_code, action, target_table, target_id, after_data)
  values (
    null, 'haccp', 'keypoint_record_public', 'haccp_keypoint_responses', v_response_id,
    jsonb_build_object('store_id', v_store_id, 'target_date', p_target_date, 'version', v_next_version)
  );

  return v_response_id;
end;
$$;

revoke all on function public.kiosk_submit_keypoint(text, date, jsonb, numeric, text, text, text, text) from public;
grant execute on function public.kiosk_submit_keypoint(text, date, jsonb, numeric, text, text, text, text) to anon, authenticated;

-- ============================================================
-- 従業員衛生チェック(haccp/employee/actions.tsのrecordEmployeeCheckに対応)
-- ============================================================

create or replace function public.kiosk_submit_employee_check(
  p_token text,
  p_target_date date,
  p_employee_id uuid default null,
  p_manual_name text default null,
  p_answers jsonb default '{}'::jsonb,
  p_note text default null,
  p_action_taken text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_company_id uuid;
  v_next_version int;
  v_response_id uuid;
  v_code text;
  v_answer text;
  v_has_bad boolean := false;
  v_codes text[] := array['handwash', 'clean_uniform', 'proper_cap', 'nails', 'no_accessory', 'skin_injury', 'stomach_symptom', 'body_temp'];
begin
  select id, company_id into v_store_id, v_company_id from stores where public_access_token = p_token and status = 'active';
  if v_store_id is null then
    raise exception '無効なアクセスリンクです';
  end if;
  if p_target_date is null then
    raise exception '対象日を入力してください';
  end if;
  if p_employee_id is null and nullif(p_manual_name, '') is null then
    raise exception '従業員を選択するか、氏名を入力してください';
  end if;
  if p_employee_id is not null and not exists (
    select 1 from employee_assignments ea
    where ea.employee_id = p_employee_id and ea.store_id = v_store_id and ea.ended_on is null
  ) then
    raise exception '選択された従業員はこの店舗に配属されていません';
  end if;

  foreach v_code in array v_codes loop
    v_answer := p_answers ->> v_code;
    if v_answer is null or v_answer not in ('good', 'bad') then
      raise exception '全ての項目に回答してください';
    end if;
    if v_answer = 'bad' then
      v_has_bad := true;
    end if;
  end loop;

  if v_has_bad and (nullif(p_note, '') is null or nullif(p_action_taken, '') is null) then
    raise exception '「異常」の項目がある場合は備考と対応内容を入力してください';
  end if;

  select coalesce(max(version), 0) + 1 into v_next_version
  from haccp_employee_responses
  where store_id = v_store_id and target_date = p_target_date
    and (
      (p_employee_id is not null and employee_id = p_employee_id)
      or (p_employee_id is null and is_unmatched = true and manual_name = p_manual_name)
    );

  insert into haccp_employee_responses (
    company_id, store_id, target_date, employee_id, manual_name, is_unmatched, version, recorded_by, submitted_via
  ) values (
    v_company_id, v_store_id, p_target_date, p_employee_id,
    case when p_employee_id is null then p_manual_name else null end,
    p_employee_id is null, v_next_version, null, 'public_link'
  ) returning id into v_response_id;

  foreach v_code in array v_codes loop
    v_answer := p_answers ->> v_code;
    insert into haccp_employee_items (response_id, item_code, answer, note, action_taken)
    values (
      v_response_id, v_code, v_answer,
      case when v_answer = 'bad' then p_note else null end,
      case when v_answer = 'bad' then p_action_taken else null end
    );
  end loop;

  insert into audit_logs (actor_id, system_code, action, target_table, target_id, after_data)
  values (
    null, 'haccp', 'employee_record_public', 'haccp_employee_responses', v_response_id,
    jsonb_build_object('store_id', v_store_id, 'target_date', p_target_date, 'version', v_next_version)
  );

  return v_response_id;
end;
$$;

revoke all on function public.kiosk_submit_employee_check(text, date, uuid, text, jsonb, text, text) from public;
grant execute on function public.kiosk_submit_employee_check(text, date, uuid, text, jsonb, text, text) to anon, authenticated;

-- ============================================================
-- 食品衛生自主点検(haccp/inspection/actions.tsのrecordInspectionに対応)
-- ============================================================

create or replace function public.kiosk_submit_inspection(
  p_token text,
  p_implementer_name text,
  p_answers jsonb,
  p_self_evaluation text,
  p_store_manager_name text default null,
  p_hygiene_officer_name text default null,
  p_area_manager_name text default null,
  p_area_hygiene_officer_name text default null,
  p_improvement_reason text default null,
  p_special_notes text default null,
  p_business_license_expiry_date date default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_company_id uuid;
  v_target_month date;
  v_next_version int;
  v_inspection_id uuid;
  v_code text;
  v_answer text;
  v_has_bad boolean := false;
  v_codes text[] := array['q1', 'q2', 'q3', 'q4_1', 'q4_2', 'q4_3', 'q5_1', 'q5_2', 'q5_3', 'q5_4', 'q6_1', 'q6_2', 'q6_3', 'q7_1', 'q7_2', 'q7_3', 'q8_1', 'q8_2'];
  v_overall text;
begin
  select id, company_id into v_store_id, v_company_id from stores where public_access_token = p_token and status = 'active';
  if v_store_id is null then
    raise exception '無効なアクセスリンクです';
  end if;
  if nullif(p_implementer_name, '') is null then
    raise exception '実施者名を入力してください';
  end if;
  if p_self_evaluation is null or p_self_evaluation not in ('good', 'needs_improvement') then
    raise exception '自主評価を選択してください';
  end if;

  foreach v_code in array v_codes loop
    v_answer := p_answers ->> v_code;
    if v_answer is null or v_answer not in ('good', 'needs_improvement') then
      raise exception 'すべての項目に回答してください';
    end if;
    if v_answer = 'needs_improvement' then
      v_has_bad := true;
    end if;
  end loop;
  v_overall := case when v_has_bad then 'needs_improvement' else 'good' end;

  if v_has_bad and nullif(p_improvement_reason, '') is null then
    raise exception '要改善の項目があります。改善が必要な項目の詳細を入力してください';
  end if;

  v_target_month := date_trunc('month', timezone('Asia/Tokyo', now()))::date;

  select coalesce(max(version), 0) + 1 into v_next_version
  from haccp_inspections
  where store_id = v_store_id and target_month = v_target_month;

  insert into haccp_inspections (
    company_id, store_id, target_month, store_manager_name, hygiene_officer_name,
    area_manager_name, area_hygiene_officer_name, implementer_name, overall_evaluation,
    improvement_reason, self_evaluation, special_notes, business_license_expiry_date,
    version, recorded_by, submitted_via
  ) values (
    v_company_id, v_store_id, v_target_month, nullif(p_store_manager_name, ''), nullif(p_hygiene_officer_name, ''),
    nullif(p_area_manager_name, ''), nullif(p_area_hygiene_officer_name, ''), p_implementer_name, v_overall,
    nullif(p_improvement_reason, ''), p_self_evaluation, nullif(p_special_notes, ''), p_business_license_expiry_date,
    v_next_version, null, 'public_link'
  ) returning id into v_inspection_id;

  foreach v_code in array v_codes loop
    insert into haccp_inspection_items (inspection_id, question_code, answer)
    values (v_inspection_id, v_code, p_answers ->> v_code);
  end loop;

  insert into audit_logs (actor_id, system_code, action, target_table, target_id, after_data)
  values (
    null, 'haccp', 'inspection_record_public', 'haccp_inspections', v_inspection_id,
    jsonb_build_object('store_id', v_store_id, 'target_month', v_target_month, 'version', v_next_version)
  );

  return v_inspection_id;
end;
$$;

revoke all on function public.kiosk_submit_inspection(text, text, jsonb, text, text, text, text, text, text, text, date) from public;
grant execute on function public.kiosk_submit_inspection(text, text, jsonb, text, text, text, text, text, text, text, date) to anon, authenticated;

-- ============================================================
-- 管理側: 店舗のkioskトークン再発行(リンク流出・端末紛失時の失効用)
-- ============================================================
-- 通常のstores_update(private.is_company_admin_for、company_admin/super_adminのみ)は使わない。
-- HACCP管理画面(src/app/haccp/admin/guard.ts)はarea_adminにも操作を許可しているため、
-- このトークン再発行に限りarea_adminの担当エリアの店舗も対象にする、専用スコープのRPCとする
-- (店舗名・状態等、他の店舗マスター項目への書き込み権限をarea_adminに広げるものではない)。
create or replace function public.regenerate_store_kiosk_token(p_store_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_area_id uuid;
  v_new_token text;
  v_authorized boolean;
begin
  select company_id, area_id into v_company_id, v_area_id from stores where id = p_store_id;
  if v_company_id is null then
    raise exception '店舗が見つかりません';
  end if;

  v_authorized := private.is_super_admin()
    or exists (
      select 1 from user_access_scopes uas
      join roles r on r.id = uas.role_id
      where uas.user_id = auth.uid()
        and r.code = 'company_admin'
        and uas.company_id = v_company_id
        and (uas.ended_on is null or uas.ended_on >= current_date)
    )
    or (v_area_id is not null and exists (
      select 1 from user_access_scopes uas
      join roles r on r.id = uas.role_id
      where uas.user_id = auth.uid()
        and r.code = 'area_admin'
        and uas.area_id = v_area_id
        and (uas.ended_on is null or uas.ended_on >= current_date)
    ));

  if not v_authorized then
    raise exception 'この操作を行う権限がありません';
  end if;

  v_new_token := encode(extensions.gen_random_bytes(24), 'hex');
  update stores set public_access_token = v_new_token where id = p_store_id;

  return v_new_token;
end;
$$;

revoke all on function public.regenerate_store_kiosk_token(uuid) from public;
grant execute on function public.regenerate_store_kiosk_token(uuid) to authenticated;
