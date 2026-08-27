"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// 監査ログ(仕様書9「監査」)。master/companies/actions.tsのrecordAuditLogと同じ規約。
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
    system_code: "recipe",
    action,
    target_table: "recipe_submitters",
    target_id: targetId,
    before_data: beforeData,
    after_data: afterData,
  });
  if (error) {
    console.error("[recipe/admin/submitters] audit log insert failed", error);
  }
}

export async function createSubmitter(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const companyId = String(formData.get("company_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!companyId || !name) {
    redirect(`/recipe/admin/submitters?company_id=${companyId}&error=${encodeURIComponent("氏名を入力してください")}`);
  }

  const { data: submitter, error } = await supabase
    .from("recipe_submitters")
    .insert({ company_id: companyId, name })
    .select("id")
    .single();
  if (error || !submitter) {
    redirect(`/recipe/admin/submitters?company_id=${companyId}&error=${encodeURIComponent(error?.message ?? "登録に失敗しました")}`);
  }

  await recordAuditLog(supabase, user.id, "create", submitter.id, null, { company_id: companyId, name });

  revalidatePath("/recipe/admin/submitters");
  revalidatePath("/recipe/admin/submit");
  redirect(`/recipe/admin/submitters?company_id=${companyId}&success=1`);
}

export async function renameSubmitter(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const submitterId = String(formData.get("submitter_id") ?? "");
  const companyId = String(formData.get("company_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!submitterId || !name) {
    redirect(`/recipe/admin/submitters?company_id=${companyId}&error=${encodeURIComponent("氏名を入力してください")}`);
  }

  const { data: before } = await supabase.from("recipe_submitters").select("name").eq("id", submitterId).maybeSingle();

  const { error } = await supabase.from("recipe_submitters").update({ name }).eq("id", submitterId);
  if (error) {
    redirect(`/recipe/admin/submitters?company_id=${companyId}&error=${encodeURIComponent(error.message)}`);
  }

  await recordAuditLog(supabase, user.id, "rename", submitterId, before, { name });

  revalidatePath("/recipe/admin/submitters");
  revalidatePath("/recipe/admin/submit");
  redirect(`/recipe/admin/submitters?company_id=${companyId}&success=1`);
}

export async function toggleSubmitterStatus(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const submitterId = String(formData.get("submitter_id") ?? "");
  const companyId = String(formData.get("company_id") ?? "");
  const nextStatus = String(formData.get("next_status") ?? "");

  if (!submitterId || (nextStatus !== "active" && nextStatus !== "inactive")) {
    redirect(`/recipe/admin/submitters?company_id=${companyId}`);
  }

  const { data: before } = await supabase.from("recipe_submitters").select("status").eq("id", submitterId).maybeSingle();

  const { error } = await supabase.from("recipe_submitters").update({ status: nextStatus }).eq("id", submitterId);
  if (error) {
    redirect(`/recipe/admin/submitters?company_id=${companyId}&error=${encodeURIComponent(error.message)}`);
  }

  await recordAuditLog(supabase, user.id, "toggle_status", submitterId, before, { status: nextStatus });

  revalidatePath("/recipe/admin/submitters");
  revalidatePath("/recipe/admin/submit");
  redirect(`/recipe/admin/submitters?company_id=${companyId}&success=1`);
}
