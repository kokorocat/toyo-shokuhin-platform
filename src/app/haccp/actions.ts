"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function recordTemperatureCheck(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const checkPointId = String(formData.get("check_point_id") ?? "");
  const storeId = String(formData.get("store_id") ?? "");
  const value = Number(formData.get("value"));
  const note = String(formData.get("note") ?? "").trim();

  if (!checkPointId || !storeId || Number.isNaN(value)) {
    redirect(`/haccp?error=${encodeURIComponent("入力内容を確認してください")}`);
  }

  const { error } = await supabase.from("haccp_temperature_records").insert({
    check_point_id: checkPointId,
    store_id: storeId,
    value,
    note: note || null,
    recorded_by: user.id,
  });

  if (error) {
    redirect(`/haccp?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/haccp");
  redirect("/haccp");
}

export async function recordHygieneCheck(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const itemId = String(formData.get("item_id") ?? "");
  const storeId = String(formData.get("store_id") ?? "");
  const isOk = formData.get("is_ok") === "true";
  const note = String(formData.get("note") ?? "").trim();

  if (!itemId || !storeId) {
    redirect(`/haccp?error=${encodeURIComponent("入力内容を確認してください")}`);
  }

  const { error } = await supabase.from("haccp_hygiene_records").insert({
    item_id: itemId,
    store_id: storeId,
    is_ok: isOk,
    note: note || null,
    checked_by: user.id,
  });

  if (error) {
    redirect(`/haccp?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/haccp");
  redirect("/haccp");
}
