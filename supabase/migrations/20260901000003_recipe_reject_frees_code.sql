-- レシピ承認ワークフロー: 差し戻し(却下)されたレシピが、同じ呼出番号での再提出を
-- 永久にブロックしてしまう不具合の修正。原因は物理削除しない設計(status遷移のみ)と、
-- company_id+recipe_codeの無条件unique制約の組み合わせ: rejectRecipeはstatus='draft'に
-- 戻すだけで、submitRecipe側の重複チェックはstatusを見ないため、差し戻し後の再提出が
-- 「呼出番号は既に存在します」で常にブロックされていた。
--
-- 対応: 差し戻しを既存の'draft'/'approved'/'published'と区別できる独自のstatus値
-- 'rejected'として扱い、company_id+recipe_codeの一意制約をrejected行を除いた部分unique
-- indexに置き換える。差し戻された行はそのまま履歴として残しつつ(物理削除原則を維持)、
-- 同じ呼出番号での新規行の作成(=再提出)がDBレベルで正しく許可されるようになる。

begin;

alter table recipes drop constraint if exists recipes_status_check;
alter table recipes add constraint recipes_status_check
  check (status in ('draft', 'approved', 'published', 'rejected'));

-- 旧方式(status='draft' かつ rejection_note有り)で差し戻し済みだった既存行を新方式に移行する。
update recipes set status = 'rejected' where status = 'draft' and rejection_note is not null;

-- (company_id, recipe_code)のunique制約を名前ではなく列構成で特定して削除する。
-- create table内のインラインunique(...)はPostgresのデフォルト命名規則に依存するため、
-- 名前を決め打ちしてdrop constraint if existsするとタイポ/命名違いで静かに何もせず
-- 素通りしてしまう危険がある(その場合、旧来の完全一意制約が残ったままとなり、以下の
-- 部分unique indexを作成しても差し戻し行が引き続きブロックされ続けるが、エラーは出ない
-- ため気づきにくい)。実際の制約名を動的に調べて確実に削除する。
do $$
declare
  v_constraint_name text;
begin
  select tc.constraint_name into v_constraint_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on kcu.constraint_name = tc.constraint_name
   and kcu.table_schema = tc.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'recipes'
    and tc.constraint_type = 'UNIQUE'
  group by tc.constraint_name
  -- kcu.column_nameはinformation_schema.sql_identifier型でtext[]と直接比較できないため、
  -- 両辺を明示的にtext[]へキャストする(未キャストだと"operator does not exist"で
  -- このDOブロックごとエラーになり、begin/commitの外側トランザクションがロールバックして
  -- このマイグレーション全体が何も適用せず静かに失敗する — Docker実証検証で確認済み)。
  having array_agg(kcu.column_name::text order by kcu.column_name) = array['company_id', 'recipe_code']::text[]
  limit 1;

  if v_constraint_name is not null then
    execute format('alter table recipes drop constraint %I', v_constraint_name);
  end if;
end $$;

create unique index if not exists recipes_company_id_recipe_code_active_key
  on recipes (company_id, recipe_code)
  where status <> 'rejected';

commit;
