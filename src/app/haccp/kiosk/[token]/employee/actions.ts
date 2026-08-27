"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

export async function kioskSubmitEmployeeCheck(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const targetDate = String(formData.get("target_date") ?? "");
  const employeeId = String(formData.get("employee_id") ?? "").trim() || null;
  const manualName = String(formData.get("manual_name") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const actionTaken = String(formData.get("action_taken") ?? "").trim() || null;

  const answers: Record<string, string> = {};
  for (const code of ITEM_CODES) {
    answers[code] = String(formData.get(`answer_${code}`) ?? "");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("kiosk_submit_employee_check", {
    p_token: token,
    p_target_date: targetDate,
    p_employee_id: employeeId,
    p_manual_name: manualName,
    p_answers: answers,
    p_note: note,
    p_action_taken: actionTaken,
  });

  if (error) {
    redirect(`/haccp/kiosk/${token}/employee?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/haccp/kiosk/${token}/employee?success=1`);
}
