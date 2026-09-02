import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Banner } from "@/components/Banner";

import {
  ORDER_STATUS_LABELS as STATUS_LABELS,
  ORDER_STATUS_BADGE_CLASS as STATUS_STYLES,
} from "@/lib/ordering/order-status";

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
  const [{ data: orders }, { data: invoices }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, status, total_amount, delivery_date, created_at, order_lines(id)")
      .eq("store_id", ctx.store.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("invoices")
      .select("id, invoice_number, period_start, period_end, total_amount, status, issued_at")
      .eq("store_id", ctx.store.id)
      .order("issued_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <PageHeader
        backHref="/ordering"
        backLabel="商品カタログに戻る"
        title="発注履歴"
        subtitle={`${ctx.store.name}（${ctx.store.storeCode}）`}
      />

      {success && (
        <div className="mb-4">
          <Banner variant="success">発注を確定しました。</Banner>
        </div>
      )}

      {!orders || orders.length === 0 ? (
        <EmptyState message="発注履歴がありません。" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">
                <th className="whitespace-nowrap px-4 py-2.5">注文番号</th>
                <th className="whitespace-nowrap px-4 py-2.5">状態</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-right">金額</th>
                <th className="whitespace-nowrap px-4 py-2.5">日時</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o, idx) => (
                <tr key={o.id} className={idx % 2 === 1 ? "bg-slate-50/60" : ""}>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <p className="text-sm font-medium text-slate-800">{o.order_number}</p>
                    <p className="text-[11px] text-slate-400">
                      明細{o.order_lines?.length ?? 0}件
                      {o.delivery_date ? ` ・ 納品 ${o.delivery_date}` : ""}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        STATUS_STYLES[o.status] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    <p className="text-sm font-bold text-slate-900">¥{o.total_amount.toLocaleString()}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">
                    {new Date(o.created_at).toLocaleString("ja-JP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-3 mt-8 text-xs font-semibold uppercase tracking-wider text-slate-400">請求書</h2>
      {!invoices || invoices.length === 0 ? (
        <EmptyState message="発行済みの請求書がありません。" />
      ) : (
        <ul className="space-y-2">
          {invoices.map((inv) => (
            <li
              key={inv.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 shadow-sm ${
                inv.status === "superseded" ? "border-slate-200 bg-slate-50 opacity-60" : "border-slate-200 bg-white"
              }`}
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{inv.invoice_number}</p>
                <p className="text-xs text-slate-400">
                  {inv.period_start} 〜 {inv.period_end}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {inv.status === "superseded" && (
                  <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">無効</span>
                )}
                <span className="text-sm font-bold tabular-nums text-slate-900">
                  ¥{inv.total_amount.toLocaleString("ja-JP")}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
