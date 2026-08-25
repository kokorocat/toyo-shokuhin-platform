-- デモ用店舗アカウント(shinjuku-store@toyo-shokuhin.test)を店舗責任者ロールへ変更。
-- 店舗利用者ロールのままでは責任者確認機能を確認できないための対応。
update user_access_scopes uas
set role_id = (select id from roles where code = 'store_manager')
where uas.user_id = (select id from auth.users where email = 'shinjuku-store@toyo-shokuhin.test')
  and uas.role_id = (select id from roles where code = 'store_user');
