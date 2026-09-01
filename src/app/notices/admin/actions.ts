"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// <input type="datetime-local">の値("YYYY-MM-DDTHH:mm")はタイムゾーン情報を持たないため、
// そのままtimestamptz列へ渡すとDBセッションの既定タイムゾーン(Supabaseの既定はUTC)で解釈され、
// 管理者が選んだ日本時間より9時間ずれて保存されてしまう。この画面は日本時間のみを扱うため、
// +09:00を明示的に付与する。
function toJstIso(datetimeLocal: string): string | null {
  const trimmed = datetimeLocal.trim();
  if (!trimmed) return null;
  return `${trimmed}:00+09:00`;
}

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
      display_start_at: toJstIso(displayStartAt) ?? new Date().toISOString(),
      display_end_at: toJstIso(displayEndAt),
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
    // 公開対象(notice_scopes)が無いお知らせは誰にも見えず操作もできないゴミデータになる
    // ため、後始末せず放置しない。この時点で本文自体は既に登録済みだが、削除して
    // やり直せる状態に戻す(管理者側にrevalidate漏れが無いよう明示的にpathも更新する)。
    await supabase.from("portal_notices").delete().eq("id", notice.id);
    revalidatePath("/notices/admin");
    redirect(`/notices/admin?error=${encodeURIComponent(`公開対象の登録に失敗したため、お知らせ自体も取り消しました: ${scopeError.message}`)}`);
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
