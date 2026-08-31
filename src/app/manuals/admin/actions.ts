"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function uploadManual(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const scopeType = String(formData.get("scope_type") ?? "company");
  const companyId = String(formData.get("company_id") ?? "").trim();
  const file = formData.get("file") as File | null;

  if (!title || !file || file.size === 0) {
    redirect(`/manuals/admin?error=${encodeURIComponent("タイトルとPDFファイルを指定してください")}`);
  }
  if (scopeType === "company" && !companyId) {
    redirect(`/manuals/admin?error=${encodeURIComponent("対象の会社を選択してください")}`);
  }
  if (file!.type !== "application/pdf") {
    redirect(`/manuals/admin?error=${encodeURIComponent("PDFファイルのみアップロードできます")}`);
  }

  const { data: manual, error: manualError } = await supabase
    .from("manuals")
    .insert({ title, category: category || null, status: "ready", created_by: user.id })
    .select("id")
    .single();

  if (manualError || !manual) {
    redirect(`/manuals/admin?error=${encodeURIComponent(manualError?.message ?? "登録に失敗しました")}`);
  }

  const path = `${manual.id}/v1-${Date.now()}.pdf`;
  const { error: uploadError } = await supabase.storage.from("manual-files").upload(path, file!, {
    contentType: "application/pdf",
    upsert: false,
  });

  if (uploadError) {
    redirect(`/manuals/admin?error=${encodeURIComponent(uploadError.message)}`);
  }

  const { data: version, error: versionError } = await supabase
    .from("manual_versions")
    .insert({
      manual_id: manual.id,
      version_no: 1,
      original_file_path: path,
      published_at: new Date().toISOString(),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (versionError || !version) {
    redirect(`/manuals/admin?error=${encodeURIComponent(versionError?.message ?? "登録に失敗しました")}`);
  }

  const { error: linkError } = await supabase
    .from("manuals")
    .update({ current_version_id: version.id })
    .eq("id", manual.id);
  if (linkError) {
    redirect(`/manuals/admin?error=${encodeURIComponent(linkError.message)}`);
  }

  const { error: scopeError } = await supabase.from("manual_scopes").insert({
    manual_id: manual.id,
    scope_type: scopeType,
    company_id: scopeType === "company" ? companyId : null,
  });
  if (scopeError) {
    redirect(`/manuals/admin?error=${encodeURIComponent(scopeError.message)}`);
  }

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    system_code: "portal",
    action: "upload_manual",
    target_table: "manuals",
    target_id: manual.id,
    after_data: { title, scope_type: scopeType },
  });

  revalidatePath("/manuals/admin");
  revalidatePath("/manuals");
  redirect("/manuals/admin?success=1");
}

export async function unpublishManual(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const manualId = String(formData.get("manual_id") ?? "");
  const nextStatus = String(formData.get("next_status") ?? "");
  if (!manualId || !["ready", "unpublished"].includes(nextStatus)) {
    redirect(`/manuals/admin?error=${encodeURIComponent("不正な操作です")}`);
  }

  const { error } = await supabase.from("manuals").update({ status: nextStatus }).eq("id", manualId);
  if (error) {
    redirect(`/manuals/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/manuals/admin");
  revalidatePath("/manuals");
  redirect("/manuals/admin?success=1");
}
