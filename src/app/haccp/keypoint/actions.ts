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
  const confirmedByName = String(formData.get("confirmed_by_name") ?? "").trim();

  if (!companyId || !storeId || !targetDate || !confirmedByName) {
    redirect(`/haccp/keypoint?error=${encodeURIComponent("必須項目が入力されていません")}`);
  }

  // 特記事項はGASと同じく6項目共通の1欄(shared_note)。否の項目にのみ適用し、
  // 良の項目には記録しない(以前は同一テキストを全項目のnoteへ無条件コピーしていたため、
  // 良の項目にも他項目の否理由がそのまま記録されてしまう不具合があった)。
  const sharedNote = String(formData.get("shared_note") ?? "").trim() || null;

  const itemJudgments: { code: string; judgment: string; note: string | null }[] = [];
  let hasNg = false;
  for (const { code } of KEYPOINT_ITEMS) {
    const judgment = String(formData.get(`judgment_${code}`) ?? "");
    if (judgment !== "ok" && judgment !== "ng") {
      redirect(`/haccp/keypoint?error=${encodeURIComponent("全ての項目に良否を入力してください")}`);
    }
    if (judgment === "ng") hasNg = true;
    itemJudgments.push({ code, judgment, note: judgment === "ng" ? sharedNote : null });
  }
  if (hasNg && !sharedNote) {
    redirect(`/haccp/keypoint?error=${encodeURIComponent("否の項目には理由を入力してください")}`);
  }

  const temperatureValue = String(formData.get("temp_value") ?? "").trim();
  const temperatureJudgment = String(formData.get("temp_judgment") ?? "").trim();
  const temperatureNote = String(formData.get("temp_note") ?? "").trim();
  const labelJudgment = String(formData.get("label_judgment") ?? "").trim();
  const labelNote = String(formData.get("label_note") ?? "").trim();

  // 温度・ラベルの否理由チェックも、DBへの書き込みが始まる前(この時点)で行う。
  // 挿入後に検証すると、検証失敗時に不完全な記録(回答本体+6項目のみ、温度/ラベル欠落)が
  // ロールバックされずそのまま残ってしまう。
  if (temperatureJudgment === "ng" && !temperatureNote) {
    redirect(`/haccp/keypoint?error=${encodeURIComponent("温度チェックがNGの場合は理由を入力してください")}`);
  }
  if (labelJudgment === "ng" && !labelNote) {
    redirect(`/haccp/keypoint?error=${encodeURIComponent("ラベルチェックがNGの場合は理由を入力してください")}`);
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
      confirmed_by_name: confirmedByName,
      version: nextVersion,
    })
    .select("id")
    .single();

  if (responseError || !response) {
    redirect(
      `/haccp/keypoint?error=${encodeURIComponent(responseError?.message ?? "登録に失敗しました")}`
    );
  }

  const itemRows = itemJudgments.map(({ code, judgment, note }) => ({
    response_id: response.id,
    item_code: code,
    judgment,
    note,
  }));

  const { error: itemsError } = await supabase.from("haccp_keypoint_items").insert(itemRows);

  if (itemsError) {
    redirect(`/haccp/keypoint?error=${encodeURIComponent(itemsError.message)}`);
  }

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

  // 監査ログ(仕様書9「監査」)。ここでの失敗は登録自体をブロックしない既知のトレードオフ。
  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_id: user.id,
    system_code: "haccp",
    action: "keypoint_record",
    target_table: "haccp_keypoint_responses",
    target_id: response.id,
    after_data: { store_id: storeId, target_date: targetDate, version: nextVersion },
  });
  if (auditError) {
    console.error("[haccp/keypoint] audit log insert failed", auditError);
  }

  revalidatePath("/haccp");
  revalidatePath("/haccp/keypoint");
  redirect("/haccp/keypoint?success=1");
}
