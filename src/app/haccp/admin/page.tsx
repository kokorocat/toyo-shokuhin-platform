import type { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { EmptyState } from "@/components/EmptyState";
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

type SearchParams = {
  companyId?: string;
  blockId?: string;
  areaId?: string;
  storeCode?: string;
  storeName?: string;
  date?: string;
  month?: string;
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

  const [{ data: companies }, { data: blocks }, { data: areas }, stores] = await Promise.all([
    supabase.from("companies").select("id, name").eq("status", "active").order("name"),
    supabase.from("blocks").select("id, name, company_id").eq("status", "active").order("name"),
    supabase.from("areas").select("id, name, company_id, block_id").eq("status", "active").order("name"),
    getScopedStores(supabase, filters),
  ]);

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
  const filterQueryString = filterQuery.toString();

  const filteredBlocks = filters.companyId ? (blocks ?? []).filter((b) => b.company_id === filters.companyId) : (blocks ?? []);
  const filteredAreas = (areas ?? []).filter((a) => {
    if (filters.companyId && a.company_id !== filters.companyId) return false;
    if (filters.blockId && a.block_id !== filters.blockId) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Teal gradient header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-400 px-4 py-4 text-white shadow-md">
        <h1 className="text-lg font-bold">HACCP 回答状況ダッシュボード</h1>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <Link href="/" className="text-sm text-teal-600 hover:underline">
          ← ポータルTOPに戻る
        </Link>

        {/* Stat cards row */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold tabular-nums text-slate-900">{stores.length}</p>
            <p className="mt-1 text-xs font-medium text-teal-600">対象店舗数</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold tabular-nums text-slate-900">{keypointSummary.answered}</p>
            <p className="mt-1 text-xs font-medium text-green-600">重要ポイント回答済</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold tabular-nums text-slate-900">{employeeSummary.recorded}</p>
            <p className="mt-1 text-xs font-medium text-blue-600">従業員衛生 記録あり</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold tabular-nums text-slate-900">{inspectionSummary.answered}</p>
            <p className="mt-1 text-xs font-medium text-amber-600">自主点検 回答済</p>
          </div>
        </div>

        {/* Pill-shaped tab navigation */}
        <nav className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full bg-teal-600 px-4 py-2 text-sm font-bold text-white">
            ダッシュボード
          </span>
          <Link
            href={`/haccp/admin/stores?${filterQueryString}`}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            店舗別回答状況
          </Link>
        </nav>

        {/* Filter form */}
        <form method="get" className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-blue-50 px-5 py-3">
            <h2 className="text-base font-bold text-blue-800">絞り込み条件</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="companyId" className={LABEL_CLASS}>会社</label>
              <select id="companyId" name="companyId" defaultValue={filters.companyId ?? ""} className={INPUT_CLASS}>
                <option value="">すべて</option>
                {(companies ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="blockId" className={LABEL_CLASS}>ブロック</label>
              <select id="blockId" name="blockId" defaultValue={filters.blockId ?? ""} className={INPUT_CLASS}>
                <option value="">すべて</option>
                {filteredBlocks.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="areaId" className={LABEL_CLASS}>エリア</label>
              <select id="areaId" name="areaId" defaultValue={filters.areaId ?? ""} className={INPUT_CLASS}>
                <option value="">すべて</option>
                {filteredAreas.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="storeCode" className={LABEL_CLASS}>店舗コード</label>
              <input id="storeCode" name="storeCode" type="text" defaultValue={filters.storeCode ?? ""} placeholder="店舗コード" className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="storeName" className={LABEL_CLASS}>店舗名</label>
              <input id="storeName" name="storeName" type="text" defaultValue={filters.storeName ?? ""} placeholder="店舗名" className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="date" className={LABEL_CLASS}>対象日(重要ポイント・従業員衛生)</label>
              <input id="date" name="date" type="date" defaultValue={targetDate} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="month" className={LABEL_CLASS}>対象月(食品衛生自主点検)</label>
              <input id="month" name="month" type="month" defaultValue={monthInputValue} className={INPUT_CLASS} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 px-5 pb-5">
            <Link href="/haccp/admin" className="text-xs font-medium text-slate-500 hover:text-slate-700">
              条件をクリア
            </Link>
            <button
              type="submit"
              className="rounded-full bg-teal-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-teal-700"
            >
              絞り込む
            </button>
          </div>
        </form>

        {stores.length === 0 ? (
          <div className="mt-6">
            <EmptyState message="条件に一致する店舗がありません。絞り込み条件を変更してください。" />
          </div>
        ) : (
          <div className="mt-6 space-y-5">
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
          </div>
        )}
      </div>
    </div>
  );
}
