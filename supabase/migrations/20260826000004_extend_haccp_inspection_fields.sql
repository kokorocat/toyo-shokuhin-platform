-- クライアント提供の原紙(食品自主点検表原紙.xlsx)確認により判明した、既存実装に欠けていた
-- ヘッダー/フッター項目を追加する。self_evaluationは既存行への影響を避けるためnullable
-- とし、「必須」はアプリ層(actions.ts)で担保する(他の任意項目と同じ運用)。
alter table haccp_inspections
  add column area_manager_name text,
  add column area_hygiene_officer_name text,
  add column self_evaluation text check (self_evaluation in ('good', 'needs_improvement')),
  add column special_notes text,
  add column business_license_expiry_date date;

-- 旧仮設問(一般的な17問の暫定コード q1〜q17)期間中に登録された自主点検データを削除する。
-- 新設問は旧q1〜q3と同じコードを異なる質問文で再利用するため、削除せず残すと「回答した
-- 覚えのない設問への回答」が新しい設問文の下にそのまま表示されてしまう(食品衛生の記録
-- として実際の回答内容と食い違う、削除より悪い結果になる)。旧設問は暫定である旨を
-- 画面上に明示していたテスト期間のデータのみが対象で、正式な自主点検データではない。
delete from haccp_inspections;

-- 自主点検項目を、原紙で確認した実際の8カテゴリ18項目のコード体系に合わせて更新する
-- (旧: 一般的な17問の暫定コード q1〜q17)。
alter table haccp_inspection_items
  drop constraint if exists haccp_inspection_items_question_code_check;

alter table haccp_inspection_items
  add constraint haccp_inspection_items_question_code_check
  check (question_code ~ '^q([1-3]|[4-8]_[1-4])$');
