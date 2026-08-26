"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StickyActionBar } from "@/components/StickyActionBar";
import { QuantityStepper } from "../QuantityStepper";
import { useCart } from "../CartContext";

export default function CartPage() {
  const cart = useCart();
  const router = useRouter();

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6 pb-32">
      <PageHeader backHref="/ordering" backLabel="商品カタログに戻る" title="カート" />

      {cart.items.length === 0 ? (
        <EmptyState message="カートに商品がありません。" />
      ) : (
        <div className="space-y-3">
          {cart.items.map((item) => (
            <div
              key={item.key}
              className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{item.name}</p>
                {Object.keys(item.detail).length > 0 && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {Object.entries(item.detail)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" / ")}
                  </p>
                )}
                <p className="mt-1 text-xs text-red-600">
                  {item.unitPrice > 0 ? `${item.unitPrice}円` : "無料"}
                  {item.lotSize > 1 ? `（ロット${item.lotSize}枚）` : ""}
                </p>
                <input
                  type="text"
                  value={item.memo}
                  onChange={(e) => cart.updateMemo(item.key, e.target.value)}
                  placeholder="明細備考（任意）"
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <QuantityStepper
                  value={item.quantity}
                  onChange={(v) => cart.updateQuantity(item.key, v)}
                />
                <button
                  type="button"
                  onClick={() => cart.removeItem(item.key)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 active:bg-red-100"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {cart.items.length > 0 && (
        <StickyActionBar>
          <div>
            <p className="text-xs text-slate-500">合計 {cart.totalCount}点</p>
            <p className="text-base font-bold text-slate-900">{cart.totalAmount.toLocaleString()}円</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/ordering/confirm")}
            className="rounded-lg bg-blue-800 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900"
          >
            発注に進む
          </button>
        </StickyActionBar>
      )}

      {cart.items.length === 0 && (
        <div className="mt-4 text-center">
          <Link href="/ordering" className="text-sm text-blue-700 hover:underline">
            商品カタログに戻る
          </Link>
        </div>
      )}
    </div>
  );
}
