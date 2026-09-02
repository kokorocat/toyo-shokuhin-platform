"use client";

import { useState } from "react";

// ログインID/パスワードの検証方法自体は取引先・管理者で変わらない(supabase.auth.signInWithPassword
// はロール非依存)ため、このタブは見た目の切替のみ(要確認: 実際にGASのように検証ロジックや
// 遷移先を分けるべきかはクライアント確認)。ただし見た目の切替すら無いと、クリックしても
// 何も起きないように見えてしまうため、アクティブ状態の切替だけは実装する。
export function LoginTypeTabs() {
  const [active, setActive] = useState<"partner" | "admin">("partner");
  return (
    <div className="flex rounded-lg border border-slate-200 p-1">
      <button
        type="button"
        onClick={() => setActive("partner")}
        className={`flex-1 rounded-md py-1.5 text-center text-xs font-bold transition-colors ${
          active === "partner" ? "bg-blue-700 text-white" : "text-slate-600"
        }`}
      >
        取引先ログイン
      </button>
      <button
        type="button"
        onClick={() => setActive("admin")}
        className={`flex-1 rounded-md py-1.5 text-center text-xs font-bold transition-colors ${
          active === "admin" ? "bg-blue-700 text-white" : "text-slate-600"
        }`}
      >
        管理者ログイン
      </button>
    </div>
  );
}
