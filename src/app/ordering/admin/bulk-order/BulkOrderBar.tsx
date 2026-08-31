"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StickyActionBar } from "@/components/StickyActionBar";
import { useCart } from "@/app/ordering/CartContext";
import { getSelectedStoreIds } from "./selected-stores";

export function BulkOrderBar({ companyId }: { companyId: string }) {
  const cart = useCart();
  const [storeCount, setStoreCount] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStoreCount(getSelectedStoreIds().length);
    const onStorage = () => setStoreCount(getSelectedStoreIds().length);
    const interval = setInterval(onStorage, 500);
    return () => clearInterval(interval);
  }, []);

  if (cart.totalCount === 0) return null;

  return (
    <StickyActionBar>
      <div>
        <p className="text-xs font-medium text-slate-500">
          カート内 {cart.totalCount}点 ・{storeCount}店舗選択中
        </p>
        <p className="text-base font-bold text-slate-900">¥{cart.totalAmount.toLocaleString()} / 店舗</p>
      </div>
      <Link
        href={`/ordering/admin/bulk-order/confirm?company_id=${companyId}`}
        className={`rounded-full px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors ${
          storeCount === 0 ? "pointer-events-none bg-slate-300" : "bg-emerald-500 hover:bg-emerald-600"
        }`}
      >
        確認へ進む
      </Link>
    </StickyActionBar>
  );
}
