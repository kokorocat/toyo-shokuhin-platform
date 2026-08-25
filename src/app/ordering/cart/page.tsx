"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
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
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <div className="flex items-center rounded-lg border border-slate-300">
                  <button
                    type="button"
                    onClick={() => cart.updateQuantity(item.key, item.quantity - 1)}
                    className="px-2.5 py-1 text-slate-500 hover:bg-slate-50"
                    aria-label="数量を減らす"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => cart.updateQuantity(item.key, Number(e.target.value) || 1)}
                    className="w-12 border-x border-slate-300 py-1 text-center text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => cart.updateQuantity(item.key, item.quantity + 1)}
                    className="px-2.5 py-1 text-slate-500 hover:bg-slate-50"
                    aria-label="数量を増やす"
                  >
                    ＋
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => cart.removeItem(item.key)}
                  className="text-xs text-red-600 hover:underline"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {cart.items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] backdrop-blur-sm">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
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
          </div>
        </div>
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
