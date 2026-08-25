"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function confirmHalfMonth(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const companyId = String(formData.get("company_id") ?? "");
  const storeId = String(formData.get("store_id") ?? "");
  const periodStart = String(formData.get("period_start") ?? "");
  const periodEnd = String(formData.get("period_end") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();

  if (!companyId || !storeId || !periodStart || !periodEnd) {
    redirect(`/haccp?error=${encodeURIComponent("期間情報が取得できませんでした")}`);
  }

  const { data: confirmation, error } = await supabase
    .from("manager_confirmations")
    .insert({
      company_id: companyId,
      store_id: storeId,
      period_type: "half_month",
      period_start: periodStart,
      period_end: periodEnd,
      confirmed_by: user.id,
      comment: comment || null,
    })
    .select("id")
    .single();

  if (error || !confirmation) {
    // RLSで拒否された場合(店舗責任者以上でない)は分かりやすいメッセージにする
    const message = error?.message.includes("row-level security")
      ? "責任者確認は店舗責任者以上の権限が必要です"
      : (error?.message ?? "登録に失敗しました");
    redirect(`/haccp?error=${encodeURIComponent(message)}`);
  }

  // 監査ログ(仕様書9「監査」)。ここでの失敗は登録自体をブロックしない既知のトレードオフ。
  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_id: user.id,
    system_code: "haccp",
    action: "manager_confirmation",
    target_table: "manager_confirmations",
    target_id: confirmation.id,
    after_data: { store_id: storeId, period_start: periodStart, period_end: periodEnd },
  });
  if (auditError) {
    console.error("[haccp] audit log insert failed", auditError);
  }

  revalidatePath("/haccp");
  redirect("/haccp");
}
