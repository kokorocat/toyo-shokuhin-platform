"use server";

import { createClient } from "@/lib/supabase/server";
import type { CartItem } from "../CartContext";
import { placeOrder, type PlaceOrderResult } from "@/lib/ordering/place-order";

export type ConfirmOrderInput = {
  storeId: string;
  companyId: string;
  deliveryDate: string;
  shippingAddress: string;
  memo: string;
  items: CartItem[];
};

export type ConfirmOrderResult = PlaceOrderResult;

export async function confirmOrder(input: ConfirmOrderInput): Promise<ConfirmOrderResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "セッションが切れています。再度ログインしてください。" };

  return placeOrder(supabase, {
    storeId: input.storeId,
    companyId: input.companyId,
    orderedBy: user.id,
    deliveryDate: input.deliveryDate,
    shippingAddress: input.shippingAddress,
    memo: input.memo,
    items: input.items,
  });
}
