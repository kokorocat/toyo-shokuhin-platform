// OM-10 受注一覧(仕様書7章 受注・明細・ステータス)。
// ステータス変更・キャンセル理由の登録などの遷移制御はactions.ts(updateOrderStatus)に実装済みで、
// この一覧画面は「次にどの注文を見るか」を絞り込み・特定するための入口に徹する。
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isOrderingAdminRole } from "@/app/ordering/admin/guard";
import { Banner } from "@/components/Banner";
import { EmptyState } from "@/components/EmptyState";
import { OrderingAdminChrome } from "@/app/ordering/admin/OrderingAdminChrome";

const PAGE_SIZE = 50;
// 一覧はまず妥当な範囲(直近1000件)まで取得してからステータス以外の条件(店舗名/注文番号)を
// JS側で絞り込む。件数が多くなった場合でも管理者が見るのは基本的に新しい注文が中心のため、
// created_at降順のこの範囲で実用上十分と判断する(仕様書14章 非機能要件)。
const FETCH_LIMIT = 1000;

// 許可遷移順(仕様書7章)と合わせた並び。
import {
  ORDER_STATUS_LABELS as STATUS_LABELS,
  ORDER_STATUS_KEYS as STATUS_KEYS,
  ORDER_STATUS_BADGE_CLASS as STATUS_STYLES,
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
  memo: string | null;
  shipping_address: string | null;
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
    .select("id, order_number, status, total_amount, created_at, delivery_date, memo, shipping_address, stores(name)")
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
          storeName(o).toLowerCase().includes(qLower) ||
          (o.memo ?? "").toLowerCase().includes(qLower) ||
          (o.shipping_address ?? "").toLowerCase().includes(qLower)
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

  const storeCounts = new Map<string, number>();
  for (const o of filteredOrders) {
    const name = storeName(o);
    storeCounts.set(name, (storeCounts.get(name) ?? 0) + 1);
  }

  return (
    <OrderingAdminChrome activePath="/ordering/admin/orders" displayName={ctx.displayName}>
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

      <h1 className="text-lg font-bold text-slate-900">受注管理</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white">＋ 本部で新規注文を入力</span>
        <Link href="/ordering/admin/bulk-order" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800">
          複数店舗へ一括発注
        </Link>
        <Link href="/ordering/admin/orders" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800">
          受注再読込
        </Link>
        <Link href="/ordering/admin/orders/print?status=preparing_shipment" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800">
          未処理を一括印刷
        </Link>
        <Link href="/ordering/admin/orders/print?status=shipped" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800">
          発送済みを一括印刷
        </Link>
        {/* 要確認: 本部新規注文入力・一括印刷の実処理（印刷レイアウトは /ordering/admin/orders/print） */}
      </div>

      <form method="get" action="/ordering/admin/orders" className="mt-4 flex flex-wrap items-end gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Link href="/ordering/admin/orders" className={`rounded-full px-3 py-1.5 text-xs font-bold ${!statusFilter ? "bg-slate-800 text-white" : "border border-blue-300 text-blue-700"}`}>すべて</Link>
          {STATUS_KEYS.map((key) => (
            <Link
              key={key}
              href={`/ordering/admin/orders?status=${key}`}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusFilter === key ? "bg-slate-800 text-white" : "border border-blue-300 text-blue-700"}`}
            >
              {STATUS_LABELS[key]}
            </Link>
          ))}
        </div>
        <input type="hidden" name="status" value={statusFilter ?? ""} />
        <div className="min-w-[16rem] flex-1">
          <input
            id="q"
            name="q"
            type="text"
            defaultValue={q ?? ""}
            placeholder="フリーワード検索（社名・店舗名・配送先・備考など）"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <button type="submit" className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white">絞り込む</button>
      </form>

      {totalCount === 0 ? (
        <EmptyState message="該当する注文がありません。" />
      ) : (
        <>
          <div className="mt-4 mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-800">
              受注一覧（{statusFilter ? STATUS_LABELS[statusFilter] : "すべて"}）
            </p>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">{totalCount}件</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="whitespace-nowrap px-3 py-2.5">発注日時</th>
                  <th className="whitespace-nowrap px-3 py-2.5">店舗名</th>
                  <th className="whitespace-nowrap px-3 py-2.5">配送先</th>
                  <th className="whitespace-nowrap px-3 py-2.5">ステータス</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-right">金額</th>
                  <th className="whitespace-nowrap px-3 py-2.5">操作</th>
                </tr>
              </thead>
              <tbody>
                {pageOrders.map((order, idx) => {
                  const name = storeName(order);
                  const multi = (storeCounts.get(name) ?? 0) > 1;
                  const hasMemo = Boolean(order.memo);
                  return (
                    <tr
                      key={order.id}
                      className={`border-l-4 ${hasMemo || multi ? "border-l-orange-400" : "border-l-transparent"} ${idx % 2 === 1 ? "bg-amber-50/40" : "bg-white"}`}
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-600">
                        {new Date(order.created_at).toLocaleString("ja-JP")}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {multi && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">同一店舗複数件</span>}
                          {hasMemo && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">備考あり</span>}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-800">{name}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600">{order.shipping_address ?? "-"}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <Link href={`/ordering/admin/orders/${order.id}`} className="block">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLES[order.status] ?? "bg-slate-100 text-slate-700"}`}>
                            {STATUS_LABELS[order.status] ?? order.status}
                          </span>
                        </Link>
                        <select defaultValue={order.status} className="mt-1 rounded border border-slate-300 bg-white px-1 py-0.5 text-[11px]" disabled>
                          {STATUS_KEYS.map((key) => (
                            <option key={key} value={key}>{STATUS_LABELS[key]}</option>
                          ))}
                        </select>
                        {/* 要確認: 一覧からのステータス直接変更は未接続（詳細画面の既存処理を利用） */}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                        <p className="font-bold text-slate-900">¥{order.total_amount.toLocaleString()}</p>
                        <p className="text-[11px] text-slate-500">小計: ¥{order.total_amount.toLocaleString()}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          <Link href={`/ordering/admin/orders/${order.id}`} className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px]">詳細</Link>
                          <Link href={`/ordering/admin/orders/${order.id}#lines`} className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px]">明細</Link>
                          <span className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px]">郵送設定</span>
                          <span className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px]">クイック編集</span>
                          <span className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px]">明細編集</span>
                          {/* 要確認: 郵送設定・クイック編集・明細編集の実処理 */}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
    </OrderingAdminChrome>
  );
}
