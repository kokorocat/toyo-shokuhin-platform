"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// 許可遷移(仕様書7章): 新規→制作中→出荷準備中→郵送完了。キャンセルは郵送完了前までを基本とする。
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  new: ["in_production", "cancelled"],
  in_production: ["preparing_shipment", "cancelled"],
  preparing_shipment: ["shipped", "cancelled"],
  shipped: [],
  cancelled: [],
};

export async function updateOrderStatus(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orderId = String(formData.get("order_id") ?? "");
  const nextStatus = String(formData.get("next_status") ?? "");
  const cancelReason = String(formData.get("cancel_reason") ?? "").trim();
  const shippingMethod = String(formData.get("shipping_method") ?? "").trim();
  const shippingFeeRaw = String(formData.get("shipping_fee") ?? "").trim();
  const trackingNumber = String(formData.get("tracking_number") ?? "").trim();

  if (!orderId) redirect("/ordering/admin/orders");

  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    redirect(`/ordering/admin/orders?error=${encodeURIComponent("注文が見つかりません")}`);
  }

  const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(nextStatus)) {
    redirect(
      `/ordering/admin/orders/${orderId}?error=${encodeURIComponent(
        `「${order.status}」から「${nextStatus}」への変更はできません`
      )}`
    );
  }

  if (nextStatus === "cancelled" && !cancelReason) {
    redirect(
      `/ordering/admin/orders/${orderId}?error=${encodeURIComponent("キャンセル理由を入力してください")}`
    );
  }

  const updates: {
    status: string;
    cancel_reason?: string;
    shipping_method?: string;
    shipping_fee?: number;
    tracking_number?: string;
    shipped_on?: string;
  } = { status: nextStatus };
  if (nextStatus === "cancelled") {
    updates.cancel_reason = cancelReason;
  }
  if (nextStatus === "preparing_shipment") {
    if (shippingMethod) updates.shipping_method = shippingMethod;
    if (shippingFeeRaw) {
      const fee = Number(shippingFeeRaw);
      if (Number.isFinite(fee) && fee >= 0) updates.shipping_fee = Math.round(fee);
    }
  }
  if (nextStatus === "shipped") {
    if (trackingNumber) updates.tracking_number = trackingNumber;
    updates.shipped_on = new Date().toISOString().slice(0, 10);
  }

  const { error: updateError } = await supabase.from("orders").update(updates).eq("id", orderId);
  if (updateError) {
    redirect(`/ordering/admin/orders/${orderId}?error=${encodeURIComponent(updateError.message)}`);
  }

  const { error: historyError } = await supabase.from("order_status_histories").insert({
    order_id: orderId,
    from_status: order.status,
    to_status: nextStatus,
    changed_by: user.id,
    note: nextStatus === "cancelled" ? cancelReason : null,
  });
  if (historyError) {
    console.error("[ordering/admin/orders] status history insert failed", historyError);
  }

  revalidatePath("/ordering/admin/orders");
  revalidatePath(`/ordering/admin/orders/${orderId}`);
  redirect(`/ordering/admin/orders/${orderId}?success=1`);
}
