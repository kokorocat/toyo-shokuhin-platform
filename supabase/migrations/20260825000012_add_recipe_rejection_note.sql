-- RV-50(承認)の差し戻し理由を保存する列。categoryを流用して上書きすると業務データ
-- (レシピの分類)が壊れるため、専用の列を追加する。

alter table recipes add column if not exists rejection_note text;
