// OM-10 受注詳細・ステータス更新(仕様書3, 7章)。
// 一覧(受注一覧)からの遷移先。許可されたステータス遷移は actions.ts の ALLOWED_TRANSITIONS が
// サーバー側で検証するが、この画面側でも同じ内容を複製し、そもそも許可されない遷移を
// 選択肢として出さないようにする(UI用の複製であり、正当性の担保はactions.ts側が担う)。
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isOrderingAdminRole } from "../../guard";
import { updateOrderStatus } from "../actions";
import { Banner } from "@/components/Banner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { SubmitButton } from "@/components/SubmitButton";

// actions.ts の ALLOWED_TRANSITIONS と同一内容(表示用の複製)。
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  new: ["in_production", "cancelled"],
  in_production: ["preparing_shipment", "cancelled"],
  preparing_shipment: ["shipped", "cancelled"],
  shipped: [],
  cancelled: [],
};

const STATUS_LABELS: Record<string, string> = {
  new: "新規",
  in_production: "制作中",
  preparing_shipment: "出荷準備中",
  shipped: "郵送完了",
  cancelled: "キャンセル",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  in_production: "bg-blue-100 text-blue-700",
  preparing_shipment: "bg-amber-100 text-amber-700",
  shipped: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  normal_pop: "通常POP",
  price_input_pop: "価格入POP",
  viking_price: "バイキングプライス",
  normal_seal: "通常シール",
  seal_price_list: "シール価格表掲載品",
  laminate: "ラミネート",
  other: "その他",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${
        STATUS_BADGE_CLASS[status] ?? "bg-slate-100 text-slate-500"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

function formatYen(amount: number): string {
  return `${amount.toLocaleString()}円`;
}

// --- データ形状(埋め込みselect文字列に対する型はローカルで明示する。他のadmin画面と同様の方針) ---

type OrderLineRow = {
  id: string;
  product_id: string | null;
  product_name_snapshot: string;
  product_type_snapshot: string;
  unit_price_snapshot: number;
  lot_size_snapshot: number;
  quantity: number;
  subtotal: number;
  detail: Record<string, unknown> | null;
  memo: string | null;
  created_at: string;
};

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  delivery_date: string | null;
  shipping_address: string | null;
  memo: string | null;
  shipping_method: string | null;
  shipping_fee: number;
  tracking_number: string | null;
  shipped_on: string | null;
  delivered_on: string | null;
  cancel_reason: string | null;
  total_amount: number;
  billed: boolean;
  created_at: string;
  updated_at: string;
  stores: { name: string; store_code: string } | null;
  companies: { name: string } | null;
  order_lines: OrderLineRow[];
};

type StatusHistoryRow = {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  note: string | null;
  created_at: string;
};

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { orderId } = await params;
  const { error, success } = await searchParams;
  const ctx = await getPortalContext();

  if (!ctx || !isOrderingAdminRole(ctx.roleCode ?? null)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">
          権限がありません。管理者アカウントで再度ログインしてください。
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: orderRaw }, { data: historiesRaw }] = await Promise.all([
    supabase
      .from("orders")
      .select("*, stores(name, store_code), companies(name), order_lines(*)")
      .eq("id", orderId)
      .order("created_at", { referencedTable: "order_lines", ascending: true })
      .maybeSingle(),
    supabase
      .from("order_status_histories")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
  ]);

  // RLSスコープ外、または存在しないIDはnotFoundとして扱う(URL直指定での範囲外取得を防止)
  if (!orderRaw) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order = orderRaw as any as OrderRow;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const histories = (historiesRaw ?? []) as any as StatusHistoryRow[];

  const allowedNext = ALLOWED_TRANSITIONS[order.status] ?? [];
  const showPreparingFields = allowedNext.includes("preparing_shipment");
  const showShippedFields = allowedNext.includes("shipped");
  const showCancelledFields = allowedNext.includes("cancelled");

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6">
      <PageHeader
        backHref="/ordering/admin/orders"
        backLabel="受注一覧に戻る"
        title={order.order_number}
        subtitle={
          order.stores
            ? `${order.companies?.name ? `${order.companies.name} / ` : ""}${order.stores.name}（${order.stores.store_code}）`
            : undefined
        }
      />

      {success && (
        <div className="mb-5">
          <Banner variant="success">更新しました。</Banner>
        </div>
      )}
      {error && (
        <div className="mb-5">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      {/* 受注情報 */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">受注情報</h2>
          <StatusBadge status={order.status} />
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-2 px-5 py-5 text-sm text-slate-700 sm:grid-cols-2">
          <p>
            <span className="font-medium text-slate-500">会社：</span>
            {order.companies?.name ?? "-"}
          </p>
          <p>
            <span className="font-medium text-slate-500">店舗：</span>
            {order.stores ? `${order.stores.name}（${order.stores.store_code}）` : "-"}
          </p>
          <p>
            <span className="font-medium text-slate-500">合計金額：</span>
            <span className="font-bold text-slate-900">{formatYen(order.total_amount)}</span>
          </p>
          <p>
            <span className="font-medium text-slate-500">送料：</span>
            {formatYen(order.shipping_fee)}
          </p>
          <p>
            <span className="font-medium text-slate-500">納品希望日：</span>
            {order.delivery_date ?? "指定なし"}
          </p>
          <p>
            <span className="font-medium text-slate-500">配送方法：</span>
            {order.shipping_method ?? "-"}
          </p>
          <p className="sm:col-span-2">
            <span className="font-medium text-slate-500">配送先住所：</span>
            {order.shipping_address ?? "-"}
          </p>
          <p>
            <span className="font-medium text-slate-500">追跡番号：</span>
            {order.tracking_number ?? "-"}
          </p>
          <p>
            <span className="font-medium text-slate-500">請求：</span>
            {order.billed ? "請求済み" : "未請求"}
          </p>
          <p>
            <span className="font-medium text-slate-500">出荷日：</span>
            {order.shipped_on ?? "-"}
          </p>
          <p>
            <span className="font-medium text-slate-500">配達完了日：</span>
            {order.delivered_on ?? "-"}
          </p>
          <p>
            <span className="font-medium text-slate-500">注文日時：</span>
            {formatDateTime(order.created_at)}
          </p>
          <p>
            <span className="font-medium text-slate-500">最終更新：</span>
            {formatDateTime(order.updated_at)}
          </p>
          {order.status === "cancelled" && order.cancel_reason && (
            <p className="text-red-700 sm:col-span-2">
              <span className="font-medium">キャンセル理由：</span>
              {order.cancel_reason}
            </p>
          )}
          <p className="sm:col-span-2">
            <span className="font-medium text-slate-500">備考：</span>
            {order.memo || "-"}
          </p>
        </div>
      </div>

      {/* 明細 */}
      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          注文明細（{order.order_lines.length}件）
        </h2>
        {order.order_lines.length === 0 ? (
          <EmptyState message="明細がありません。" />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">
                  <th className="whitespace-nowrap px-4 py-3">商品名</th>
                  <th className="whitespace-nowrap px-4 py-3">商品タイプ</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">単価</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">ロット数</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">数量</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">小計</th>
                  <th className="px-4 py-3">詳細</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.order_lines.map((line, idx) => {
                  const detailEntries = line.detail
                    ? Object.entries(line.detail).filter(
                        ([, v]) => v !== null && v !== undefined && v !== ""
                      )
                    : [];
                  return (
                    <tr key={line.id} className={idx % 2 === 1 ? "bg-slate-50/50" : undefined}>
                      <td className="px-4 py-3 font-medium text-slate-800">{line.product_name_snapshot}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {PRODUCT_TYPE_LABELS[line.product_type_snapshot] ?? line.product_type_snapshot}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-600">
                        {formatYen(line.unit_price_snapshot)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-600">
                        {line.lot_size_snapshot}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-600">
                        {line.quantity}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                        {formatYen(line.subtotal)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {detailEntries.length === 0 && !line.memo ? (
                          "-"
                        ) : (
                          <div className="space-y-0.5">
                            {detailEntries.map(([k, v]) => (
                              <p key={k}>
                                {k}: {String(v)}
                              </p>
                            ))}
                            {line.memo && <p>備考: {line.memo}</p>}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ステータス更新 */}
      <section className="mb-6">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">ステータス更新</h2>
          </div>
          <div className="px-5 py-5">
            {allowedNext.length === 0 ? (
              <p className="text-sm text-slate-500">
                現在のステータス（{STATUS_LABELS[order.status] ?? order.status}）はこれ以上変更できません。
              </p>
            ) : (
              <form action={updateOrderStatus} className="space-y-5">
                <input type="hidden" name="order_id" value={order.id} />

                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">次のステータス</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {allowedNext.map((s) => (
                      <label
                        key={s}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 transition-colors has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:checked]:font-semibold has-[:checked]:text-blue-700"
                      >
                        <input
                          type="radio"
                          name="next_status"
                          value={s}
                          required
                          className="h-4 w-4 accent-blue-800"
                        />
                        {STATUS_LABELS[s]}
                      </label>
                    ))}
                  </div>
                </div>

                {(showPreparingFields || showShippedFields || showCancelledFields) && (
                  <div className="space-y-4 border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-400">
                      ※以下は選択したステータスに応じて使用されます。
                    </p>

                    {showPreparingFields && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="shipping_method"
                            className="mb-1.5 block text-xs font-medium text-slate-600"
                          >
                            配送方法（「出荷準備中」の場合）
                          </label>
                          <input
                            id="shipping_method"
                            name="shipping_method"
                            type="text"
                            placeholder="例: 宅配便"
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="shipping_fee"
                            className="mb-1.5 block text-xs font-medium text-slate-600"
                          >
                            送料（「出荷準備中」の場合）
                          </label>
                          <input
                            id="shipping_fee"
                            name="shipping_fee"
                            type="number"
                            min={0}
                            step={1}
                            placeholder="円"
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      </div>
                    )}

                    {showShippedFields && (
                      <div>
                        <label
                          htmlFor="tracking_number"
                          className="mb-1.5 block text-xs font-medium text-slate-600"
                        >
                          追跡番号（「郵送完了」の場合）
                        </label>
                        <input
                          id="tracking_number"
                          name="tracking_number"
                          type="text"
                          placeholder="配送業者の追跡番号"
                          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    )}

                    {showCancelledFields && (
                      <div>
                        <label
                          htmlFor="cancel_reason"
                          className="mb-1.5 block text-xs font-medium text-slate-600"
                        >
                          キャンセル理由（「キャンセル」の場合は必須）
                        </label>
                        <textarea
                          id="cancel_reason"
                          name="cancel_reason"
                          rows={2}
                          placeholder="キャンセル理由を入力してください"
                          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    )}
                  </div>
                )}

                <SubmitButton
                  className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 active:bg-blue-950"
                  pendingText="更新中..."
                >
                  ステータスを更新
                </SubmitButton>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ステータス変更履歴 */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          ステータス変更履歴
        </h2>
        {histories.length === 0 ? (
          <EmptyState message="変更履歴はありません。" />
        ) : (
          <ul className="space-y-2">
            {histories.map((h) => (
              <li
                key={h.id}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {h.from_status ? (
                      <StatusBadge status={h.from_status} />
                    ) : (
                      <span className="text-xs text-slate-400">(新規登録)</span>
                    )}
                    <span className="text-slate-400">→</span>
                    <StatusBadge status={h.to_status} />
                  </div>
                  <span className="text-xs text-slate-400">{formatDateTime(h.created_at)}</span>
                </div>
                {h.note && <p className="mt-1.5 text-xs text-slate-500">理由: {h.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
