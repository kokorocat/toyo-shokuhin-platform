"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isHaccpAdminRole } from "@/app/haccp/admin/guard";

// ログイン不要のHACCP店舗側入力(kiosk)のURLに使うトークンを再発行する。
// リンクの流出・端末紛失時など、既存リンクを無効化したい場合に使用する。
export async function regenerateKioskToken(formData: FormData) {
  const storeId = String(formData.get("store_id") ?? "");
  const ctx = await getPortalContext();

  if (!ctx || !isHaccpAdminRole(ctx.roleCode ?? null)) {
    redirect(`/haccp/admin/stores/${storeId}?kioskError=${encodeURIComponent("権限がありません")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("regenerate_store_kiosk_token", { p_store_id: storeId });

  if (error) {
    redirect(`/haccp/admin/stores/${storeId}?kioskError=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/haccp/admin/stores/${storeId}`);
  redirect(`/haccp/admin/stores/${storeId}?kioskSuccess=1`);
}
