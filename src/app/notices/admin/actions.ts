"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createNotice(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const importance = String(formData.get("importance") ?? "normal");
  const externalUrl = String(formData.get("external_url") ?? "").trim();
  const displayStartAt = String(formData.get("display_start_at") ?? "").trim();
  const displayEndAt = String(formData.get("display_end_at") ?? "").trim();
  const scopeType = String(formData.get("scope_type") ?? "company");
  const companyId = String(formData.get("company_id") ?? "").trim();
  const publishNow = formData.get("publish_now") === "on";

  if (!title || !body) {
    redirect(`/notices/admin?error=${encodeURIComponent("タイトルと本文を入力してください")}`);
  }
  if (scopeType === "company" && !companyId) {
    redirect(`/notices/admin?error=${encodeURIComponent("対象の会社を選択してください")}`);
  }

  const { data: notice, error: noticeError } = await supabase
    .from("portal_notices")
    .insert({
      title,
      body,
      importance,
      external_url: externalUrl || null,
      display_start_at: displayStartAt || new Date().toISOString(),
      display_end_at: displayEndAt || null,
      status: publishNow ? "published" : "draft",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (noticeError || !notice) {
    redirect(`/notices/admin?error=${encodeURIComponent(noticeError?.message ?? "登録に失敗しました")}`);
  }

  const { error: scopeError } = await supabase.from("notice_scopes").insert({
    notice_id: notice.id,
    scope_type: scopeType,
    company_id: scopeType === "company" ? companyId : null,
  });

  if (scopeError) {
    redirect(`/notices/admin?error=${encodeURIComponent(scopeError.message)}`);
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    system_code: "portal",
    action: "create_notice",
    target_table: "portal_notices",
    target_id: notice.id,
    after_data: { title, scope_type: scopeType, status: publishNow ? "published" : "draft" },
  });

  revalidatePath("/notices/admin");
  revalidatePath("/notices");
  redirect("/notices/admin?success=1");
}

export async function setNoticeStatus(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const noticeId = String(formData.get("notice_id") ?? "");
  const nextStatus = String(formData.get("next_status") ?? "");

  if (!noticeId || !["published", "unpublished", "draft"].includes(nextStatus)) {
    redirect(`/notices/admin?error=${encodeURIComponent("不正な操作です")}`);
  }

  const { error } = await supabase.from("portal_notices").update({ status: nextStatus }).eq("id", noticeId);

  if (error) {
    redirect(`/notices/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/notices/admin");
  revalidatePath("/notices");
  redirect("/notices/admin?success=1");
}
