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
  const publishNow = formData.get("publish_now") === "on";

  if (!title || !file || file.size === 0) {
    redirect(`/manuals/admin?error=${encodeURIComponent("タイトルとPDFファイルを指定してください")}`);
  }
  if (scopeType === "company" && !companyId) {
    redirect(`/manuals/admin?error=${encodeURIComponent("対象の会社を選択してください")}`);
  }
  if (file!.type !== "application/pdf") {
    redirect(`/manuals/admin?error=${encodeURIComponent("PDFファイルのみアップロードできます")}`);
  }

  // 途中のいずれかの手順が失敗した場合、それまでに作成した行・ファイルを削除してやり直せる
  // 状態に戻す(status='ready'なのに本文が無い、閲覧不可のまま残る、等の中途半端な状態を防ぐ)。
  // アップロード自体はDB行を何も作る前に最初に行い、失敗時に消すものを増やさないようにする。
  const path = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`;
  const { error: uploadError } = await supabase.storage.from("manual-files").upload(path, file!, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (uploadError) {
    redirect(`/manuals/admin?error=${encodeURIComponent(uploadError.message)}`);
  }

  async function cleanup(manualId?: string) {
    await supabase.storage.from("manual-files").remove([path]);
    if (manualId) {
      await supabase.from("manuals").delete().eq("id", manualId);
    }
  }

  // 全ての行が揃うまではprocessing状態とし、最後にreadyへ切り替える(ページ画像化パイプラインは
  // 今回対象外だが、途中失敗時に"公開中なのに実体が無い"状態を作らないためこの状態遷移は残す)。
  const { data: manual, error: manualError } = await supabase
    .from("manuals")
    .insert({ title, category: category || null, status: "processing", created_by: user.id })
    .select("id")
    .single();

  if (manualError || !manual) {
    await cleanup();
    redirect(`/manuals/admin?error=${encodeURIComponent(manualError?.message ?? "登録に失敗しました")}`);
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
    await cleanup(manual.id);
    redirect(`/manuals/admin?error=${encodeURIComponent(versionError?.message ?? "登録に失敗しました")}`);
  }

  // 「すぐに公開する」が未選択の場合は下書き扱い(unpublished)のまま残す。以前はここが常に
  // "ready"固定で、チェックボックスの状態に関わらず即座に全社/対象会社へ公開されてしまう
  // 実害のある不具合だった(実機検証で確認済み)。
  const { error: linkError } = await supabase
    .from("manuals")
    .update({ current_version_id: version.id, status: publishNow ? "ready" : "unpublished" })
    .eq("id", manual.id);
  if (linkError) {
    await cleanup(manual.id);
    redirect(`/manuals/admin?error=${encodeURIComponent(linkError.message)}`);
  }

  const { error: scopeError } = await supabase.from("manual_scopes").insert({
    manual_id: manual.id,
    scope_type: scopeType,
    company_id: scopeType === "company" ? companyId : null,
  });
  if (scopeError) {
    await cleanup(manual.id);
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
