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

  const { error } = await supabase.from("manager_confirmations").insert({
    company_id: companyId,
    store_id: storeId,
    period_type: "half_month",
    period_start: periodStart,
    period_end: periodEnd,
    confirmed_by: user.id,
    comment: comment || null,
  });

  if (error) {
    // RLSで拒否された場合(店舗責任者以上でない)は分かりやすいメッセージにする
    const message = error.message.includes("row-level security")
      ? "責任者確認は店舗責任者以上の権限が必要です"
      : error.message;
    redirect(`/haccp?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/haccp");
  redirect("/haccp");
}
