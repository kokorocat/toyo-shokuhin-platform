import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isOrderingAdminRole } from "@/app/ordering/admin/guard";
import { AccessDenied } from "@/components/AccessDenied";
import { BulkConfirmClient } from "./BulkConfirmClient";

export default async function BulkOrderConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ company_id?: string }>;
}) {
  const { company_id } = await searchParams;
  const ctx = await getPortalContext();

  if (!isOrderingAdminRole(ctx?.roleCode ?? null)) {
    return <AccessDenied message="この画面を表示する権限がありません。管理者権限を持つアカウントで再ログインしてください。" />;
  }

  if (!company_id) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">会社情報が取得できませんでした。カタログ画面からやり直してください。</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, store_code")
    .eq("company_id", company_id)
    .eq("status", "active")
    .order("store_code");

  return <BulkConfirmClient companyId={company_id} allStores={stores ?? []} />;
}
