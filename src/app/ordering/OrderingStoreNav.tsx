"use client";

import Link from "next/link";
import { useCart } from "./CartContext";

const NAV = [
  { href: "/ordering", label: "商品一覧" },
  { href: "/ordering/cart", label: "カート" },
  { href: "/ordering/history", label: "発注履歴・請求" },
  { href: "/recipe", label: "レシピ閲覧" },
] as const;

function isActive(activePath: string, href: string): boolean {
  return href === "/ordering" ? activePath === "/ordering" : activePath.startsWith(href);
}

// サイドバー(sm以上)はhiddenでモバイル幅から隠れるため、モバイル向けに横スクロールの
// タブバーを別途用意する(でないと発注履歴・請求/レシピ閲覧への導線がモバイルで
// 完全に到達不能になる)。
export function OrderingStoreMobileNav({ activePath }: { activePath: string }) {
  const cart = useCart();
  return (
    <nav className="flex gap-1.5 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 sm:hidden">
      {NAV.map((item) => {
        const active = isActive(activePath, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
              active ? "border-orange-600 bg-orange-100 text-orange-800" : "border-slate-300 bg-white text-slate-600"
            }`}
          >
            {item.label}
            {item.href === "/ordering/cart" && cart.totalCount > 0 && (
              <span className="ml-1 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{cart.totalCount}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function OrderingStoreNav({ activePath }: { activePath: string }) {
  const cart = useCart();
  return (
    <nav className="space-y-1">
      {NAV.map((item) => {
        const active = isActive(activePath, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${
              active ? "bg-orange-100 text-orange-800" : "text-slate-700 hover:bg-white"
            }`}
          >
            <span>{item.label}</span>
            {item.href === "/ordering/cart" && cart.totalCount > 0 && (
              <span className="rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{cart.totalCount}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
