"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { INSPECTION_QUESTIONS } from "./constants";
import { todayInTokyo } from "@/lib/date";

export async function recordInspection(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const companyId = String(formData.get("company_id") ?? "");
  const storeId = String(formData.get("store_id") ?? "");
  const storeManagerName = String(formData.get("store_manager_name") ?? "").trim();
  const hygieneOfficerName = String(formData.get("hygiene_officer_name") ?? "").trim();
  const areaManagerName = String(formData.get("area_manager_name") ?? "").trim();
  const areaHygieneOfficerName = String(formData.get("area_hygiene_officer_name") ?? "").trim();
  const implementerName = String(formData.get("implementer_name") ?? "").trim();
  const improvementReason = String(formData.get("improvement_reason") ?? "").trim();
  const improvementAction = String(formData.get("improvement_action") ?? "").trim();
  const selfEvaluation = String(formData.get("self_evaluation") ?? "");
  const specialNotes = String(formData.get("special_notes") ?? "").trim();
  const businessLicenseExpiryDate = String(formData.get("business_license_expiry_date") ?? "").trim();

  if (!companyId || !storeId) {
    redirect(`/haccp/inspection?error=${encodeURIComponent("店舗情報が取得できませんでした")}`);
  }

  if (!implementerName) {
    redirect(`/haccp/inspection?error=${encodeURIComponent("実施者名を入力してください")}`);
  }

  if (selfEvaluation !== "good" && selfEvaluation !== "needs_improvement") {
    redirect(`/haccp/inspection?error=${encodeURIComponent("自主評価を選択してください")}`);
  }

  const answers: Record<string, string> = {};
  for (const q of INSPECTION_QUESTIONS) {
    const answer = String(formData.get(`answer_${q.code}`) ?? "");
    if (answer !== "good" && answer !== "needs_improvement") {
      redirect(`/haccp/inspection?error=${encodeURIComponent("すべての項目に回答してください")}`);
    }
    answers[q.code] = answer;
  }

  const overallEvaluation = Object.values(answers).includes("needs_improvement")
    ? "needs_improvement"
    : "good";

  if (overallEvaluation === "needs_improvement" && !improvementReason) {
    redirect(
      `/haccp/inspection?error=${encodeURIComponent(
        "要改善の項目があります。改善が必要な項目の詳細を入力してください"
      )}`
    );
  }

  if (overallEvaluation === "needs_improvement" && !improvementAction) {
    redirect(
      `/haccp/inspection?error=${encodeURIComponent("要改善の項目があります。対応内容を入力してください")}`
    );
  }

  const todayStr = todayInTokyo();
  const targetMonth = `${todayStr.slice(0, 7)}-01`;

  // 訂正は新版を追加する運用のため、既存の最大バージョンの次番で新版として保存する
  const { data: existing } = await supabase
    .from("haccp_inspections")
    .select("version")
    .eq("store_id", storeId)
    .eq("target_month", targetMonth)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (existing?.version ?? 0) + 1;

  const { data: inspection, error: insertError } = await supabase
    .from("haccp_inspections")
    .insert({
      company_id: companyId,
      store_id: storeId,
      target_month: targetMonth,
      store_manager_name: storeManagerName || null,
      hygiene_officer_name: hygieneOfficerName || null,
      area_manager_name: areaManagerName || null,
      area_hygiene_officer_name: areaHygieneOfficerName || null,
      implementer_name: implementerName,
      overall_evaluation: overallEvaluation,
      improvement_reason: improvementReason || null,
      improvement_action: improvementAction || null,
      self_evaluation: selfEvaluation,
      special_notes: specialNotes || null,
      business_license_expiry_date: businessLicenseExpiryDate || null,
      version: nextVersion,
      recorded_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !inspection) {
    redirect(
      `/haccp/inspection?error=${encodeURIComponent(insertError?.message ?? "登録に失敗しました")}`
    );
  }

  const itemRows = INSPECTION_QUESTIONS.map((q) => ({
    inspection_id: inspection.id,
    question_code: q.code,
    answer: answers[q.code],
  }));

  const { error: itemsError } = await supabase.from("haccp_inspection_items").insert(itemRows);

  if (itemsError) {
    redirect(`/haccp/inspection?error=${encodeURIComponent(itemsError.message)}`);
  }

  // 監査ログ(仕様書9「監査」)。ここでの失敗は登録自体をブロックしない既知のトレードオフ。
  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_id: user.id,
    system_code: "haccp",
    action: "inspection_record",
    target_table: "haccp_inspections",
    target_id: inspection.id,
    after_data: { store_id: storeId, target_month: targetMonth, version: nextVersion },
  });
  if (auditError) {
    console.error("[haccp/inspection] audit log insert failed", auditError);
  }

  revalidatePath("/haccp/inspection");
  revalidatePath("/haccp");
  redirect("/haccp/inspection?success=1");
}
