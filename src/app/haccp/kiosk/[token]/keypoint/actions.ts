"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const KEYPOINT_CODES = ["heat_room", "heat_cold", "nonheat_room", "nonheat_cold", "mixed_room", "mixed_cold"] as const;

export async function kioskSubmitKeypoint(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const targetDate = String(formData.get("target_date") ?? "");
  const confirmedByName = String(formData.get("confirmed_by_name") ?? "").trim();

  // 特記事項はGASと同じく6項目共通の1欄(shared_note)。否の項目にのみ適用し、
  // 良の項目には記録しない(haccp/keypoint/actions.tsと同じ理由)。
  const sharedNote = String(formData.get("shared_note") ?? "").trim() || null;

  const items: Record<string, { judgment: string; note: string | null }> = {};
  let hasNg = false;
  for (const code of KEYPOINT_CODES) {
    const judgment = String(formData.get(`judgment_${code}`) ?? "");
    if (judgment !== "ok" && judgment !== "ng") {
      redirect(`/haccp/kiosk/${token}/keypoint?error=${encodeURIComponent("全ての項目に良否を入力してください")}`);
    }
    if (judgment === "ng") hasNg = true;
    items[code] = { judgment, note: judgment === "ng" ? sharedNote : null };
  }
  if (hasNg && !sharedNote) {
    redirect(`/haccp/kiosk/${token}/keypoint?error=${encodeURIComponent("否の項目には理由を入力してください")}`);
  }

  const tempValueRaw = String(formData.get("temp_value") ?? "").trim();
  const tempJudgment = String(formData.get("temp_judgment") ?? "").trim() || null;
  const tempNote = String(formData.get("temp_note") ?? "").trim() || null;
  const labelJudgment = String(formData.get("label_judgment") ?? "").trim() || null;
  const labelNote = String(formData.get("label_note") ?? "").trim() || null;

  if (tempJudgment === "ng" && !tempNote) {
    redirect(`/haccp/kiosk/${token}/keypoint?error=${encodeURIComponent("温度チェックがNGの場合は理由を入力してください")}`);
  }
  if (labelJudgment === "ng" && !labelNote) {
    redirect(`/haccp/kiosk/${token}/keypoint?error=${encodeURIComponent("ラベルチェックがNGの場合は理由を入力してください")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("kiosk_submit_keypoint", {
    p_token: token,
    p_target_date: targetDate,
    p_confirmed_by_name: confirmedByName,
    p_items: items,
    p_temp_value: tempValueRaw ? Number(tempValueRaw) : null,
    p_temp_judgment: tempJudgment,
    p_temp_note: tempNote,
    p_label_judgment: labelJudgment,
    p_label_note: labelNote,
  });

  if (error) {
    redirect(`/haccp/kiosk/${token}/keypoint?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/haccp/kiosk/${token}/keypoint?success=1`);
}
