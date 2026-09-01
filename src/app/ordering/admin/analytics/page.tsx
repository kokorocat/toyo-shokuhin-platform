import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isOrderingAdminRole } from "@/app/ordering/admin/guard";
import { OrderingAdminChrome } from "@/app/ordering/admin/OrderingAdminChrome";

export default async function OrderingAnalyticsPlaceholderPage() {
  const ctx = await getPortalContext();
  if (!ctx || !isOrderingAdminRole(ctx.roleCode ?? null)) {
    return <p className="p-8 text-sm text-slate-500">権限がありません。</p>;
  }
  return (
    <OrderingAdminChrome activePath="/ordering/admin/analytics" displayName={ctx.displayName}>
      <h1 className="text-lg font-bold text-slate-900">分析</h1>
      <p className="mt-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        GASの分析タブに相当する画面です。集計ロジックは今回のスコープ外です。
        {/* 要確認: 分析指標・期間・集計ロジック */}
      </p>
    </OrderingAdminChrome>
  );
}
