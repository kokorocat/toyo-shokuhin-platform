-- createNotice/uploadManualの途中失敗時ロールバック(不完全な行を削除してやり直せる状態に戻す)
-- を実際に機能させるため、DELETEポリシーを追加する。これまでSELECT/INSERT/UPDATEのみで
-- DELETEが無く、アプリ側でdelete()を呼んでもRLSにより常に0件影響のまま黙って失敗していた。
-- 境界はUPDATEと同じ(作成者本人またはsuper_admin)。manual_versions/manual_scopes/notice_scopes
-- はmanuals/portal_noticesへのon delete cascadeが既に設定済みのため、この行を消せば
-- 関連行も連動して片付く。

begin;

create policy "portal_notices_delete" on portal_notices
  for delete using (private.is_super_admin() or created_by = auth.uid());

create policy "manuals_delete" on manuals
  for delete using (private.is_super_admin() or created_by = auth.uid());

commit;
