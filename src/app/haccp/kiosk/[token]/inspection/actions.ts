"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { INSPECTION_QUESTIONS } from "@/app/haccp/inspection/constants";

export async function kioskSubmitInspection(formData: FormData) {
  const token = String(formData.get("token") ?? "");

  const answers: Record<string, string> = {};
  for (const q of INSPECTION_QUESTIONS) {
    answers[q.code] = String(formData.get(`answer_${q.code}`) ?? "");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("kiosk_submit_inspection", {
    p_token: token,
    p_implementer_name: String(formData.get("implementer_name") ?? "").trim(),
    p_answers: answers,
    p_self_evaluation: String(formData.get("self_evaluation") ?? ""),
    p_store_manager_name: String(formData.get("store_manager_name") ?? "").trim() || null,
    p_hygiene_officer_name: String(formData.get("hygiene_officer_name") ?? "").trim() || null,
    p_area_manager_name: String(formData.get("area_manager_name") ?? "").trim() || null,
    p_area_hygiene_officer_name: String(formData.get("area_hygiene_officer_name") ?? "").trim() || null,
    p_improvement_reason: String(formData.get("improvement_reason") ?? "").trim() || null,
    p_improvement_action: String(formData.get("improvement_action") ?? "").trim() || null,
    p_special_notes: String(formData.get("special_notes") ?? "").trim() || null,
    p_business_license_expiry_date: String(formData.get("business_license_expiry_date") ?? "").trim() || null,
  });

  if (error) {
    redirect(`/haccp/kiosk/${token}/inspection?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/haccp/kiosk/${token}/inspection?success=1`);
}
