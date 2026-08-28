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
        <div className="space-y-2">
          {cart.items.map((item) => (
            <div
              key={item.key}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18A1.5 1.5 0 0022.5 18.75V5.25A1.5 1.5 0 0021 3.75H3A1.5 1.5 0 001.5 5.25v13.5A1.5 1.5 0 003 20.25z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                {Object.keys(item.detail).length > 0 && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {Object.entries(item.detail)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" / ")}
                  </p>
                )}
                <p className="mt-0.5 text-xs font-bold text-red-600">
                  ¥{item.unitPrice > 0 ? item.unitPrice.toLocaleString() : "無料"}
                  {item.lotSize > 1 ? `（ロット${item.lotSize}枚）` : ""}
                </p>
                <input
                  type="text"
                  value={item.memo}
                  onChange={(e) => cart.updateMemo(item.key, e.target.value)}
                  placeholder="明細備考（任意）"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <QuantityStepper
                  value={item.quantity}
                  onChange={(v) => cart.updateQuantity(item.key, v)}
                />
                <button
                  type="button"
                  onClick={() => cart.removeItem(item.key)}
                  className="rounded-md px-2 py-1 text-xs font-bold text-red-500 transition-colors hover:bg-red-50 active:bg-red-100"
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
          <div className="flex items-center gap-3 rounded-lg bg-red-500 px-4 py-2 text-white">
            <div>
              <p className="text-xs font-medium">合計 {cart.totalCount}点</p>
              <p className="text-base font-bold">¥{cart.totalAmount.toLocaleString()}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/ordering/confirm")}
            className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-600"
          >
            発注に進む
          </button>
        </StickyActionBar>
      )}

      {cart.items.length === 0 && (
        <div className="mt-4 text-center">
          <Link href="/ordering" className="text-sm text-blue-600 hover:underline">
            商品カタログに戻る
          </Link>
        </div>
      )}
    </div>
  );
}
