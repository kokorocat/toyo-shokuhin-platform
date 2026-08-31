// confirmOrder(src/app/ordering/confirm/actions.ts)の中核ロジック(価格再検証・注文/明細/
// ステータス履歴の登録)を切り出した共有ヘルパー。単一店舗の発注確定と、複数店舗一斉発注の
// 両方から呼び出す(店舗ごとに同じ検証・登録処理を行う必要があるため)。
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CartItem } from "@/app/ordering/CartContext";
import { todayInTokyo } from "@/lib/date";

export type PlaceOrderInput = {
  storeId: string;
  companyId: string;
  orderedBy: string;
  deliveryDate: string;
  shippingAddress: string;
  memo: string;
  items: CartItem[];
  bulkOrderId?: string | null;
};

export type PlaceOrderResult = { ok: true; orderId: string } | { ok: false; error: string };

function generateOrderNumber() {
  const ymd = todayInTokyo().replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `OS${ymd}-${rand}`;
}

export async function placeOrder(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  input: PlaceOrderInput
): Promise<PlaceOrderResult> {
  if (!input.storeId || !input.companyId) {
    return { ok: false, error: "店舗情報を取得できませんでした。" };
  }
  if (input.items.length === 0) {
    return { ok: false, error: "カートが空です。" };
  }

  // 価格再検証(仕様書13): 商品マスターの現在価格・状態をサーバー側で再確認する
  const productIds = input.items.map((i) => i.productId);
  const { data: currentProducts, error: productsError } = await supabase
    .from("products")
    .select("id, name, product_type, unit_price, lot_size, status")
    .in("id", productIds);

  if (productsError) {
    return { ok: false, error: productsError.message };
  }

  const productMap = new Map((currentProducts ?? []).map((p) => [p.id, p]));
  for (const item of input.items) {
    const current = productMap.get(item.productId);
    if (!current || current.status !== "active") {
      return { ok: false, error: `「${item.name}」は現在ご注文いただけません。カートをご確認ください。` };
    }
  }

  const totalAmount = input.items.reduce((sum, item) => {
    const current = productMap.get(item.productId)!;
    return sum + current.unit_price * current.lot_size * item.quantity;
  }, 0);

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: generateOrderNumber(),
      company_id: input.companyId,
      store_id: input.storeId,
      ordered_by: input.orderedBy,
      bulk_order_id: input.bulkOrderId ?? null,
      status: "new",
      delivery_date: input.deliveryDate || null,
      shipping_address: input.shippingAddress || null,
      memo: input.memo || null,
      total_amount: totalAmount,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return { ok: false, error: orderError?.message ?? "発注の登録に失敗しました。" };
  }

  const lineRows = input.items.map((item) => {
    const current = productMap.get(item.productId)!;
    return {
      order_id: order.id,
      product_id: item.productId,
      product_name_snapshot: current.name,
      product_type_snapshot: current.product_type,
      unit_price_snapshot: current.unit_price,
      lot_size_snapshot: current.lot_size,
      quantity: item.quantity,
      subtotal: current.unit_price * current.lot_size * item.quantity,
      detail: item.detail,
      memo: item.memo || null,
    };
  });

  const { error: linesError } = await supabase.from("order_lines").insert(lineRows);
  if (linesError) {
    return { ok: false, error: linesError.message };
  }

  await supabase.from("order_status_histories").insert({
    order_id: order.id,
    from_status: null,
    to_status: "new",
    changed_by: input.orderedBy,
  });

  return { ok: true, orderId: order.id };
}
