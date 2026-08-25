import { getPortalContext } from "@/lib/portal/get-portal-context";
import ConfirmClient from "./ConfirmClient";

export default async function OrderingConfirmPage() {
  const ctx = await getPortalContext();

  if (!ctx?.store || !ctx.company) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">
          店舗スコープを持つアカウントでログインしてください。
        </p>
      </div>
    );
  }

  return (
    <ConfirmClient
      storeId={ctx.store.id}
      companyId={ctx.company.id}
      storeName={ctx.store.name}
      storeCode={ctx.store.storeCode}
    />
  );
}
