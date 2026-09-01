import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/login/actions";
import { OrderingStoreMobileNav, OrderingStoreNav } from "./OrderingStoreNav";

export function OrderingStoreShell({
  activePath,
  storeLabel,
  children,
}: {
  activePath: string;
  storeLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
          <p className="text-sm font-bold text-slate-800">販促物 受発注システム</p>
          <div className="flex flex-wrap items-center gap-2">
            {storeLabel && (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">{storeLabel}</span>
            )}
            <Link href="." className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
              再読込
            </Link>
            <form action={signOut}>
              <button type="submit" className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white">
                ログアウト
              </button>
            </form>
          </div>
        </div>
      </header>
      <OrderingStoreMobileNav activePath={activePath} />
      <div className="flex min-h-[calc(100vh-44px)]">
        <aside className="hidden w-52 shrink-0 border-r border-slate-200 bg-slate-50 p-3 sm:block">
          <OrderingStoreNav activePath={activePath} />
        </aside>
        <main className="min-w-0 flex-1 px-4 py-5">{children}</main>
      </div>
    </div>
  );
}
