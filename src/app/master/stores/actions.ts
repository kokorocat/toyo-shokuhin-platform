"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const STORE_STATUSES = new Set(["active", "preparing", "suspended", "closed"]);

type ParsedStoreForm =
  | { error: string }
  | {
      values: {
        company_id: string;
        area_id: string | null;
        store_code: string;
        name: string;
        manager_name: string | null;
        manager_contact: string | null;
        opened_on: string | null;
      };
    };

function parseStoreForm(formData: FormData): ParsedStoreForm {
  const companyId = String(formData.get("company_id") ?? "");
  if (!companyId) {
    return { error: "会社を選択してください" };
  }
  const storeCode = String(formData.get("store_code") ?? "").trim();
  if (!storeCode) {
    return { error: "店舗コードを入力してください" };
  }
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "店舗名を入力してください" };
  }
  return {
    values: {
      company_id: companyId,
      area_id: String(formData.get("area_id") ?? "") || null,
      store_code: storeCode,
      name,
      manager_name: String(formData.get("manager_name") ?? "").trim() || null,
      manager_contact: String(formData.get("manager_contact") ?? "").trim() || null,
      opened_on: String(formData.get("opened_on") ?? "") || null,
    },
  };
}

// 監査ログ(仕様書9「監査」)。ここでの失敗は登録自体をブロックしない既知のトレードオフ
// (haccp/actions.ts confirmHalfMonthと同じ規約)。
async function recordAuditLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actorId: string,
  action: string,
  targetId: string,
  beforeData: Record<string, string | number | boolean | null> | null,
  afterData: Record<string, string | number | boolean | null> | null
) {
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: actorId,
    system_code: "store_master",
    action,
    target_table: "stores",
    target_id: targetId,
    before_data: beforeData,
    after_data: afterData,
  });
  if (error) {
    console.error("[master/stores] audit log insert failed", error);
  }
}

export async function createStore(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = parseStoreForm(formData);
  if ("error" in parsed) {
    redirect(`/master/stores/new?error=${encodeURIComponent(parsed.error)}`);
  }

  const { data: store, error } = await supabase.from("stores").insert(parsed.values).select("id").single();
  if (error || !store) {
    const message = error?.message.includes("row-level security")
      ? "店舗の作成は自社の会社管理者、または全権限管理者のみ行えます"
      : (error?.message ?? "作成に失敗しました");
    redirect(`/master/stores/new?error=${encodeURIComponent(message)}`);
  }

  await recordAuditLog(supabase, user.id, "create", store.id, null, parsed.values);

  revalidatePath("/master/stores");
  revalidatePath("/master");
  redirect("/master/stores?success=1");
}

export async function updateStore(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const storeId = String(formData.get("store_id") ?? "");
  if (!storeId) redirect("/master/stores");

  const parsed = parseStoreForm(formData);
  if ("error" in parsed) {
    redirect(`/master/stores/${storeId}?error=${encodeURIComponent(parsed.error)}`);
  }

  const { data: before } = await supabase
    .from("stores")
    .select("company_id, area_id, store_code, name, manager_name, manager_contact, opened_on")
    .eq("id", storeId)
    .maybeSingle();

  const { error } = await supabase.from("stores").update(parsed.values).eq("id", storeId);
  if (error) {
    const message = error.message.includes("row-level security")
      ? "店舗情報の更新は自社の会社管理者、または全権限管理者のみ行えます"
      : error.message;
    redirect(`/master/stores/${storeId}?error=${encodeURIComponent(message)}`);
  }

  await recordAuditLog(supabase, user.id, "update", storeId, before, parsed.values);

  revalidatePath("/master/stores");
  revalidatePath("/master");
  redirect("/master/stores?success=1");
}

export async function toggleStoreStatus(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const storeId = String(formData.get("store_id") ?? "");
  const nextStatus = String(formData.get("next_status") ?? "");
  if (!storeId || !STORE_STATUSES.has(nextStatus)) {
    redirect("/master/stores");
  }

  // 物理削除はしない(HACCP・受発注等が広く参照するため)。稼働状態の切り替えのみ行う。
  const { data: before } = await supabase.from("stores").select("status").eq("id", storeId).maybeSingle();

  const { error } = await supabase.from("stores").update({ status: nextStatus }).eq("id", storeId);
  if (error) {
    redirect(`/master/stores?error=${encodeURIComponent(error.message)}`);
  }

  await recordAuditLog(supabase, user.id, "toggle_status", storeId, before, { status: nextStatus });

  revalidatePath("/master/stores");
  revalidatePath("/master");
  redirect("/master/stores?success=1");
}
