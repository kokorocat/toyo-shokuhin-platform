-- recipe_submitters / recipe_applications のRLS。既存のprivate.is_recipe_admin_for_company()を
-- そのまま再利用する(新規申請/申請履歴/申請者名簿管理と同じ「広域(company_admin)+全権限管理者
-- (super_admin)」の権限区分に完全に一致するため)。

alter table recipe_submitters enable row level security;

create policy "recipe_submitters_select" on recipe_submitters
  for select using (private.is_recipe_admin_for_company(company_id));

create policy "recipe_submitters_insert" on recipe_submitters
  for insert with check (private.is_recipe_admin_for_company(company_id));

-- 名簿は名称変更・有効/無効の切替のみ(物理削除しない — 過去の申請がsubmitter_idを
-- 参照しており、削除すると履歴表示が壊れる。既存の「status列によるソフト削除のみ」規約に従う)。
create policy "recipe_submitters_update" on recipe_submitters
  for update
  using (private.is_recipe_admin_for_company(company_id))
  with check (private.is_recipe_admin_for_company(company_id));

alter table recipe_applications enable row level security;

create policy "recipe_applications_select" on recipe_applications
  for select using (private.is_recipe_admin_for_company(company_id));

create policy "recipe_applications_insert" on recipe_applications
  for insert with check (private.is_recipe_admin_for_company(company_id));

-- recipe_applicationsにUPDATE/DELETEポリシーは設けない。申請時点のスナップショットとして
-- 不変に保つ(判定結果は配下recipes.status/rejection_noteにのみ記録する)。
