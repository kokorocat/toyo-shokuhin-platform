-- HC-10(重要ポイント・温度・ラベル)の本格対応(2026-08-31)。これまでchecked(boolean)による
-- 「確認した/してない」のチェックのみで、仕様書が要求する良/否判定・確認者名・否の場合の理由必須化が
-- 未実装だった(page.tsx上に「暫定的な構成」と明記されたままだった)。checkedは食品安全の合否判定として
-- 意味を持たない項目だったため、judgment(ok/ng)へ作り直す。旧checkedのデータは合否として意味の
-- ある値ではないため引き継がず、開発中に入っていたテストデータを含めここで削除する(合意済みの
-- パターン、20260826000004と同様)。

begin;

delete from haccp_keypoint_responses;

alter table haccp_keypoint_responses add column confirmed_by_name text;

alter table haccp_keypoint_items drop column checked;
alter table haccp_keypoint_items add column judgment text not null check (judgment in ('ok', 'ng'));

-- kiosk_submit_keypoint: p_itemsの各要素をchecked→judgmentへ、確認者名(p_confirmed_by_name)を追加。
-- 否(ng)の場合の理由必須は、authenticated版(haccp/keypoint/actions.ts)と同じくRPC内でも検証する
-- (未ログイン公開リンク経由の直接呼び出しに対する多重防御)。
drop function if exists public.kiosk_submit_keypoint(text, date, jsonb, numeric, text, text, text, text);

create or replace function public.kiosk_submit_keypoint(
  p_token text,
  p_target_date date,
  p_confirmed_by_name text,
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
  v_judgment text;
  v_note text;
  v_codes text[] := array['heat_room', 'heat_cold', 'nonheat_room', 'nonheat_cold', 'mixed_room', 'mixed_cold'];
begin
  select id, company_id into v_store_id, v_company_id from stores where public_access_token = p_token and status = 'active';
  if v_store_id is null then
    raise exception '無効なアクセスリンクです';
  end if;
  if p_target_date is null then
    raise exception '対象日を入力してください';
  end if;
  if nullif(trim(p_confirmed_by_name), '') is null then
    raise exception '確認者名を入力してください';
  end if;

  foreach v_code in array v_codes loop
    if not (p_items ? v_code) then
      raise exception '項目が不足しています: %', v_code;
    end if;
    v_judgment := p_items -> v_code ->> 'judgment';
    if v_judgment not in ('ok', 'ng') then
      raise exception '項目の判定が不正です: %', v_code;
    end if;
    if v_judgment = 'ng' and nullif(trim(p_items -> v_code ->> 'note'), '') is null then
      raise exception '否の項目には理由の入力が必要です: %', v_code;
    end if;
  end loop;

  if p_temp_judgment = 'ng' and nullif(trim(p_temp_note), '') is null then
    raise exception '温度チェックがNGの場合は理由の入力が必要です';
  end if;
  if p_label_judgment = 'ng' and nullif(trim(p_label_note), '') is null then
    raise exception 'ラベルチェックがNGの場合は理由の入力が必要です';
  end if;

  select coalesce(max(version), 0) + 1 into v_next_version
  from haccp_keypoint_responses
  where store_id = v_store_id and target_date = p_target_date;

  insert into haccp_keypoint_responses (company_id, store_id, target_date, version, recorded_by, confirmed_by_name, submitted_via)
  values (v_company_id, v_store_id, p_target_date, v_next_version, null, trim(p_confirmed_by_name), 'public_link')
  returning id into v_response_id;

  foreach v_code in array v_codes loop
    v_judgment := p_items -> v_code ->> 'judgment';
    v_note := nullif(p_items -> v_code ->> 'note', '');
    insert into haccp_keypoint_items (response_id, item_code, judgment, note)
    values (v_response_id, v_code, v_judgment, v_note);
  end loop;

  if p_temp_value is not null or nullif(p_temp_judgment, '') is not null or nullif(p_temp_note, '') is not null then
    insert into haccp_temperature_labels (response_id, label_type, measured_value, judgment, note)
    values (v_response_id, 'temperature', p_temp_value, nullif(p_temp_judgment, ''), nullif(p_temp_note, ''));
  end if;

  if nullif(p_label_judgment, '') is not null or nullif(p_label_note, '') is not null then
    insert into haccp_temperature_labels (response_id, label_type, measured_value, judgment, note)
    values (v_response_id, 'label', null, nullif(p_label_judgment, ''), nullif(p_label_note, ''));
  end if;

  insert into audit_logs (actor_id, system_code, action, target_table, target_id, after_data)
  values (
    null, 'haccp', 'keypoint_record_public', 'haccp_keypoint_responses', v_response_id,
    jsonb_build_object('store_id', v_store_id, 'target_date', p_target_date, 'version', v_next_version)
  );

  return v_response_id;
end;
$$;

revoke all on function public.kiosk_submit_keypoint(text, date, text, jsonb, numeric, text, text, text, text) from public;
grant execute on function public.kiosk_submit_keypoint(text, date, text, jsonb, numeric, text, text, text, text) to anon, authenticated;

commit;
