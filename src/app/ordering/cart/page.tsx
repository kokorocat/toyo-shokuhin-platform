import { getPortalContext } from "@/lib/portal/get-portal-context";
import { OrderingStoreShell } from "../OrderingStoreShell";
import CartClient from "./CartClient";

export default async function CartPage() {
  const ctx = await getPortalContext();
  if (!ctx?.store) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">店舗スコープを持つアカウントでログインしてください。</p>
      </div>
    );
  }

  return (
    <OrderingStoreShell activePath="/ordering/cart" storeLabel={ctx.store.name}>
      <CartClient storeName={ctx.store.name} />
    </OrderingStoreShell>
  );
}
