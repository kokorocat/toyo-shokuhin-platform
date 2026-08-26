"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Banner } from "@/components/Banner";
import { StickyActionBar } from "@/components/StickyActionBar";
import { useCart } from "../CartContext";
import { confirmOrder } from "./actions";

export default function ConfirmClient({
  storeId,
  companyId,
  storeName,
  storeCode,
}: {
  storeId: string;
  companyId: string;
  storeName: string;
  storeCode: string;
}) {
  const cart = useCart();
  const router = useRouter();
  const [deliveryDate, setDeliveryDate] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
        <PageHeader backHref="/ordering" backLabel="商品カタログに戻る" title="発注確認" />
        <p className="text-sm text-slate-500">カートが空です。商品を選択してください。</p>
      </div>
    );
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await confirmOrder({
        storeId,
        companyId,
        deliveryDate,
        shippingAddress,
        memo,
        items: cart.items,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      cart.clear();
      router.push("/ordering/history?success=1");
    });
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6 pb-32">
      <PageHeader
        backHref="/ordering/cart"
        backLabel="カートに戻る"
        title="発注確認"
        subtitle={`${storeName}（${storeCode}）`}
      />

      {error && (
        <div className="mb-5">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <div className="mb-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">注文内容</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {cart.items.map((item) => (
            <li key={item.key} className="px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-800">
                  {item.name} × {item.quantity}
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {(item.unitPrice * item.lotSize * item.quantity).toLocaleString()}円
                </p>
              </div>
              {Object.keys(item.detail).length > 0 && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {Object.entries(item.detail)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" / ")}
                </p>
              )}
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          <p className="text-sm font-bold text-slate-900">合計</p>
          <p className="text-lg font-bold text-red-600">{cart.totalAmount.toLocaleString()}円</p>
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold text-slate-900">配送情報（任意）</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">納品日</label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">配送先（未入力の場合は店舗住所）</label>
            <input
              type="text"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">注文全体備考</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>

      <StickyActionBar>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          aria-busy={isPending}
          className={`w-full rounded-lg bg-blue-800 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 ${
            isPending ? "cursor-wait opacity-60" : ""
          }`}
        >
          {isPending ? "送信中..." : "この内容で発注を確定する"}
        </button>
      </StickyActionBar>
    </div>
  );
}
