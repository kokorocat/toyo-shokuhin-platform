-- 食品衛生自主点検(HC-30): 仕様書4.3「要改善評価の場合は理由・対応内容を必須とする」のうち、
-- 理由(improvement_reason)は既存だが対応内容が未実装だった。改善理由と対になる対応内容の
-- 列を追加する(既存行に影響しない単純な追加のため、購入時のようなデータ削除は不要)。

begin;

alter table haccp_inspections add column improvement_action text;

-- kiosk_submit_inspection: p_improvement_actionを追加し、improvement_reasonと同じ
-- 「要改善時は必須」バリデーションを適用する。
drop function if exists public.kiosk_submit_inspection(text, text, jsonb, text, text, text, text, text, text, text, date);

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
  p_improvement_action text default null,
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
  if v_has_bad and nullif(p_improvement_action, '') is null then
    raise exception '要改善の項目があります。対応内容を入力してください';
  end if;

  v_target_month := date_trunc('month', timezone('Asia/Tokyo', now()))::date;

  select coalesce(max(version), 0) + 1 into v_next_version
  from haccp_inspections
  where store_id = v_store_id and target_month = v_target_month;

  insert into haccp_inspections (
    company_id, store_id, target_month, store_manager_name, hygiene_officer_name,
    area_manager_name, area_hygiene_officer_name, implementer_name, overall_evaluation,
    improvement_reason, improvement_action, self_evaluation, special_notes, business_license_expiry_date,
    version, recorded_by, submitted_via
  ) values (
    v_company_id, v_store_id, v_target_month, nullif(p_store_manager_name, ''), nullif(p_hygiene_officer_name, ''),
    nullif(p_area_manager_name, ''), nullif(p_area_hygiene_officer_name, ''), p_implementer_name, v_overall,
    nullif(p_improvement_reason, ''), nullif(p_improvement_action, ''), p_self_evaluation, nullif(p_special_notes, ''), p_business_license_expiry_date,
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

revoke all on function public.kiosk_submit_inspection(text, text, jsonb, text, text, text, text, text, text, text, text, date) from public;
grant execute on function public.kiosk_submit_inspection(text, text, jsonb, text, text, text, text, text, text, text, text, date) to anon, authenticated;

commit;
