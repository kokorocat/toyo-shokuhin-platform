"use client";

import Link from "next/link";
import { useCart } from "./CartContext";

export function CartBar() {
  const cart = useCart();
  if (cart.totalCount === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">カート内 {cart.totalCount}点</p>
          <p className="text-base font-bold text-slate-900">{cart.totalAmount.toLocaleString()}円</p>
        </div>
        <Link
          href="/ordering/cart"
          className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900"
        >
          カートを見る
        </Link>
      </div>
    </div>
  );
}
