insert into roles (code, name, description) values
  ('store_user', '店舗利用者', '自店舗のみ利用可能'),
  ('store_manager', '店舗責任者', '自店舗の確認・申請権限を含む'),
  ('area_admin', 'エリア管理者', '担当会社・担当エリアの店舗検索、管理画面へのアクセス'),
  ('company_admin', '会社管理者', '担当会社配下の店舗検索・管理画面・コンテンツ管理'),
  ('super_admin', '全権限管理者', '全社・全エリア・全機能。company_id等を指定しないscopeで判定'),
  ('system_maintenance', 'システム保守', '障害調査・移行バッチ用。恒常的な業務データ閲覧権限は持たない');

insert into system_applications (code, name, base_url, status) values
  ('portal', '広域ポータル', null, 'active'),
  ('haccp', 'HACCP管理システム', null, 'active'),
  ('ordering', '販促物受発注システム', null, 'active'),
  ('recipe', 'レシピ閲覧システム', null, 'active'),
  ('store_master', '店舗・従業員マスター', null, 'active'),
  ('hr', '人事労務管理システム', null, 'active');
