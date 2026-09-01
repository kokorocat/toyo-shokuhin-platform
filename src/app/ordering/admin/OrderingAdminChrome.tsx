import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/login/actions";

const TABS = [
  { href: "/ordering/admin/orders", label: "受注一覧", match: (p: string) => p.startsWith("/ordering/admin/orders") || p === "/ordering/admin" },
  { href: "/ordering/admin/products", label: "商品一覧", match: (p: string) => p.startsWith("/ordering/admin/products") },
  { href: "/ordering/admin/partners", label: "取引先一覧", match: (p: string) => p.startsWith("/ordering/admin/partners") },
  { href: "/ordering/admin/analytics", label: "分析", match: (p: string) => p.startsWith("/ordering/admin/analytics") },
] as const;

export function OrderingAdminChrome({
  activePath,
  displayName,
  children,
}: {
  activePath: string;
  displayName?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2">
          <p className="text-sm font-bold text-slate-800">販促物 受発注システム</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
              {displayName ?? "管理者"}
            </span>
            <Link href="." className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700">
              再読込
            </Link>
            <span className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700">
              通知メール管理
            </span>
            {/* 要確認: 通知メール管理の実画面・保存処理 */}
            <form action={signOut}>
              <button type="submit" className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white">
                ログアウト
              </button>
            </form>
          </div>
        </div>
      </header>
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-2 px-4 py-2">
          {TABS.map((tab) => {
            const active = tab.match(activePath);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={
                  active
                    ? "rounded-full bg-blue-100 px-4 py-1.5 text-sm font-bold text-blue-800"
                    : "rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600"
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="mx-auto max-w-6xl px-4 py-5">{children}</div>
    </div>
  );
}
