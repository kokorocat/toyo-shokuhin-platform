"use client";

import Link from "next/link";
import { StickyActionBar } from "@/components/StickyActionBar";
import { useCart } from "./CartContext";

export function CartBar() {
  const cart = useCart();
  if (cart.totalCount === 0) return null;

  return (
    <StickyActionBar>
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
    </StickyActionBar>
  );
}
