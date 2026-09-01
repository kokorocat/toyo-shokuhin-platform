// OM-00 受発注管理ダッシュボード(仕様書§3)。
// 受注ステータス別件数・今月の受注合計金額・商品点数を一覧し、OM-10(受注管理)・
// OM-30(商品管理)への入口とする。集計はすべて独立クエリのためPromise.allで並列化する
// (このコードベースの規約 — src/app/haccp/admin/page.tsx 参照)。
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { PageHeader } from "@/components/PageHeader";
import { isOrderingAdminRole } from "./guard";
import { OrderingAdminChrome } from "./OrderingAdminChrome";
import { todayInTokyo } from "@/lib/date";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_BADGE_CLASS,
  ORDER_STATUS_KEYS,
} from "@/lib/ordering/order-status";

const ORDER_STATUSES = ORDER_STATUS_KEYS.map((code) => ({
  code,
  label: ORDER_STATUS_LABELS[code],
  badge: ORDER_STATUS_BADGE_CLASS[code],
}));

function StatCard({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${badge}`}>
        {label}
      </span>
      <p className="mt-1.5 text-xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function AdminNavCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/50"
    >
      <div>
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      <svg
        className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-blue-600"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
      </svg>
    </Link>
  );
}

export default async function OrderingAdminDashboardPage() {
  const ctx = await getPortalContext();

  if (!isOrderingAdminRole(ctx?.roleCode ?? null)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">
          権限がありません。管理者アカウントで再度ログインしてください。
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  const todayStr = todayInTokyo();
  const [yearStr, monthStr] = todayStr.split("-");
  const monthLabel = `${yearStr}年${Number(monthStr)}月`;
  const monthStartIso = `${yearStr}-${monthStr}-01T00:00:00+09:00`;

  const [
    newCount,
    inProductionCount,
    preparingShipmentCount,
    shippedCount,
    cancelledCount,
    monthlyOrders,
    activeProducts,
    hiddenProducts,
  ] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "in_production"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "preparing_shipment"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "shipped"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
    supabase
      .from("orders")
      .select("total_amount")
      .gte("created_at", monthStartIso)
      .neq("status", "cancelled"),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "hidden"),
  ]);

  const statusCountMap: Record<string, number> = {
    new: newCount.count ?? 0,
    in_production: inProductionCount.count ?? 0,
    preparing_shipment: preparingShipmentCount.count ?? 0,
    shipped: shippedCount.count ?? 0,
    cancelled: cancelledCount.count ?? 0,
  };

  const monthlyTotal = (monthlyOrders.data ?? []).reduce(
    (sum, order) => sum + (order.total_amount ?? 0),
    0
  );

  return (
    <OrderingAdminChrome activePath="/ordering/admin" displayName={ctx?.displayName}>
      <PageHeader
        backHref="/"
        backLabel="ポータルTOPに戻る"
        title="受注管理"
        subtitle={`${monthLabel}時点`}
      />

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">概況</h2>
        </div>
        <div className="grid grid-cols-2 gap-2.5 px-4 py-4 sm:grid-cols-3 lg:grid-cols-4">
          {ORDER_STATUSES.map((s) => (
            <StatCard
              key={s.code}
              label={s.label}
              value={`${statusCountMap[s.code]}件`}
              badge={s.badge}
            />
          ))}
          <StatCard label="今月の受注合計" value={`¥${monthlyTotal.toLocaleString()}`} badge="bg-slate-100 text-slate-500" />
          <StatCard label="公開中の商品" value={`${activeProducts.count ?? 0}件`} badge="bg-green-100 text-green-700" />
          <StatCard label="非表示の商品" value={`${hiddenProducts.count ?? 0}件`} badge="bg-slate-100 text-slate-500" />
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <AdminNavCard
          href="/ordering/admin/orders"
          title="受注管理"
          description="注文の一覧・詳細確認・ステータス変更を行います"
        />
        <AdminNavCard
          href="/ordering/admin/products"
          title="商品管理"
          description="販促物の追加・編集・公開/非表示の切り替えを行います"
        />
        <AdminNavCard
          href="/ordering/admin/billing"
          title="請求書発行"
          description="店舗ごとの未請求金額を確認し、請求書を発行します"
        />
        <AdminNavCard
          href="/ordering/admin/bulk-order"
          title="複数店舗一斉発注"
          description="複数の店舗をまとめて選択し、同一内容で一括発注します"
        />
      </div>
    </OrderingAdminChrome>
  );
}
