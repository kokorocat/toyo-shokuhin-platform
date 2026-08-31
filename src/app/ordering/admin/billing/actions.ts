"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function issueInvoice(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const companyId = String(formData.get("company_id") ?? "");
  const storeId = String(formData.get("store_id") ?? "");
  const periodType = String(formData.get("period_type") ?? "");
  const periodStart = String(formData.get("period_start") ?? "");
  const periodEnd = String(formData.get("period_end") ?? "");

  const backTo = `/ordering/admin/billing?company_id=${encodeURIComponent(companyId)}&store_id=${encodeURIComponent(storeId)}`;

  if (!companyId || !storeId || !periodType || !periodStart || !periodEnd) {
    redirect(`${backTo}&error=${encodeURIComponent("入力内容を確認してください")}`);
  }

  const { error } = await supabase.rpc("issue_invoice", {
    p_company_id: companyId,
    p_store_id: storeId,
    p_period_type: periodType,
    p_period_start: periodStart,
    p_period_end: periodEnd,
  });

  if (error) {
    redirect(`${backTo}&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/ordering/admin/billing");
  revalidatePath("/ordering/history");
  redirect(`${backTo}&success=1`);
}
