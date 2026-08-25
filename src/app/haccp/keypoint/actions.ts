"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { KEYPOINT_ITEMS } from "./constants";

export async function recordKeypointCheck(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const companyId = String(formData.get("company_id") ?? "");
  const storeId = String(formData.get("store_id") ?? "");
  const targetDate = String(formData.get("target_date") ?? "");

  if (!companyId || !storeId || !targetDate) {
    redirect(`/haccp/keypoint?error=${encodeURIComponent("必須項目が入力されていません")}`);
  }

  // 元回答は保持し、既存の最大バージョンの次番で新版として保存する
  const { data: existing } = await supabase
    .from("haccp_keypoint_responses")
    .select("version")
    .eq("store_id", storeId)
    .eq("target_date", targetDate)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (existing?.version ?? 0) + 1;

  const { data: response, error: responseError } = await supabase
    .from("haccp_keypoint_responses")
    .insert({
      company_id: companyId,
      store_id: storeId,
      target_date: targetDate,
      recorded_by: user.id,
      version: nextVersion,
    })
    .select("id")
    .single();

  if (responseError || !response) {
    redirect(
      `/haccp/keypoint?error=${encodeURIComponent(responseError?.message ?? "登録に失敗しました")}`
    );
  }

  const itemRows = KEYPOINT_ITEMS.map(({ code }) => ({
    response_id: response.id,
    item_code: code,
    checked: formData.get(`checked_${code}`) === "on",
    note: String(formData.get(`note_${code}`) ?? "").trim() || null,
  }));

  const { error: itemsError } = await supabase.from("haccp_keypoint_items").insert(itemRows);

  if (itemsError) {
    redirect(`/haccp/keypoint?error=${encodeURIComponent(itemsError.message)}`);
  }

  const temperatureValue = String(formData.get("temp_value") ?? "").trim();
  const temperatureJudgment = String(formData.get("temp_judgment") ?? "").trim();
  const temperatureNote = String(formData.get("temp_note") ?? "").trim();
  const labelJudgment = String(formData.get("label_judgment") ?? "").trim();
  const labelNote = String(formData.get("label_note") ?? "").trim();

  const labelRows: {
    response_id: string;
    label_type: string;
    measured_value: number | null;
    judgment: string | null;
    note: string | null;
  }[] = [];

  if (temperatureValue || temperatureJudgment || temperatureNote) {
    labelRows.push({
      response_id: response.id,
      label_type: "temperature",
      measured_value: temperatureValue ? Number(temperatureValue) : null,
      judgment: temperatureJudgment || null,
      note: temperatureNote || null,
    });
  }

  if (labelJudgment || labelNote) {
    labelRows.push({
      response_id: response.id,
      label_type: "label",
      measured_value: null,
      judgment: labelJudgment || null,
      note: labelNote || null,
    });
  }

  if (labelRows.length > 0) {
    const { error: labelsError } = await supabase
      .from("haccp_temperature_labels")
      .insert(labelRows);

    if (labelsError) {
      redirect(`/haccp/keypoint?error=${encodeURIComponent(labelsError.message)}`);
    }
  }

  revalidatePath("/haccp");
  revalidatePath("/haccp/keypoint");
  redirect("/haccp?keypoint=success");
}
