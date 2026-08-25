import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Banner } from "@/components/Banner";

const STATUS_LABELS: Record<string, string> = {
  new: "新規",
  in_production: "制作中",
  preparing_shipment: "出荷準備中",
  shipped: "郵送完了",
  cancelled: "キャンセル",
};

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  in_production: "bg-amber-100 text-amber-700",
  preparing_shipment: "bg-purple-100 text-purple-700",
  shipped: "bg-green-100 text-green-700",
  cancelled: "bg-slate-200 text-slate-500",
};

export default async function OrderingHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const { success } = await searchParams;
  const ctx = await getPortalContext();

  if (!ctx?.store) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">
          店舗スコープを持つアカウントでログインしてください。
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, total_amount, delivery_date, created_at, order_lines(id)")
    .eq("store_id", ctx.store.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <PageHeader
        backHref="/ordering"
        backLabel="商品カタログに戻る"
        title="発注履歴"
        subtitle={`${ctx.store.name}（${ctx.store.storeCode}）`}
      />

      {success && (
        <div className="mb-5">
          <Banner variant="success">発注を確定しました。</Banner>
        </div>
      )}

      {!orders || orders.length === 0 ? (
        <EmptyState message="発注履歴がありません。" />
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li
              key={o.id}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{o.order_number}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {new Date(o.created_at).toLocaleString("ja-JP")} ・ 明細{o.order_lines?.length ?? 0}件
                    {o.delivery_date ? ` ・ 納品日 ${o.delivery_date}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${
                      STATUS_STYLES[o.status] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                  <p className="mt-1 text-sm font-bold text-slate-900">{o.total_amount.toLocaleString()}円</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
