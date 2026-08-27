"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const KEYPOINT_CODES = ["heat_room", "heat_cold", "nonheat_room", "nonheat_cold", "mixed_room", "mixed_cold"] as const;

export async function kioskSubmitKeypoint(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const targetDate = String(formData.get("target_date") ?? "");

  const items: Record<string, { checked: boolean; note: string | null }> = {};
  for (const code of KEYPOINT_CODES) {
    items[code] = {
      checked: formData.get(`checked_${code}`) === "on",
      note: String(formData.get(`note_${code}`) ?? "").trim() || null,
    };
  }

  const tempValueRaw = String(formData.get("temp_value") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.rpc("kiosk_submit_keypoint", {
    p_token: token,
    p_target_date: targetDate,
    p_items: items,
    p_temp_value: tempValueRaw ? Number(tempValueRaw) : null,
    p_temp_judgment: String(formData.get("temp_judgment") ?? "").trim() || null,
    p_temp_note: String(formData.get("temp_note") ?? "").trim() || null,
    p_label_judgment: String(formData.get("label_judgment") ?? "").trim() || null,
    p_label_note: String(formData.get("label_note") ?? "").trim() || null,
  });

  if (error) {
    redirect(`/haccp/kiosk/${token}/keypoint?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/haccp/kiosk/${token}/keypoint?success=1`);
}
