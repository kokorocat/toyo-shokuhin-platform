-- audit_logsはSELECTポリシーのみ存在し、INSERTポリシーがなかったため誰も書き込めなかった。
-- 自分の行為(actor_id = auth.uid())のみ挿入可能とする。閲覧は引き続きsuper_admin限定。

drop policy if exists "audit_logs_insert_self" on audit_logs;
create policy "audit_logs_insert_self" on audit_logs
  for insert with check (actor_id = auth.uid());
