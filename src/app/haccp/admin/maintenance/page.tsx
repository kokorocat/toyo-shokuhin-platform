import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isHaccpAdminRole } from "@/app/haccp/admin/guard";
import { HaccpAdminChrome, HaccpAdminTabs, HaccpKpiRow } from "../HaccpAdminChrome";
import { getScopedStores } from "@/lib/haccp/admin-dashboard";

export default async function HaccpAdminMaintenancePage() {
  const ctx = await getPortalContext();

  if (!isHaccpAdminRole(ctx?.roleCode ?? null)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">権限がありません。管理者アカウントで再度ログインしてください。</p>
      </div>
    );
  }

  const supabase = await createClient();
  const [stores, { count: employeeCount }, { data: authUser }] = await Promise.all([
    getScopedStores(supabase, {}),
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.auth.getUser(),
  ]);

  return (
    <HaccpAdminChrome
      title="HACCP管理者ダッシュボード"
      subtitle="店舗・従業員の登録／状態変更、HACCP回答状況の確認"
      activePath="/haccp/admin/maintenance"
    >
      <HaccpKpiRow
        storeCount={stores.length}
        employeeCount={employeeCount ?? "-"}
        needsCheck={0}
        loginLabel={authUser.user?.email ?? ctx?.displayName ?? "-"}
      />
      <HaccpAdminTabs activePath="/haccp/admin/maintenance" />

      <h2 className="mt-6 text-lg font-bold text-teal-800">保守・診断</h2>
      <div className="mt-4 rounded-lg border border-teal-100 bg-white p-5 text-sm text-slate-600">
        GASの保守・診断タブに相当する画面です。診断項目・実行処理は未接続です。
        {/* 要確認: GAS保守・診断の実処理（接続確認・データ修復など）の画面対応と実装範囲 */}
      </div>
    </HaccpAdminChrome>
  );
}
