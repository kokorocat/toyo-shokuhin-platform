-- 全てのRLSポリシーがprivate.*(is_super_admin, user_company_ids, is_recipe_admin_for_company等,
-- 20260816000003以降)をSECURITY DEFINER関数として呼び出しているが、authenticated/service_role
-- ロールへのschema usage権限を付与するマイグレーションがこれまで一度も存在しなかった(本番環境では
-- 別途ダッシュボード等で付与済みのため気づかれていなかった — アドバーサリアルレビューで、
-- マイグレーション一式だけから新規環境を再構築しようとした際に発覚)。この権限が無い環境では、
-- 行が0件返るのではなく「permission denied for schema private」で全RLSポリシーが失敗する。
-- 災害復旧・新規ステージング環境構築・CI等でマイグレーションのみからの再現性を保つため、
-- 冪等な形で明示的に付与しておく。
grant usage on schema private to authenticated, service_role;
