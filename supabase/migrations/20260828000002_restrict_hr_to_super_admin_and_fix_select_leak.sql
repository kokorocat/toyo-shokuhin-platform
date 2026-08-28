-- 緊急修正(2026-08-28): 完了状況の棚卸し中に発見した2件の人事データ露出。
--
-- (A) hr_persons_select/hr_employments_select/hr_employee_addresses_select/hr_assignments_select
--     (20260825000009)は private.user_company_ids() で絞り込んでいたが、この関数は役割を問わず
--     「その会社に何らかのuser_access_scopesを持つ全員」を返す(store_user含む)。つまり一般の
--     店舗利用者が、自分のログインセッションでSupabase REST APIを直接叩けば、所属会社の全従業員の
--     氏名・住所・雇用履歴・配属履歴を閲覧できてしまう状態だった(アプリのUI側isHrAdminRoleガードは
--     REST直叩きに対して無力なため、RLSこそが唯一の実効的な境界)。同ファイルのコメントが明言する
--     本来の意図(「company_admin/super_adminのみアクセス可能」)に反しており、書き込み側だけ
--     is_hr_admin()で絞り込み、読み取り側は絞り込みを忘れていた実装漏れ。
--
-- (B) is_hr_admin()/is_hr_admin_for_employee()自体もcompany_admin/super_adminの両方を許可していたが、
--     本日/master/usersが本番稼働したことで、super_adminがcompany_admin(広域戦略室スタッフに
--     日常的に付与される想定のロール)を誰にでも付与できる状態になった。クライアントが明言した
--     「人事システムは人事部専用」という要件を満たすには、company_adminへの自動付随を止め、
--     super_adminのみに絞る必要がある。

create or replace function private.is_hr_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select private.is_super_admin()
$$;
revoke all on function private.is_hr_admin() from public;
grant execute on function private.is_hr_admin() to authenticated;

create or replace function private.is_hr_admin_for_employee(p_employee_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select private.is_super_admin()
$$;
revoke all on function private.is_hr_admin_for_employee(uuid) from public;
grant execute on function private.is_hr_admin_for_employee(uuid) to authenticated;

drop policy if exists hr_persons_select on hr_persons;
create policy hr_persons_select on hr_persons
  for select using (private.is_hr_admin());

drop policy if exists hr_employments_select on hr_employments;
create policy hr_employments_select on hr_employments
  for select using (private.is_hr_admin());

drop policy if exists hr_employee_addresses_select on hr_employee_addresses;
create policy hr_employee_addresses_select on hr_employee_addresses
  for select using (private.is_hr_admin());

drop policy if exists hr_assignments_select on hr_assignments;
create policy hr_assignments_select on hr_assignments
  for select using (private.is_hr_admin());
