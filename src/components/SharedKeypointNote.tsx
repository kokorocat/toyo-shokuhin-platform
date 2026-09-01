"use client";

import { useState } from "react";

// GASは特記事項をテーブル末尾に1欄だけ置く。以前はこの1つの値を全項目のnote_${code}へ
// そのままコピー送信していたため、「良」の項目にも他項目の否理由がそのまま記録されて
// しまう不具合があった。単一のshared_noteとして送信し、サーバー側(actions.ts)で
// 「否」の項目にのみ適用するよう変更した。
export function SharedKeypointNote() {
  const [value, setValue] = useState("");
  return (
    <div className="border-t border-slate-200 px-5 py-4">
      <p className="mb-1 text-xs font-medium text-slate-500">
        特記事項（※重要ポイントで「否」が1つでもある場合、理由の記入が必須）
      </p>
      <textarea
        name="shared_note"
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="例）③否：ラベル表示に差異があったため、差替え済み。など"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
      />
    </div>
  );
}
