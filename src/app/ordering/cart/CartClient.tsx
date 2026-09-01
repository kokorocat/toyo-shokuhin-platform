"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { StickyActionBar } from "@/components/StickyActionBar";
import { QuantityStepper } from "../QuantityStepper";
import { useCart } from "../CartContext";
import { todayInTokyo } from "@/lib/date";

export default function CartClient({ storeName }: { storeName: string }) {
  const cart = useCart();
  const router = useRouter();
  const defaultAddress = `${storeName} 既定配送先`;

  return (
    <div className="pb-32">
      {cart.items.length === 0 ? (
        <EmptyState message="カートに商品がありません。" />
      ) : (
        <>
          <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-900">発注情報（配送先は任意です）</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-600">発注日</label>
                <input type="date" defaultValue={todayInTokyo()} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">配送先（任意）</label>
                <select defaultValue={defaultAddress} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value={defaultAddress}>{defaultAddress}</option>
                </select>
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-slate-800">
              {defaultAddress}{" "}
              <span className="ml-1 rounded bg-teal-600 px-1.5 py-0.5 text-[10px] font-bold text-white">デフォルト</span>
              <p className="mt-1 text-xs text-slate-600">{storeName}</p>
            </div>
            <p className="mt-2 text-xs text-blue-700">▶ 配送先を追加・更新</p>
            {/* 要確認: 店舗の登録済み住所帳。stores に住所カラムが無いため店舗名を既定配送先として表示。 */}
            <label className="mt-3 mb-1 block text-xs text-slate-600">備考</label>
            <textarea
              rows={3}
              placeholder="リストにない販促物等があれば記入して下さい。"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">カート内容</h2>
              <button
                type="button"
                onClick={() => cart.clear()}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700"
              >
                カート内をすべて削除
              </button>
            </div>
            <div className="space-y-2">
              {cart.items.map((item) => {
                const lineTotal = item.unitPrice * item.lotSize * item.quantity;
                const sheetTotal = item.lotSize * item.quantity;
                return (
                  <div key={item.key} className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-b-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] text-slate-400">
                      NO IMAGE
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        ラミネート: なし / 単価: ¥{item.unitPrice.toLocaleString()} / 数量: {item.quantity} / 合計 {sheetTotal}枚 / 金額: ¥{lineTotal.toLocaleString()}
                      </p>
                      <input
                        type="text"
                        value={item.memo}
                        onChange={(e) => cart.updateMemo(item.key, e.target.value)}
                        placeholder="この商品への備考（任意）"
                        className="mt-1.5 w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                      />
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <QuantityStepper value={item.quantity} onChange={(v) => cart.updateQuantity(item.key, v)} />
                      <button type="button" onClick={() => cart.removeItem(item.key)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">
                        削除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {cart.items.length > 0 && (
        <StickyActionBar>
          <div>
            <p className="text-sm font-bold text-red-800">商品数 {cart.totalCount}</p>
            <p className="text-lg font-bold text-red-600">合計金額（税抜） ¥{cart.totalAmount.toLocaleString()}</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/ordering/confirm")}
            className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white"
          >
            発注内容を確認する
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
