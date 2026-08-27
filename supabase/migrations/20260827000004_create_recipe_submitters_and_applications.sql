-- レシピ申請ワークフロー拡張(RV-30〜RV-50): 名簿ベースの申請者・複数ファイル一括申請の
-- グルーピング・3段階判定(承認して公開/承認/差し戻し)。2026-08-27にクライアントから
-- 実際のGAS画面(申請者一覧/メール通知管理、判定済みX/Y件の進捗表示)と共に確定した仕様。
-- 計画: /home/kokorocat/.claude/plans/sorted-meandering-teapot.md

-- 申請者名簿: ログインアカウントとは別に、会社ごとに管理者が管理する申請者名の小さなマスタ。
create table recipe_submitters (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  name text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recipe_submitters_company_id_idx on recipe_submitters(company_id);

-- 申請(バッチ)。1回の申請操作でまとめて送られた複数ファイル=複数recipes行の親。
-- 集計状態(承認待ち件数など)は保持しない。配下recipes.status/rejection_noteから都度導出する
-- (複数の判定アクションにまたがる非正規化列は同期漏れの温床になるため、あえて持たない)。
create table recipe_applications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  submitter_id uuid not null references recipe_submitters(id),
  submitted_by uuid not null references user_profiles(id),
  created_at timestamptz not null default now()
);
create index recipe_applications_company_id_idx on recipe_applications(company_id);

-- 既存行(application_idはnullのまま)は「単独バッチ」として承認画面側で扱う。バックフィル不要。
alter table recipes add column application_id uuid references recipe_applications(id);
create index recipes_application_id_idx on recipes(application_id);

-- 3段階判定: 'approved' = 社内承認済みだが未公開(レシピ一覧にはまだ出さない)。
alter table recipes drop constraint if exists recipes_status_check;
alter table recipes add constraint recipes_status_check
  check (status in ('draft', 'approved', 'published'));
