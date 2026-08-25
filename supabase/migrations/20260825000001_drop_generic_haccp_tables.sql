-- 本日確定仕様書(東洋食品HACCP管理システム 本番移行実装仕様書 v1.0)に基づき、
-- 全体構成図ベースで作成した汎用的なHACCP実装を正しいテーブル設計へ置き換える。
drop table if exists haccp_corrective_actions;
drop table if exists haccp_daily_approvals;
drop table if exists haccp_hygiene_records;
drop table if exists haccp_hygiene_items;
drop table if exists haccp_temperature_records;
drop table if exists haccp_check_points;
