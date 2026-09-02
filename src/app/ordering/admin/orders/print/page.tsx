import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isOrderingAdminRole } from "@/app/ordering/admin/guard";
import { ORDER_STATUS_LABELS } from "@/lib/ordering/order-status";
import { PrintButton } from "./PrintButton";

type PrintOrder = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  shipping_address: string | null;
  stores: { name: string } | { name: string }[] | null;
  order_lines: {
    product_id: string | null;
    product_name_snapshot: string;
    quantity: number;
    lot_size_snapshot: number;
    unit_price_snapshot: number;
    subtotal: number;
  }[];
};

function oneName(v: PrintOrder["stores"]): string {
  if (!v) return "-";
  return Array.isArray(v) ? (v[0]?.name ?? "-") : v.name;
}

export default async function OrderingBulkPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const ctx = await getPortalContext();
  if (!ctx || !isOrderingAdminRole(ctx.roleCode ?? null)) {
    return <p className="p-8 text-sm text-slate-500">権限がありません。</p>;
  }

  const statusFilter = status === "shipped" ? "shipped" : "preparing_shipment";
  const title = statusFilter === "shipped" ? "発送済み 一括印刷" : "発送準備中 一括印刷";

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, status, total_amount, created_at, shipping_address, stores(name), order_lines(product_id, product_name_snapshot, quantity, lot_size_snapshot, unit_price_snapshot, subtotal)")
    .eq("status", statusFilter)
    .order("created_at", { ascending: false })
    .limit(50);

  const orders = (data ?? []) as PrintOrder[];
  const productIds = [...new Set(orders.flatMap((o) => o.order_lines.map((l) => l.product_id).filter(Boolean)))] as string[];
  const { data: images } = productIds.length
    ? await supabase.from("product_images").select("product_id, storage_path, is_primary").in("product_id", productIds)
    : { data: [] as { product_id: string; storage_path: string; is_primary: boolean }[] };

  const imageByProduct = new Map<string, string>();
  for (const img of images ?? []) {
    if (img.is_primary || !imageByProduct.has(img.product_id)) {
      const { data: pub } = supabase.storage.from("product-images").getPublicUrl(img.storage_path);
      imageByProduct.set(img.product_id, pub.publicUrl);
    }
  }

  return (
    <div className="min-h-screen bg-white px-6 py-6 print:px-0">
      <div className="mb-4 border-t-4 border-orange-500 pt-3 print:border-t-0">
        <h1 className="text-xl font-bold text-orange-600">{title}</h1>
        <PrintButton />
        {/* 要確認: 対象受注の抽出条件(現状はstatus=preparing_shipment/shippedの直近50件) */}
      </div>
      {orders.length === 0 ? (
        <p className="text-sm text-slate-500">該当する受注がありません。</p>
      ) : (
        <div className="space-y-8">
          {orders.map((order) => (
            <section key={order.id} className="border-b border-slate-300 pb-6">
              <div className="mb-3 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-lg font-bold text-slate-900">受注ID {order.order_number}</p>
                  <p className="text-sm text-slate-600">発注日時: {new Date(order.created_at).toLocaleString("ja-JP")}</p>
                  <p className="text-sm text-slate-600">ステータス: {ORDER_STATUS_LABELS[order.status] ?? order.status}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">店舗名: {oneName(order.stores)}</p>
                  <p className="text-sm text-slate-600">配送先: {order.shipping_address ?? "-"}</p>
                  <p className="text-sm font-bold">合計: ¥{order.total_amount.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {order.order_lines.map((line, i) => (
                  <div key={`${order.id}-${i}`} className="w-40 rounded-lg border border-slate-200 p-2">
                    <p className="text-xs font-bold text-slate-800">{line.product_name_snapshot}</p>
                    {line.product_id && imageByProduct.get(line.product_id) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageByProduct.get(line.product_id)} alt="" className="mt-1 h-24 w-full object-contain" />
                    ) : (
                      <div className="mt-1 flex h-24 items-center justify-center bg-slate-100 text-[10px] text-slate-400">NO IMAGE</div>
                    )}
                    <p className="mt-1 text-[10px] text-slate-600">数量 {line.quantity} / 合計 {line.quantity * line.lot_size_snapshot}枚</p>
                    <p className="text-[10px] text-slate-600">単価 ¥{line.unit_price_snapshot.toLocaleString()} / 小計 ¥{line.subtotal.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
