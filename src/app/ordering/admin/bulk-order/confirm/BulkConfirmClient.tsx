"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Banner } from "@/components/Banner";
import { StickyActionBar } from "@/components/StickyActionBar";
import { useCart } from "@/app/ordering/CartContext";
import { getSelectedStoreIds, setSelectedStoreIds as persistSelectedStoreIds, clearSelectedStoreIds } from "../selected-stores";
import { bulkConfirmOrder } from "./actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

export function BulkConfirmClient({
  companyId,
  allStores,
}: {
  companyId: string;
  allStores: { id: string; name: string; store_code: string }[];
}) {
  const cart = useCart();
  const router = useRouter();
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // 現在の会社の店舗一覧(allStores)に実在するIDだけを有効とする。別会社・非アクティブ店舗の
    // 古いlocalStorageが残っていた場合はここで除外し、除外後の内容をlocalStorageへ書き戻す
    // (画面に表示される選択店舗数と、実際に送信される内容を常に一致させるため)。
    const stored = getSelectedStoreIds();
    const valid = stored.filter((id) => allStores.some((s) => s.id === id));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedStoreIds(valid);
    if (valid.length !== stored.length) {
      persistSelectedStoreIds(valid);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedStores = allStores.filter((s) => selectedStoreIds.includes(s.id));

  if (hydrated && (selectedStores.length === 0 || cart.items.length === 0)) {
    return (
      <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
        <div className="mb-6">
          <Link href="/ordering/admin/bulk-order" className="text-sm text-blue-600 hover:underline">← カタログに戻る</Link>
          <h1 className="mt-2 text-lg font-bold text-slate-800">一斉発注確認</h1>
        </div>
        <p className="text-sm text-slate-500">
          {cart.items.length === 0 ? "カートが空です。" : "発注先の店舗が選択されていません。"}商品と店舗を選択してください。
        </p>
      </div>
    );
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      // 画面に表示している(=会社の現在の店舗一覧で検証済みの)店舗IDのみを送信する。
      // localStorageの生の値をそのまま送ると、画面表示と実際の発注先がずれる可能性がある。
      const storeIds = selectedStores.map((s) => s.id);
      const result = await bulkConfirmOrder({
        companyId,
        storeIds,
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
      clearSelectedStoreIds();
      if (result.failures.length > 0) {
        const failedNames = result.failures
          .map((f) => selectedStores.find((s) => s.id === f.storeId)?.name ?? f.storeId)
          .join("、");
        router.push(
          `/ordering/admin/orders?success=1&warning=${encodeURIComponent(
            `${result.orderCount}/${result.requestedCount}店舗への発注が完了しました。失敗した店舗: ${failedNames}`
          )}`
        );
        return;
      }
      router.push("/ordering/admin/orders?success=1");
    });
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6 pb-32">
      <div className="mb-6">
        <Link href="/ordering/admin/bulk-order" className="text-sm text-blue-600 hover:underline">← カタログに戻る</Link>
        <h1 className="mt-2 text-lg font-bold text-slate-800">一斉発注確認</h1>
      </div>

      {error && (
        <div className="mb-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <div className="mb-4 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">発注先（{selectedStores.length}店舗）</h2>
        </div>
        <ul className="max-h-40 divide-y divide-slate-100 overflow-y-auto">
          {selectedStores.map((s) => (
            <li key={s.id} className="px-4 py-2 text-sm text-slate-700">
              {s.store_code} {s.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">注文内容（各店舗共通）</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {cart.items.map((item) => (
            <li key={item.key} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-800">
                  {item.name} × {item.quantity}
                </p>
                <p className="text-sm font-bold text-slate-900">
                  ¥{(item.unitPrice * item.lotSize * item.quantity).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <p className="text-sm font-bold text-slate-900">1店舗あたり合計</p>
          <p className="text-lg font-bold text-red-600">¥{cart.totalAmount.toLocaleString()}</p>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-sm font-bold text-slate-900">{selectedStores.length}店舗合計</p>
          <p className="text-lg font-bold text-slate-900">
            ¥{(cart.totalAmount * selectedStores.length).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">配送情報（任意・全店舗共通）</h2>
        </div>
        <div className="space-y-3 px-4 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">発注日時</label>
            <input type="datetime-local" className={INPUT_CLASS} />
            {/* 要確認: 発注日時の保存（現行はサーバー側の作成日時） */}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">納品日</label>
            <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={INPUT_CLASS} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">配送先（未入力の場合は各店舗住所）</label>
            <input type="text" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} className={INPUT_CLASS} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">一括発注の理由・連絡事項</label>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} className={INPUT_CLASS} />
          </div>
        </div>
      </div>

      <StickyActionBar>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          aria-busy={isPending}
          className={`w-full rounded-lg bg-blue-700 px-4 py-3 text-sm font-bold text-white ${
            isPending ? "cursor-wait opacity-60" : ""
          }`}
        >
          {isPending ? "送信中..." : `${selectedStores.length}店舗に一斉発注を確定する`}
        </button>
      </StickyActionBar>
    </div>
  );
}
