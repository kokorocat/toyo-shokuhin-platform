import type { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isHaccpAdminRole } from "./guard";
import { todayInTokyo } from "@/lib/date";
import {
  getScopedStores,
  getHalfMonthPeriod,
  computeKeypointStatus,
  computeEmployeeStatus,
  computeInspectionStatus,
  computeConfirmationStatus,
  summarizeKeypoint,
  summarizeEmployee,
  summarizeInspection,
  summarizeConfirmation,
  type HaccpAdminFilters,
} from "@/lib/haccp/admin-dashboard";
import { HaccpAdminChrome, HaccpAdminTabs, HaccpKpiRow } from "./HaccpAdminChrome";
import { EmptyState } from "@/components/EmptyState";

type SearchParams = {
  companyId?: string;
  blockId?: string;
  areaId?: string;
  storeCode?: string;
  storeName?: string;
  date?: string;
  month?: string;
  q?: string;
  status?: string;
  limit?: string;
};

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20";
const LABEL_CLASS = "mb-1 block text-xs font-medium text-slate-600";

function StatCard({
  label,
  value,
  color = "text-slate-500",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className={`mt-1 text-xs font-medium ${color}`}>{label}</p>
    </div>
  );
}

function SummarySection({
  title,
  scopeLabel,
  csvHref,
  note,
  children,
}: {
  title: string;
  scopeLabel: string;
  csvHref?: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-blue-50 px-5 py-3">
        <div>
          <h2 className="text-base font-bold text-blue-800">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-400">{scopeLabel}</p>
        </div>
        {csvHref && (
          <a
            href={csvHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            CSV出力
          </a>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">{children}</div>
      {note && <p className="px-4 pb-4 text-xs text-slate-400">{note}</p>}
    </section>
  );
}

export default async function HaccpAdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const ctx = await getPortalContext();

  if (!isHaccpAdminRole(ctx?.roleCode ?? null)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">
          権限がありません。管理者アカウントで再度ログインしてください。
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  const today = todayInTokyo();
  const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? (params.date as string) : today;

  const monthInputDefault = today.slice(0, 7);
  const rawMonth = params.month ?? "";
  const monthInputValue = /^\d{4}-\d{2}$/.test(rawMonth)
    ? rawMonth
    : /^\d{4}-\d{2}-\d{2}$/.test(rawMonth)
      ? rawMonth.slice(0, 7)
      : monthInputDefault;
  const targetMonth = `${monthInputValue}-01`;

  const filters: HaccpAdminFilters = {
    companyId: params.companyId || undefined,
    blockId: params.blockId || undefined,
    areaId: params.areaId || undefined,
    storeCode: params.storeCode || undefined,
    storeName: params.storeName || undefined,
  };

  const [{ data: companies }, { data: blocks }, storesRaw, { count: employeeCount }, { data: authUser }] = await Promise.all([
    supabase.from("companies").select("id, name").eq("status", "active").order("name"),
    supabase.from("blocks").select("id, name, company_id").eq("status", "active").order("name"),
    getScopedStores(supabase, filters),
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.auth.getUser(),
  ]);

  const q = (params.q ?? "").trim();
  const statusFilter = params.status ?? "all";
  const limitRaw = Number(params.limit);
  const displayLimit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : 50;
  const stores = q
    ? storesRaw.filter(
        (s) =>
          s.name.includes(q) ||
          s.store_code.includes(q) ||
          (s.area_name ?? "").includes(q)
      )
    : storesRaw;
  const companyNameById = new Map((companies ?? []).map((c) => [c.id, c.name]));
  const blockNameById = new Map((blocks ?? []).map((b) => [b.id, b.name]));

  const { start: periodStart, end: periodEnd } = getHalfMonthPeriod(targetDate);

  const [keypointMap, employeeMap, inspectionMap, confirmationMap] = await Promise.all([
    computeKeypointStatus(supabase, stores, targetDate),
    computeEmployeeStatus(supabase, stores, targetDate),
    computeInspectionStatus(supabase, stores, targetMonth),
    computeConfirmationStatus(supabase, stores, periodStart, periodEnd),
  ]);

  const keypointSummary = summarizeKeypoint(keypointMap);
  const employeeSummary = summarizeEmployee(employeeMap);
  const inspectionSummary = summarizeInspection(inspectionMap);
  const confirmationSummary = summarizeConfirmation(confirmationMap);

  const filterQuery = new URLSearchParams();
  if (filters.companyId) filterQuery.set("companyId", filters.companyId);
  if (filters.blockId) filterQuery.set("blockId", filters.blockId);
  if (filters.areaId) filterQuery.set("areaId", filters.areaId);
  if (filters.storeCode) filterQuery.set("storeCode", filters.storeCode);
  if (filters.storeName) filterQuery.set("storeName", filters.storeName);
  filterQuery.set("date", targetDate);
  filterQuery.set("month", monthInputValue);
  if (q) filterQuery.set("q", q);
  const filterQueryString = filterQuery.toString();

  return (
    <HaccpAdminChrome
      title="HACCP管理者ダッシュボード"
      subtitle="店舗・従業員の登録／状態変更、HACCP回答状況の確認"
      activePath="/haccp/admin"
    >
      <HaccpKpiRow
        storeCount={storesRaw.length}
        employeeCount={employeeCount ?? "-"}
        needsCheck={keypointSummary.needsImprovement + employeeSummary.hasIssueStores + inspectionSummary.needsImprovement}
        loginLabel={authUser.user?.email ?? ctx?.displayName ?? "-"}
      />
      <HaccpAdminTabs activePath="/haccp/admin" query={filterQueryString} />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link
          href="/master/stores/new"
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white"
        >
          ＋ 新店舗追加
        </Link>
        {/* 要確認: 保存処理は /master/stores 側。ここは導線のみ。 */}
      </div>

      <h2 className="mt-6 text-lg font-bold text-teal-800">店舗管理</h2>
      <form method="get" className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[16rem] flex-1">
          <label htmlFor="q" className={LABEL_CLASS}>店舗検索</label>
          <input id="q" name="q" type="text" defaultValue={q} placeholder="店舗コード・店舗名・エリアで検索" className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="status" className={LABEL_CLASS}>ステータス</label>
          <select id="status" name="status" defaultValue={statusFilter} className={INPUT_CLASS}>
            <option value="all">すべて</option>
            <option value="active">稼働中</option>
          </select>
        </div>
        <div>
          <label htmlFor="limit" className={LABEL_CLASS}>表示件数</label>
          <select id="limit" name="limit" defaultValue={String(displayLimit)} className={INPUT_CLASS}>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
        <input type="hidden" name="date" value={targetDate} />
        <input type="hidden" name="month" value={monthInputValue} />
        <button type="submit" className="rounded-lg border border-teal-600 px-4 py-2 text-sm font-bold text-teal-700">
          再表示
        </button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-lg border border-teal-100 bg-white">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead>
            <tr className="bg-teal-50 text-xs font-bold text-teal-800">
              <th className="px-3 py-2">店舗コード</th>
              <th className="px-3 py-2">店舗名</th>
              <th className="px-3 py-2">会社</th>
              <th className="px-3 py-2">ブロック</th>
              <th className="px-3 py-2">エリア</th>
              <th className="px-3 py-2">状態</th>
              <th className="px-3 py-2">HACCP重要ポイント</th>
              <th className="px-3 py-2">従業員衛生</th>
              <th className="px-3 py-2">食品衛生自主点検</th>
              <th className="px-3 py-2">ステータス</th>
            </tr>
          </thead>
          <tbody>
            {stores.slice(0, displayLimit).map((store) => {
              const detailHref = `/haccp/admin/stores/${store.id}?date=${targetDate}&month=${monthInputValue}`;
              return (
                <tr key={store.id} className="border-t border-teal-50">
                  <td className="px-3 py-2">{store.store_code}</td>
                  <td className="px-3 py-2 font-medium">{store.name}</td>
                  <td className="px-3 py-2">{companyNameById.get(store.company_id) ?? "-"}</td>
                  <td className="px-3 py-2">{store.block_id ? (blockNameById.get(store.block_id) ?? "-") : "-"}</td>
                  <td className="px-3 py-2">{store.area_name ?? "-"}</td>
                  <td className="px-3 py-2">稼働中</td>
                  <td className="px-3 py-2">
                    <Link href={`${detailHref}#keypoint`} className="text-teal-700 underline">開く</Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`${detailHref}#employee`} className="text-teal-700 underline">開く</Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`${detailHref}#inspection`} className="text-teal-700 underline">開く</Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/master/stores/${store.id}`} className="mr-1 rounded-md bg-teal-700 px-2 py-1 text-xs font-bold text-white">編集</Link>
                    <span className="rounded-md border border-teal-500 px-2 py-1 text-xs font-bold text-teal-800">状態</span>
                    {/* 要確認: 状態変更の保存ロジックは未接続 */}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-5">
        {stores.length === 0 ? (
          <EmptyState message="検索条件に一致する店舗がありません。" />
        ) : (
          <>
            <SummarySection
              title="重要ポイント・温度・ラベル"
              scopeLabel={`対象日: ${targetDate}`}
              csvHref={`/haccp/admin/export?type=keypoint&${filterQueryString}`}
            >
              <StatCard label="回答済" value={keypointSummary.answered} color="text-green-600" />
              <StatCard label="未回答" value={keypointSummary.unanswered} />
              <StatCard label="店休日" value={keypointSummary.holiday} />
              <StatCard label="対象外" value={keypointSummary.outOfScope} />
              <StatCard label="要改善" value={keypointSummary.needsImprovement} color="text-red-600" />
            </SummarySection>

            <SummarySection
              title="従業員衛生"
              scopeLabel={`対象日: ${targetDate}`}
              csvHref={`/haccp/admin/export?type=employee&${filterQueryString}`}
              note="※ 従業員別の未回答判定には勤怠システムとの連携が必要なため未対応です。「記録なし」は当日の回答記録が0件であることを示します。"
            >
              <StatCard label="記録あり" value={employeeSummary.recorded} color="text-green-600" />
              <StatCard label="記録なし" value={employeeSummary.notRecorded} />
              <StatCard label="店休日" value={employeeSummary.holiday} />
              <StatCard label="対象外" value={employeeSummary.outOfScope} />
              <StatCard label="要対応店舗" value={employeeSummary.hasIssueStores} color="text-red-600" />
            </SummarySection>

            <SummarySection
              title="食品衛生自主点検"
              scopeLabel={`対象月: ${monthInputValue}`}
              csvHref={`/haccp/admin/export?type=inspection&${filterQueryString}`}
            >
              <StatCard label="回答済" value={inspectionSummary.answered} color="text-green-600" />
              <StatCard label="未回答" value={inspectionSummary.unanswered} />
              <StatCard label="対象外" value={inspectionSummary.outOfScope} />
              <StatCard label="要改善" value={inspectionSummary.needsImprovement} color="text-red-600" />
            </SummarySection>

            <SummarySection title="半月責任者確認" scopeLabel={`対象期間: ${periodStart} 〜 ${periodEnd}`}>
              <StatCard label="確認済" value={confirmationSummary.confirmed} color="text-green-600" />
              <StatCard label="要対応" value={confirmationSummary.needsAction} color="text-red-600" />
              <StatCard label="未確認" value={confirmationSummary.unconfirmed} color="text-amber-600" />
            </SummarySection>
          </>
        )}
      </div>
    </HaccpAdminChrome>
  );
}
