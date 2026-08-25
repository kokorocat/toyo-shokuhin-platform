import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { SubmitButton } from "./SubmitButton";
import { confirmHalfMonth } from "./actions";
import { Banner } from "@/components/Banner";
import { PageHeader } from "@/components/PageHeader";

const CAN_CONFIRM_ROLES = new Set(["store_manager", "company_admin", "area_admin", "super_admin"]);

function halfMonthPeriod(today: Date) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();
  if (day <= 15) {
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month, 15),
    };
  }
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    start: new Date(year, month, 16),
    end: new Date(year, month, lastDay),
  };
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function StatusDot({ recorded }: { recorded: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${recorded ? "bg-green-500" : "bg-slate-300"}`}
      aria-label={recorded ? "記録あり" : "未記録"}
    />
  );
}

export default async function HaccpTopPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
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
  const todayStr = toDateStr(new Date());
  const monthStartStr = `${todayStr.slice(0, 7)}-01`;
  const period = halfMonthPeriod(new Date());
  const periodStartStr = toDateStr(period.start);
  const periodEndStr = toDateStr(period.end);

  const [
    { data: todayHoliday },
    { data: keypointToday },
    { count: employeeTodayCount },
    { data: inspectionThisMonth },
    { data: existingConfirmation },
  ] = await Promise.all([
    supabase
      .from("store_holidays")
      .select("id, status")
      .eq("store_id", ctx.store.id)
      .eq("holiday_date", todayStr)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("haccp_keypoint_responses")
      .select("id, version")
      .eq("store_id", ctx.store.id)
      .eq("target_date", todayStr)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("haccp_employee_responses")
      .select("id", { count: "exact", head: true })
      .eq("store_id", ctx.store.id)
      .eq("target_date", todayStr),
    supabase
      .from("haccp_inspections")
      .select("id, overall_evaluation, submitted_on")
      .eq("store_id", ctx.store.id)
      .eq("target_month", monthStartStr)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("manager_confirmations")
      .select("id, confirmed_on, comment")
      .eq("store_id", ctx.store.id)
      .eq("period_type", "half_month")
      .eq("period_start", periodStartStr)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const isHoliday = todayHoliday?.status === "active";
  const canConfirm = CAN_CONFIRM_ROLES.has(ctx.roleCode ?? "");

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <PageHeader
        backHref="/"
        backLabel="店舗ポータルTOPに戻る"
        title="HACCP管理"
        subtitle={`${ctx.store.name}（${ctx.store.storeCode}） / ${todayStr}`}
      />

      {error && (
        <div className="mb-5">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      {isHoliday && (
        <div className="mb-5">
          <Banner variant="info">本日は店休日として登録されています。</Banner>
        </div>
      )}

      {/* Daily entry cards */}
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        日次入力
      </h2>
      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/haccp/keypoint"
          className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
        >
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
            </div>
            <StatusDot recorded={!!keypointToday} />
          </div>
          <p className="text-sm font-semibold text-slate-800">重要ポイント・温度・ラベル</p>
          <p className="mt-1 text-xs text-slate-400">
            {keypointToday ? "本日：記録あり" : "本日：未記録"}
          </p>
        </Link>
        <Link
          href="/haccp/employee"
          className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
        >
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            </div>
            <StatusDot recorded={(employeeTodayCount ?? 0) > 0} />
          </div>
          <p className="text-sm font-semibold text-slate-800">従業員衛生</p>
          <p className="mt-1 text-xs text-slate-400">本日 {employeeTodayCount ?? 0} 名記録済み</p>
        </Link>
        <Link
          href="/haccp/inspection"
          className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
        >
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
              </svg>
            </div>
            <StatusDot recorded={!!inspectionThisMonth} />
          </div>
          <p className="text-sm font-semibold text-slate-800">食品衛生自主点検</p>
          <p className="mt-1 text-xs text-slate-400">
            {inspectionThisMonth
              ? `今月：提出済み(${inspectionThisMonth.overall_evaluation === "needs_improvement" ? "要改善" : "良好"})`
              : "今月：未提出"}
          </p>
        </Link>
      </section>

      {/* Utility links */}
      <section className="mb-8 grid grid-cols-2 gap-3">
        <Link
          href="/haccp/holiday"
          className="group flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
        >
          <svg className="h-4 w-4 text-slate-400 group-hover:text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <p className="text-sm font-semibold text-slate-800">店休日登録</p>
        </Link>
        <Link
          href="/haccp/history"
          className="group flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
        >
          <svg className="h-4 w-4 text-slate-400 group-hover:text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-sm font-semibold text-slate-800">過去回答一覧</p>
        </Link>
      </section>

      {/* Manager confirmation */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">責任者確認（半月）</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            対象期間: {periodStartStr} 〜 {periodEndStr}
          </p>
        </div>
        <div className="px-5 py-4">
          {existingConfirmation ? (
            <Banner variant="success">
              この期間は確認済みです（{existingConfirmation.confirmed_on}）
              {existingConfirmation.comment ? ` / ${existingConfirmation.comment}` : ""}
            </Banner>
          ) : canConfirm ? (
            <form action={confirmHalfMonth} className="space-y-4">
              <input type="hidden" name="company_id" value={ctx.company?.id ?? ""} />
              <input type="hidden" name="store_id" value={ctx.store.id} />
              <input type="hidden" name="period_start" value={periodStartStr} />
              <input type="hidden" name="period_end" value={periodEndStr} />
              <p className="text-sm text-slate-600">
                この期間の重要ポイント・温度・ラベルの記録を確認し、問題なければ確認登録してください。
              </p>
              <input
                name="comment"
                placeholder="コメント（任意）"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <SubmitButton
                className="w-full rounded-lg bg-blue-800 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 active:bg-blue-950"
                pendingText="確認中..."
              >
                この期間を確認する
              </SubmitButton>
            </form>
          ) : (
            <p className="text-sm text-slate-500">
              未確認です。責任者確認は店舗責任者以上の権限を持つアカウントで行ってください。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
