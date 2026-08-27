"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayInTokyo } from "@/lib/date";

// 監査ログ(仕様書9「監査」)。ここでの失敗は登録自体をブロックしない既知のトレードオフ
// (master/companies/actions.tsと同じ規約)。grant/revoke_user_access_scope RPC自体は
// 権限チェック・書き込みのみを行い、監査ログの記録はアプリ側の責務とする。
async function recordAuditLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actorId: string,
  action: string,
  targetId: string,
  afterData: Record<string, string | number | boolean | null> | null
) {
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: actorId,
    system_code: "store_master",
    action,
    target_table: "user_access_scopes",
    target_id: targetId,
    after_data: afterData,
  });
  if (error) {
    console.error("[master/users] audit log insert failed", error);
  }
}

export async function grantScope(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const email = String(formData.get("email") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const roleCode = String(formData.get("role_code") ?? "").trim();
  const companyId = String(formData.get("company_id") ?? "").trim() || null;
  const areaId = String(formData.get("area_id") ?? "").trim() || null;
  const storeId = String(formData.get("store_id") ?? "").trim() || null;
  const startedOn = String(formData.get("started_on") ?? "").trim() || todayInTokyo();

  if (!email || !roleCode) {
    redirect(`/master/users?error=${encodeURIComponent("メールアドレスとロールを入力してください")}`);
  }

  const { data: profileId, error: lookupError } = await supabase.rpc(
    "find_or_create_user_profile_by_email",
    {
      p_email: email,
      p_display_name: displayName || null,
      p_company_id: companyId,
      p_area_id: areaId,
      p_store_id: storeId,
    }
  );

  if (lookupError || !profileId) {
    redirect(`/master/users?error=${encodeURIComponent(lookupError?.message ?? "ユーザーが見つかりませんでした")}`);
  }

  const { data: scopeId, error: grantError } = await supabase.rpc("grant_user_access_scope", {
    p_target_user_id: profileId,
    p_role_code: roleCode,
    p_company_id: companyId,
    p_area_id: areaId,
    p_store_id: storeId,
    p_started_on: startedOn,
  });

  if (grantError || !scopeId) {
    redirect(`/master/users?error=${encodeURIComponent(grantError?.message ?? "権限の付与に失敗しました")}`);
  }

  await recordAuditLog(supabase, user.id, "grant_scope", scopeId, {
    target_user_id: profileId,
    role_code: roleCode,
    company_id: companyId,
    area_id: areaId,
    store_id: storeId,
  });

  revalidatePath("/master/users");
  redirect("/master/users?success=1");
}

export async function revokeScope(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const scopeId = String(formData.get("scope_id") ?? "").trim();
  if (!scopeId) redirect("/master/users");

  const { error } = await supabase.rpc("revoke_user_access_scope", { p_scope_id: scopeId });

  if (error) {
    redirect(`/master/users?error=${encodeURIComponent(error.message)}`);
  }

  await recordAuditLog(supabase, user.id, "revoke_scope", scopeId, null);

  revalidatePath("/master/users");
  redirect("/master/users?success=1");
}
