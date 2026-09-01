// OM-10 受注一覧(仕様書7章 受注・明細・ステータス)。
// ステータス変更・キャンセル理由の登録などの遷移制御はactions.ts(updateOrderStatus)に実装済みで、
// この一覧画面は「次にどの注文を見るか」を絞り込み・特定するための入口に徹する。
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isOrderingAdminRole } from "@/app/ordering/admin/guard";
import { Banner } from "@/components/Banner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

const PAGE_SIZE = 50;
// 一覧はまず妥当な範囲(直近1000件)まで取得してからステータス以外の条件(店舗名/注文番号)を
// JS側で絞り込む。件数が多くなった場合でも管理者が見るのは基本的に新しい注文が中心のため、
// created_at降順のこの範囲で実用上十分と判断する(仕様書14章 非機能要件)。
const FETCH_LIMIT = 1000;

// 許可遷移順(仕様書7章)と合わせた並び。
import {
  ORDER_STATUS_LABELS as STATUS_LABELS,
  ORDER_STATUS_BADGE_CLASS as STATUS_STYLES,
  ORDER_STATUS_KEYS as STATUS_KEYS,
} from "@/lib/ordering/order-status";

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  const value = Array.isArray(v) ? v[0] : v;
  return value && value.length > 0 ? value : undefined;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) sp.set(key, value);
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

type OrderListRow = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  delivery_date: string | null;
  stores: { name: string } | { name: string }[] | null;
};

function storeName(row: OrderListRow): string {
  const s = row.stores;
  if (!s) return "-";
  return Array.isArray(s) ? (s[0]?.name ?? "-") : s.name;
}

export default async function OrderingAdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const ctx = await getPortalContext();

  if (!ctx || !isOrderingAdminRole(ctx.roleCode ?? null)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">
          権限がありません。管理者権限を持つアカウントで再ログインしてください。
        </p>
      </div>
    );
  }

  const errorMessage = first(sp.error);
  const successFlag = first(sp.success);
  const warningMessage = first(sp.warning);

  const rawStatus = first(sp.status);
  const statusFilter = rawStatus && STATUS_KEYS.includes(rawStatus) ? rawStatus : undefined;
  const q = first(sp.q);

  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select("id, order_number, status, total_amount, created_at, delivery_date, stores(name)")
    .order("created_at", { ascending: false })
    .limit(FETCH_LIMIT);
  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }
  const { data, error } = await query;

  const orders = (data ?? []) as OrderListRow[];

  const qLower = q?.trim().toLowerCase();
  const filteredOrders = qLower
    ? orders.filter(
        (o) =>
          o.order_number.toLowerCase().includes(qLower) ||
          storeName(o).toLowerCase().includes(qLower)
      )
    : orders;

  const totalCount = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const rawPageNum = Number(first(sp.page));
  const page =
    Number.isFinite(rawPageNum) && rawPageNum >= 1 ? Math.min(Math.floor(rawPageNum), totalPages) : 1;
  const pageOrders = filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const currentParams: Record<string, string | undefined> = {
    status: statusFilter,
    q,
  };

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6">
      <PageHeader
        backHref="/ordering"
        backLabel="カタログに戻る"
        title="受注一覧"
        subtitle="発注された注文の確認・ステータス管理"
      />

      {errorMessage && (
        <div className="mb-4">
          <Banner variant="error">{errorMessage}</Banner>
        </div>
      )}
      {warningMessage ? (
        <div className="mb-4">
          <Banner variant="warning">{warningMessage}</Banner>
        </div>
      ) : (
        successFlag && (
          <div className="mb-4">
            <Banner variant="success">発注を確定しました。</Banner>
          </div>
        )
      )}
      {error && (
        <div className="mb-4">
          <Banner variant="error">注文の取得に失敗しました: {error.message}</Banner>
        </div>
      )}

      <form
        method="get"
        action="/ordering/admin/orders"
        className="mb-5 rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-end gap-3 px-4 py-3">
          <div className="w-40">
            <label htmlFor="status" className="mb-1 block text-[11px] font-medium text-slate-500">
              状態
            </label>
            <select
              id="status"
              name="status"
              defaultValue={statusFilter ?? ""}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">すべて</option>
              {STATUS_KEYS.map((key) => (
                <option key={key} value={key}>
                  {STATUS_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="q" className="mb-1 block text-[11px] font-medium text-slate-500">
              店舗名 / 注文番号
            </label>
            <input
              id="q"
              name="q"
              type="text"
              defaultValue={q ?? ""}
              placeholder="部分一致"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              絞り込む
            </button>
            <Link
              href="/ordering/admin/orders"
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              クリア
            </Link>
          </div>
        </div>
      </form>

      {totalCount === 0 ? (
        <EmptyState message="該当する注文がありません。" />
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              該当 {totalCount}件中 {(page - 1) * PAGE_SIZE + 1}〜{Math.min(page * PAGE_SIZE, totalCount)}件
            </p>
            <p className="text-xs text-slate-400">
              {page} / {totalPages} ページ
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="whitespace-nowrap px-3 py-2.5">注文番号</th>
                  <th className="whitespace-nowrap px-3 py-2.5">店舗</th>
                  <th className="whitespace-nowrap px-3 py-2.5">状態</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-right">合計金額</th>
                  <th className="whitespace-nowrap px-3 py-2.5">受注日時</th>
                  <th className="whitespace-nowrap px-3 py-2.5">納品日</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageOrders.map((order, idx) => (
                  <tr key={order.id} className={`transition-colors hover:bg-blue-50/50 ${idx % 2 === 1 ? "bg-slate-50/60" : ""}`}>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <Link
                        href={`/ordering/admin/orders/${order.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{storeName(order)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          STATUS_STYLES[order.status] ?? "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-600">
                      ¥{order.total_amount.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500">
                      {new Date(order.created_at).toLocaleString("ja-JP")}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500">
                      {order.delivery_date ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav className="mt-4 flex flex-wrap items-center justify-center gap-1" aria-label="ページ">
              <Link
                href={`/ordering/admin/orders${buildQuery({ ...currentParams, page: String(Math.max(1, page - 1)) })}`}
                aria-disabled={page === 1}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  page === 1
                    ? "pointer-events-none border-slate-200 bg-slate-50 text-slate-300"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                前へ
              </Link>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/ordering/admin/orders${buildQuery({ ...currentParams, page: String(p) })}`}
                  aria-current={p === page ? "page" : undefined}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    p === page
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </Link>
              ))}
              <Link
                href={`/ordering/admin/orders${buildQuery({ ...currentParams, page: String(Math.min(totalPages, page + 1)) })}`}
                aria-disabled={page === totalPages}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  page === totalPages
                    ? "pointer-events-none border-slate-200 bg-slate-50 text-slate-300"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                次へ
              </Link>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
