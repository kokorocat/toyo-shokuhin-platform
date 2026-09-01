// HM-10 店舗別回答状況(仕様書6「管理者機能」)。
// HM-00と同じ絞り込み条件・集計ロジックを独立して取得する(画面間でランタイム状態は共有しない)。
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isHaccpAdminRole } from "@/app/haccp/admin/guard";
import {
  getScopedStores,
  computeKeypointStatus,
  computeEmployeeStatus,
  computeInspectionStatus,
  computeConfirmationStatus,
  getHalfMonthPeriod,
  type HaccpAdminFilters,
  type KeypointStatus,
  type EmployeeStatus,
  type InspectionStatus,
  type ConfirmationStatus,
} from "@/lib/haccp/admin-dashboard";
import { EmptyState } from "@/components/EmptyState";
import { todayInTokyo } from "@/lib/date";
import { HaccpAdminChrome, HaccpAdminTabs } from "@/app/haccp/admin/HaccpAdminChrome";

const PAGE_SIZE = 50;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

const GREEN = "bg-green-100 text-green-700";
const RED = "bg-red-100 text-red-700";
const NEUTRAL = "bg-slate-100 text-slate-500";
const SLATE = "bg-slate-100 text-slate-500";
const AMBER = "bg-amber-100 text-amber-700";

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

