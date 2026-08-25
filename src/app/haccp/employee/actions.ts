"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// 従業員衛生チェック8項目(コード・順序はpage.tsxと一致させること)
const ITEM_CODES = [
  "handwash",
  "clean_uniform",
  "proper_cap",
  "nails",
  "no_accessory",
  "skin_injury",
  "stomach_symptom",
  "body_temp",
] as const;

export async function recordEmployeeCheck(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const companyId = String(formData.get("company_id") ?? "");
  const storeId = String(formData.get("store_id") ?? "");
  const targetDate = String(formData.get("target_date") ?? "");
  const selectedEmployeeId = String(formData.get("employee_id") ?? "").trim();
  const manualName = String(formData.get("manual_name") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const actionTaken = String(formData.get("action_taken") ?? "").trim();

  if (!companyId || !storeId || !targetDate) {
    redirect(`/haccp/employee?error=${encodeURIComponent("対象日を入力してください")}`);
  }

  if (!selectedEmployeeId && !manualName) {
    redirect(
      `/haccp/employee?error=${encodeURIComponent(
        "従業員を選択するか、氏名を入力してください"
      )}`
    );
  }

  const employeeId = selectedEmployeeId || null;
  const isUnmatched = !employeeId;

  const answers: Record<string, string> = {};
  for (const code of ITEM_CODES) {
    const answer = String(formData.get(`answer_${code}`) ?? "");
    if (answer !== "good" && answer !== "bad") {
      redirect(`/haccp/employee?error=${encodeURIComponent("全ての項目に回答してください")}`);
    }
    answers[code] = answer;
  }

  const hasBad = Object.values(answers).some((a) => a === "bad");
  if (hasBad && (!note || !actionTaken)) {
    redirect(
      `/haccp/employee?error=${encodeURIComponent(
        "「異常」の項目がある場合は備考と対応内容を入力してください"
      )}`
    );
  }

  // 同一店舗・対象日・従業員に対する現在の最大versionを取得し、+1で登録する
  let versionQuery = supabase
    .from("haccp_employee_responses")
    .select("version")
    .eq("store_id", storeId)
    .eq("target_date", targetDate)
    .order("version", { ascending: false })
    .limit(1);
  versionQuery = employeeId
    ? versionQuery.eq("employee_id", employeeId)
    : versionQuery.eq("is_unmatched", true).eq("manual_name", manualName);
  const { data: existing } = await versionQuery.maybeSingle();
  const nextVersion = (existing?.version ?? 0) + 1;

  const { data: inserted, error: insertError } = await supabase
    .from("haccp_employee_responses")
    .insert({
      company_id: companyId,
      store_id: storeId,
      target_date: targetDate,
      employee_id: employeeId,
      manual_employee_code: null,
      manual_name: employeeId ? null : manualName,
      is_unmatched: isUnmatched,
      version: nextVersion,
      recorded_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    redirect(
      `/haccp/employee?error=${encodeURIComponent(insertError?.message ?? "登録に失敗しました")}`
    );
  }

  const items = ITEM_CODES.map((code) => ({
    response_id: inserted.id,
    item_code: code,
    answer: answers[code],
    note: answers[code] === "bad" ? note : null,
    action_taken: answers[code] === "bad" ? actionTaken : null,
  }));

  const { error: itemsError } = await supabase.from("haccp_employee_items").insert(items);

  if (itemsError) {
    // 項目登録に失敗した場合は親レコードも残さない
    await supabase.from("haccp_employee_responses").delete().eq("id", inserted.id);
    redirect(`/haccp/employee?error=${encodeURIComponent(itemsError.message)}`);
  }

  revalidatePath("/haccp/employee");
  revalidatePath("/haccp");
  redirect("/haccp/employee?success=1");
}
