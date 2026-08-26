-- 店舗・従業員マスター管理機能の追加(2/2): user_access_scopesへのロール/スコープ付与・取り消し。
--
-- user_access_scopesは現状SELECT(自分自身の行のみ)しかポリシーが無く、INSERT/UPDATEの経路が
-- 一切存在しない。このテーブルはユーザーのロール・アクセス範囲そのものを決定するため、全マスター
-- データの中でも最も影響範囲が大きい(誤ると権限昇格に直結する)。
--
-- 通常のRLS insertポリシーではなく SECURITY DEFINER のRPC関数として実装する。理由:
--   1) 権限昇格の上限・自社範囲チェック・「company/area/storeのいずれか1つのみ、かつロールコードと
--      整合すること」という制約(DBのCHECK制約が存在しないため、この関数が唯一の担保箇所)を
--      1箇所のSQLに集約できる。
--   2) 失敗理由を Banner variant="error" にそのまま出せる日本語メッセージとして返せる。
--   3) 「既存の有効スコープを終了させてから新規行を追加する」の2ステップを1つの関数内でアトミックに
--      行える(2回に分けたclient呼び出しでは部分失敗のリスクがある)。
-- PostgRESTは private.* をrpc経由で公開しないため、public スキーマに定義する
-- (既存の private.* ヘルパーとは異なる、意図した配置)。

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

  -- ロールとディメンションの整合性を厳密に検証する(DBに制約が無いため、この関数が唯一の担保箇所)。
  -- company_id⇒company_admin、area_id⇒area_admin、store_id⇒store_user/store_manager、
  -- 全てnull⇒super_admin/system_maintenance のみを許可し、それ以外の組み合わせは一切拒否する。
  -- private.user_store_ids()の会社レベル分岐はロールコードを見ずに会社スコープ行を店舗アクセスに
  -- 変換するため、ここで対応関係を強制しないとラベルと実際の権限範囲が食い違ってしまう。
  if p_role_code in ('super_admin', 'system_maintenance') then
    if p_company_id is not null or p_area_id is not null or p_store_id is not null then
      raise exception '%ロールはcompany_id/area_id/store_idをすべて空にしてください', p_role_code;
    end if;
  elsif p_role_code = 'company_admin' then
    if p_company_id is null or p_area_id is not null or p_store_id is not null then
      raise exception 'company_adminロールはcompany_idのみを指定してください';
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

  -- 会社IDを解決する(存在確認も兼ねる)。
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

  -- 権限昇格の上限: super_admin以外は company_admin/super_admin/system_maintenance を付与できない。
  if p_role_code in ('company_admin', 'super_admin', 'system_maintenance') and not private.is_super_admin() then
    raise exception '自分以上の権限を付与することはできません';
  end if;

  -- 対象の会社スコープに対して実際にcompany_adminであること(またはsuper_adminであること)を検証する。
  -- private.user_company_ids()(「その会社に何らかのスコープを持つか」)ではなく、対象会社そのものへの
  -- company_admin権限を要求する private.is_company_admin_for() を使う — 「別の会社の下位スコープを
  -- 持っているだけ」では通過しない。role_code=super_admin/system_maintenanceの場合は
  -- v_resolved_company_idがnullのため、is_company_admin_for(null)はis_super_admin()と同値になる。
  if not private.is_company_admin_for(v_resolved_company_id) then
    raise exception 'この操作を行う権限がありません';
  end if;

  -- 同一ディメンション(company/area/storeのどれを指しているか)に既にアクティブなスコープがある場合、
  -- 無条件に上書きしない。特権ロール(company_admin/super_admin/system_maintenance)が既に存在する
  -- 場合は、super_admin以外はここで拒否する(revoke_user_access_scopeと同じ保護を、grantの
  -- 副作用としての終了処理にも適用する — でなければ「無関係な低権限ロールの付与」を装って
  -- 他者の管理者権限を副作用として終了させられてしまう)。
  -- 補足: 上のロール↔ディメンション整合性チェックにより、非super_adminはそもそも
  -- company_id/nullディメイン(=特権ロールが占有する場所)に到達できないため、現状このガードは
  -- 非super_adminからは到達不能(=多層防御として意図的に残している。ディメンション検証を将来
  -- 変更する際に、この保護が黙って無効化されないよう明示しておく)。
  select uas.role_id, r.code into v_existing_role_id, v_existing_role_code
  from user_access_scopes uas
  join roles r on r.id = uas.role_id
  where uas.user_id = p_target_user_id
    and (uas.ended_on is null or uas.ended_on >= current_date)
    and coalesce(uas.company_id, uas.area_id, uas.store_id) is not distinct from coalesce(p_company_id, p_area_id, p_store_id)
  limit 1;

  if v_existing_role_id is not null and v_existing_role_id <> v_role_id then
    if not private.is_super_admin() and v_existing_role_code in ('company_admin', 'super_admin', 'system_maintenance') then
      raise exception '既存の管理者権限を上書きすることはできません。先にrevoke_user_access_scopeで明示的に取り消してください';
    end if;
  end if;

  -- 既存の有効スコープ(同一ディメンション)を終了させてから新規行を追加する(履歴を保持し
  -- 上書きしない — employee_assignmentsと同じ考え方)。
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

revoke all on function public.grant_user_access_scope(uuid, text, uuid, uuid, uuid, date) from public;
grant execute on function public.grant_user_access_scope(uuid, text, uuid, uuid, uuid, date) to authenticated;

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

  -- 取り消しは「終了日を早める」操作に限定する。将来日付を指定して有効期限を延長する
  -- (実質的な再付与)ことを防ぐ。
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

  if v_target_role_code in ('company_admin', 'super_admin', 'system_maintenance') then
    if not private.is_super_admin() then
      raise exception 'この権限の取り消しはできません';
    end if;
  else
    -- 呼び出し元が対象スコープの会社に対して実際にcompany_admin(またはsuper_admin)であることを
    -- 検証する。修正前はこのチェックが完全に欠落しており、いかなる権限も持たない一般ユーザーが
    -- 他者のスコープを取り消せてしまっていた。
    if not private.is_company_admin_for(v_resolved_company_id) then
      raise exception 'この操作を行う権限がありません';
    end if;
  end if;

  -- 終了日を早める場合のみ更新する(既存のended_onより後ろに動かす=延長は許可しない)。
  update user_access_scopes
  set ended_on = p_ended_on
  where id = p_scope_id
    and (ended_on is null or ended_on > p_ended_on);
end;
$$;

revoke all on function public.revoke_user_access_scope(uuid, date) from public;
grant execute on function public.revoke_user_access_scope(uuid, date) to authenticated;
