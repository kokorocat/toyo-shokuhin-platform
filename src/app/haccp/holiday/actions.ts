"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function registerStoreHoliday(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const companyId = String(formData.get("company_id") ?? "");
  const storeId = String(formData.get("store_id") ?? "");
  const holidayDate = String(formData.get("holiday_date") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!companyId || !storeId || !holidayDate) {
    redirect(`/haccp/holiday?error=${encodeURIComponent("日付を入力してください")}`);
  }

  // 回答済の日付は店休日にできない(仕様書4.4)
  const [{ count: keypointCount }, { count: employeeCount }] = await Promise.all([
    supabase
      .from("haccp_keypoint_responses")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("target_date", holidayDate),
    supabase
      .from("haccp_employee_responses")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("target_date", holidayDate),
  ]);

  if ((keypointCount ?? 0) > 0 || (employeeCount ?? 0) > 0) {
    redirect(
      `/haccp/holiday?error=${encodeURIComponent("その日付は既に点検記録があるため、店休日にできません")}`
    );
  }

  const { error } = await supabase.from("store_holidays").insert({
    company_id: companyId,
    store_id: storeId,
    holiday_date: holidayDate,
    reason: reason || null,
    registered_by: user.id,
  });

  if (error) {
    redirect(`/haccp/holiday?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/haccp/holiday");
  revalidatePath("/haccp");
  redirect("/haccp/holiday");
}

export async function cancelStoreHoliday(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const companyId = String(formData.get("company_id") ?? "");
  const storeId = String(formData.get("store_id") ?? "");
  const holidayDate = String(formData.get("holiday_date") ?? "");

  // 取消は履歴を残す(既存行を残したまま、取消レコードを新規追加する運用)
  const { error } = await supabase.from("store_holidays").insert({
    company_id: companyId,
    store_id: storeId,
    holiday_date: holidayDate,
    status: "cancelled",
    reason: "取消",
    registered_by: user.id,
  });

  if (error) {
    redirect(`/haccp/holiday?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/haccp/holiday");
  revalidatePath("/haccp");
  redirect("/haccp/holiday");
}
