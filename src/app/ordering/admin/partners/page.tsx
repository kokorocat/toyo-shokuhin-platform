import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isOrderingAdminRole } from "@/app/ordering/admin/guard";
import { OrderingAdminChrome } from "@/app/ordering/admin/OrderingAdminChrome";

export default async function OrderingPartnersPlaceholderPage() {
  const ctx = await getPortalContext();
  if (!ctx || !isOrderingAdminRole(ctx.roleCode ?? null)) {
    return <p className="p-8 text-sm text-slate-500">権限がありません。</p>;
  }
  return (
    <OrderingAdminChrome activePath="/ordering/admin/partners" displayName={ctx.displayName}>
      <h1 className="text-lg font-bold text-slate-900">取引先一覧</h1>
      <p className="mt-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        GASの取引先一覧タブに相当する画面です。一覧・選択ロジックは未接続です。
        {/* 要確認: 取引先マスタの画面対応とデータ源 */}
      </p>
    </OrderingAdminChrome>
  );
}
