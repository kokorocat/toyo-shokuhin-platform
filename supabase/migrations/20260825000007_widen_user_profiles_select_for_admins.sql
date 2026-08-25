-- user_profilesは元々「本人 or super_admin」のみ閲覧可能だったため、HACCP管理者ダッシュボード
-- (HM-20)がcompany_admin/area_adminとして開いた場合、回答の記録者名が常に「(不明)」になっていた。
-- display_nameは氏名のみで機密性は低く、会社別・エリア管理者が自スコープ内の回答者を識別できる
-- ことは業務上必要なため、company_admin/area_adminロールにも閲覧を許可する(スコープ限定はしない
-- — employee_id経由でのstore/areaスコープ結合はこのテーブルの目的に対して過剰な複雑化のため)。

drop policy if exists "user_profiles_select_admin" on user_profiles;
create policy "user_profiles_select_admin" on user_profiles
  for select using (
    exists (
      select 1
      from user_access_scopes uas
      join roles r on r.id = uas.role_id
      where uas.user_id = auth.uid()
        and r.code in ('company_admin', 'area_admin')
        and (uas.ended_on is null or uas.ended_on >= current_date)
    )
  );
