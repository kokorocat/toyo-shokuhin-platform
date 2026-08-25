import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { SubmitButton } from "./SubmitButton";
import { confirmHalfMonth } from "./actions";

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

export default async function HaccpTopPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const ctx = await getPortalContext();

  if (!ctx?.store) {
    return (
      <div className="p-8 text-sm text-slate-500">
        店舗スコープを持つアカウントでログインしてください。
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
      <div className="mb-4">
        <Link href="/" className="text-xs text-blue-700 underline">
          ← 店舗ポータルTOPに戻る
        </Link>
      </div>
      <h1 className="mb-1 text-lg font-bold text-slate-900">HACCP管理</h1>
      <p className="mb-6 text-xs text-slate-500">
        {ctx.store.name}（{ctx.store.storeCode}） / {todayStr}
      </p>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {isHoliday && (
        <p className="mb-4 rounded bg-slate-100 p-3 text-sm text-slate-600">
          本日は店休日として登録されています。
        </p>
      )}

      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/haccp/keypoint"
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300"
        >
          <p className="text-sm font-semibold text-slate-800">重要ポイント・温度・ラベル</p>
          <p className="mt-1 text-xs text-slate-400">
            {keypointToday ? "本日：記録あり" : "本日：未記録"}
          </p>
        </Link>
        <Link
          href="/haccp/employee"
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300"
        >
          <p className="text-sm font-semibold text-slate-800">従業員衛生</p>
          <p className="mt-1 text-xs text-slate-400">本日 {employeeTodayCount ?? 0} 名記録済み</p>
        </Link>
        <Link
          href="/haccp/inspection"
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300"
        >
          <p className="text-sm font-semibold text-slate-800">食品衛生自主点検</p>
          <p className="mt-1 text-xs text-slate-400">
            {inspectionThisMonth
              ? `今月：提出済み(${inspectionThisMonth.overall_evaluation === "needs_improvement" ? "要改善" : "良好"})`
              : "今月：未提出"}
          </p>
        </Link>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3">
        <Link
          href="/haccp/holiday"
          className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm hover:border-blue-300"
        >
          <p className="text-sm font-semibold text-slate-800">店休日登録</p>
        </Link>
        <Link
          href="/haccp/history"
          className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm hover:border-blue-300"
        >
          <p className="text-sm font-semibold text-slate-800">過去回答一覧</p>
        </Link>
      </section>

      <hr className="my-8 border-slate-200" />

      <h2 className="mb-1 text-base font-bold text-slate-900">責任者確認(半月)</h2>
      <p className="mb-4 text-xs text-slate-500">
        対象期間: {periodStartStr} 〜 {periodEndStr}
      </p>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {existingConfirmation ? (
          <p className="text-sm text-green-700">
            この期間は確認済みです({existingConfirmation.confirmed_on})
            {existingConfirmation.comment ? ` / ${existingConfirmation.comment}` : ""}
          </p>
        ) : canConfirm ? (
          <form action={confirmHalfMonth} className="space-y-3">
            <input type="hidden" name="company_id" value={ctx.company?.id ?? ""} />
            <input type="hidden" name="store_id" value={ctx.store.id} />
            <input type="hidden" name="period_start" value={periodStartStr} />
            <input type="hidden" name="period_end" value={periodEndStr} />
            <p className="text-sm text-slate-600">
              この期間の重要ポイント・温度・ラベルの記録を確認し、問題なければ確認登録してください。
            </p>
            <input
              name="comment"
              placeholder="コメント(任意)"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <SubmitButton
              className="w-full rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
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
      </section>
    </div>
  );
}
