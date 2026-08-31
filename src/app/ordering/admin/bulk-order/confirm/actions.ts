"use server";

import { createClient } from "@/lib/supabase/server";
import type { CartItem } from "@/app/ordering/CartContext";
import { placeOrder, type PlaceOrderResult } from "@/lib/ordering/place-order";

export type BulkConfirmInput = {
  companyId: string;
  storeIds: string[];
  deliveryDate: string;
  shippingAddress: string;
  memo: string;
  items: CartItem[];
};

export type BulkConfirmResult =
  | { ok: true; bulkOrderId: string; orderCount: number }
  | { ok: false; error: string; partial?: { storeId: string; error: string }[] };

export async function bulkConfirmOrder(input: BulkConfirmInput): Promise<BulkConfirmResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "セッションが切れています。再度ログインしてください。" };

  if (input.storeIds.length === 0) {
    return { ok: false, error: "発注先の店舗を1店舗以上選択してください。" };
  }
  if (input.items.length === 0) {
    return { ok: false, error: "カートが空です。" };
  }

  // 権限のない店舗が紛れ込んでいてもorders_insertのRLS(store_id in user_store_ids())が
  // 最終防衛線として拒否するため、ここでは事前フィルタは行わずRPCの結果をそのまま反映する。
  const { data: bulkOrder, error: bulkOrderError } = await supabase
    .from("bulk_orders")
    .insert({
      company_id: input.companyId,
      created_by: user.id,
      target_description: `${input.storeIds.length}店舗への一斉発注`,
      store_count: input.storeIds.length,
    })
    .select("id")
    .single();

  if (bulkOrderError || !bulkOrder) {
    return { ok: false, error: bulkOrderError?.message ?? "一斉発注の登録に失敗しました。" };
  }

  const failures: { storeId: string; error: string }[] = [];
  let successCount = 0;

  for (const storeId of input.storeIds) {
    const result = await placeOrder(supabase, {
      storeId,
      companyId: input.companyId,
      orderedBy: user.id,
      deliveryDate: input.deliveryDate,
      shippingAddress: input.shippingAddress,
      memo: input.memo,
      items: input.items,
      bulkOrderId: bulkOrder.id,
    });
    if (result.ok) {
      successCount += 1;
    } else {
      failures.push({ storeId, error: result.error });
    }
  }

  if (successCount === 0) {
    return { ok: false, error: "すべての店舗で発注に失敗しました。", partial: failures };
  }

  return { ok: true, bulkOrderId: bulkOrder.id, orderCount: successCount };
}