function Badge({ label, className, sub }: { label: string; className: string; sub?: string }) {
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${className}`}>
        {label}
      </span>
      {sub && <span className="text-[11px] text-slate-400">{sub}</span>}
    </div>
  );
}

function keypointBadge(s: KeypointStatus | undefined): { label: string; className: string } {
  if (!s) return { label: "対象外", className: SLATE };
  if (s.status === "answered") {
    return s.needsImprovement ? { label: "要改善", className: RED } : { label: "回答済", className: GREEN };
  }
  if (s.status === "unanswered") return { label: "未回答", className: NEUTRAL };
  if (s.status === "holiday") return { label: "店休日", className: SLATE };
  return { label: "対象外", className: SLATE };
}

function employeeBadge(s: EmployeeStatus | undefined): { label: string; className: string; sub?: string } {
  if (!s) return { label: "対象外", className: SLATE };
  if (s.status === "recorded") {
    return {
      label: s.hasIssue ? "要改善" : "記録済",
      className: s.hasIssue ? RED : GREEN,
      sub: `回答人数 ${s.responseCount}名`,
    };
  }
  if (s.status === "not_recorded") return { label: "記録なし", className: NEUTRAL };
  if (s.status === "holiday") return { label: "店休日", className: SLATE };
  return { label: "対象外", className: SLATE };
}

function inspectionBadge(s: InspectionStatus | undefined): { label: string; className: string } {
  if (!s) return { label: "対象外", className: SLATE };
  if (s.status === "answered") {
    return s.needsImprovement ? { label: "要改善", className: RED } : { label: "回答済", className: GREEN };
  }
  if (s.status === "unanswered") return { label: "未回答", className: NEUTRAL };
  return { label: "対象外", className: SLATE };
}

function confirmationBadge(s: ConfirmationStatus | undefined): { label: string; className: string; sub?: string } {
  if (!s) return { label: "未確認", className: AMBER };
  if (s.status === "confirmed") return { label: "確認済", className: GREEN, sub: s.confirmedOn };
  if (s.status === "needs_action") return { label: "要対応", className: RED };
  return { label: "未確認", className: AMBER };
}

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20";

export default async function HaccpAdminStoresPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const ctx = await getPortalContext();

  if (!ctx || !isHaccpAdminRole(ctx.roleCode ?? null)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">
          この画面を表示する権限がありません。管理者権限を持つアカウントで再ログインしてください。
        </p>
      </div>
    );
  }

  const rawDate = first(sp.date);
  const targetDate = rawDate && DATE_RE.test(rawDate) ? rawDate : todayInTokyo();

  const rawMonth = first(sp.month);
  const monthValue = rawMonth && MONTH_RE.test(rawMonth) ? rawMonth : todayInTokyo().slice(0, 7);
  const targetMonth = `${monthValue}-01`;

  const filters: HaccpAdminFilters = {
    companyId: first(sp.companyId),
    blockId: first(sp.blockId),
    areaId: first(sp.areaId),
    storeCode: first(sp.storeCode),
    storeName: first(sp.storeName),
  };

  const q = (first(sp.q) ?? "").trim();
  const supabase = await createClient();

  const storesAll = await getScopedStores(supabase, filters);
  const stores = q
    ? storesAll.filter(
        (s) =>
          s.name.includes(q) ||
          s.store_code.includes(q) ||
          (s.area_name ?? "").includes(q)
      )
    : storesAll;

  const period = getHalfMonthPeriod(targetDate);

  const [keypointMap, employeeMap, inspectionMap, confirmationMap] = await Promise.all([
    computeKeypointStatus(supabase, stores, targetDate),
    computeEmployeeStatus(supabase, stores, targetDate),
    computeInspectionStatus(supabase, stores, targetMonth),
    computeConfirmationStatus(supabase, stores, period.start, period.end),
  ]);

  const totalCount = stores.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const rawPageNum = Number(first(sp.page));
  const page = Number.isFinite(rawPageNum) && rawPageNum >= 1
    ? Math.min(Math.floor(rawPageNum), totalPages)
    : 1;
  const pageStores = stores.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const currentParams: Record<string, string | undefined> = {
    companyId: filters.companyId,
    blockId: filters.blockId,
    areaId: filters.areaId,
    storeCode: filters.storeCode,
    storeName: filters.storeName,
    q: q || undefined,
    date: targetDate,
    month: monthValue,
  };
  const detailParams = buildQuery({ date: targetDate, month: monthValue });

  return (
    <HaccpAdminChrome
      title="HACCP管理者ダッシュボード"
      subtitle={`対象日: ${targetDate} / 対象月: ${monthValue} / 責任者確認期間: ${period.start} 〜 ${period.end}`}
      activePath="/haccp/admin/stores"
    >
      <HaccpAdminTabs activePath="/haccp/admin/stores" query={buildQuery({ date: targetDate, month: monthValue, q }).replace(/^\?/, "")} />

      <h2 className="mt-6 text-lg font-bold text-teal-800">HACCP回答状況</h2>
      <form method="get" action="/haccp/admin/stores" className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[16rem] flex-1">
          <label htmlFor="q" className="mb-1 block text-xs font-medium text-slate-600">店舗検索</label>
          <input id="q" name="q" type="text" defaultValue={q} placeholder="店舗コード・店舗名・エリアで検索" className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="date" className="mb-1 block text-xs font-medium text-slate-600">対象日</label>
          <input id="date" name="date" type="date" defaultValue={targetDate} className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="month" className="mb-1 block text-xs font-medium text-slate-600">対象月</label>
          <input id="month" name="month" type="month" defaultValue={monthValue} className={INPUT_CLASS} />
        </div>
        <button type="submit" className="rounded-lg border border-teal-600 px-4 py-2 text-sm font-bold text-teal-700">
          再表示
        </button>
      </form>

        {totalCount === 0 ? (
          <EmptyState message="該当する店舗がありません。" />
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                該当店舗 {totalCount}件中 {(page - 1) * PAGE_SIZE + 1}〜
                {Math.min(page * PAGE_SIZE, totalCount)}件を表示
              </p>
              <p className="text-xs text-slate-400">{page} / {totalPages} ページ</p>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-teal-100 bg-white">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead>
                  <tr className="border-b border-teal-100 bg-teal-50 text-xs font-bold text-teal-800">
                    <th className="whitespace-nowrap px-4 py-3">店舗コード</th>
                    <th className="whitespace-nowrap px-4 py-3">店舗名</th>
                    <th className="whitespace-nowrap px-4 py-3">エリア</th>
                    <th className="whitespace-nowrap px-4 py-3">重要ポイント</th>
                    <th className="whitespace-nowrap px-4 py-3">従業員衛生</th>
                    <th className="whitespace-nowrap px-4 py-3">食品衛生自主点検</th>
                    <th className="whitespace-nowrap px-4 py-3">責任者確認</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageStores.map((store, idx) => {
                    const kp = keypointBadge(keypointMap.get(store.id));
                    const emp = employeeBadge(employeeMap.get(store.id));
                    const ins = inspectionBadge(inspectionMap.get(store.id));
                    const conf = confirmationBadge(confirmationMap.get(store.id));
                    return (
                      <tr key={store.id} className={`transition-colors hover:bg-teal-50/50 ${idx % 2 === 1 ? "bg-slate-50/60" : ""}`}>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{store.store_code}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <Link
                            href={`/haccp/admin/stores/${store.id}${detailParams}`}
                            className="font-medium text-teal-700 hover:text-teal-900 hover:underline"
                          >
                            {store.name}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{store.area_name ?? "-"}</td>
                        <td className="px-4 py-3">
                          <Badge label={kp.label} className={kp.className} />
                        </td>
                        <td className="px-4 py-3">
                          <Badge label={emp.label} className={emp.className} sub={emp.sub} />
                        </td>
                        <td className="px-4 py-3">
                          <Badge label={ins.label} className={ins.className} />
                        </td>
                        <td className="px-4 py-3">
                          <Badge label={conf.label} className={conf.className} sub={conf.sub} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              ※従業員衛生の「記録なし」は、勤怠システムと未連携のため店舗からの回答が0件であることのみを示します。従業員ごとの未回答を断定するものではありません。
            </p>

            {totalPages > 1 && (
              <nav className="mt-5 flex flex-wrap items-center justify-center gap-1.5" aria-label="ページ">
                <Link
                  href={`/haccp/admin/stores${buildQuery({ ...currentParams, page: String(Math.max(1, page - 1)) })}`}
                  aria-disabled={page === 1}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-all ${
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
                    href={`/haccp/admin/stores${buildQuery({ ...currentParams, page: String(p) })}`}
                    aria-current={p === page ? "page" : undefined}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-all ${
                      p === page
                        ? "border-teal-600 bg-teal-600 text-white"
                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </Link>
                ))}
                <Link
                  href={`/haccp/admin/stores${buildQuery({ ...currentParams, page: String(Math.min(totalPages, page + 1)) })}`}
                  aria-disabled={page === totalPages}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-all ${
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
    </HaccpAdminChrome>
  );
}
