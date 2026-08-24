import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function HaccpReportPage() {
  const ctx = await getPortalContext();

  if (!ctx?.store) {
    return (
      <div className="p-8 text-sm text-slate-500">
        店舗スコープを持つアカウントでログインしてください。
      </div>
    );
  }

  const supabase = await createClient();
  const since30 = daysAgoIso(30);

  const [{ data: tempRecords }, { data: hygieneRecords }, { count: openActionsCount }] = await Promise.all([
    supabase
      .from("haccp_temperature_records")
      .select("id, recorded_at, is_out_of_range")
      .eq("store_id", ctx.store.id)
      .gte("recorded_at", since30),
    supabase
      .from("haccp_hygiene_records")
      .select("id, checked_at, is_ok")
      .eq("store_id", ctx.store.id)
      .gte("checked_at", since30),
    supabase
      .from("haccp_corrective_actions")
      .select("id", { count: "exact", head: true })
      .eq("store_id", ctx.store.id),
  ]);

  const totalTemp = tempRecords?.length ?? 0;
  const outOfRangeTemp = tempRecords?.filter((r) => r.is_out_of_range).length ?? 0;
  const outOfRangeRate = totalTemp > 0 ? Math.round((outOfRangeTemp / totalTemp) * 1000) / 10 : 0;

  const totalHygiene = hygieneRecords?.length ?? 0;
  const ngHygiene = hygieneRecords?.filter((r) => !r.is_ok).length ?? 0;
  const ngRate = totalHygiene > 0 ? Math.round((ngHygiene / totalHygiene) * 1000) / 10 : 0;

  // 直近14日間の日別件数(温度点検 + 衛生チェックの合計、範囲外/NG件数も併記)
  const dayBuckets: {
    date: string;
    total: number;
    flagged: number;
  }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const tempCount = (tempRecords ?? []).filter((r) => r.recorded_at.slice(0, 10) === dateStr);
    const hygieneCount = (hygieneRecords ?? []).filter((r) => r.checked_at.slice(0, 10) === dateStr);
    dayBuckets.push({
      date: dateStr,
      total: tempCount.length + hygieneCount.length,
      flagged: tempCount.filter((r) => r.is_out_of_range).length + hygieneCount.filter((r) => !r.is_ok).length,
    });
  }
  const maxTotal = Math.max(1, ...dayBuckets.map((d) => d.total));

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <div className="mb-4">
        <Link href="/haccp" className="text-xs text-blue-700 underline">
          ← HACCP管理TOPに戻る
        </Link>
      </div>
      <h1 className="mb-1 text-lg font-bold text-slate-900">分析レポート</h1>
      <p className="mb-6 text-xs text-slate-500">
        {ctx.store.name}（{ctx.store.storeCode}）/ 直近30日間
      </p>

      <section className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">温度点検 実施件数</p>
          <p className="text-2xl font-bold text-slate-900">{totalTemp}</p>
          <p className="mt-1 text-xs text-red-600">範囲外 {outOfRangeTemp}件({outOfRangeRate}%)</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">衛生チェック 実施件数</p>
          <p className="text-2xl font-bold text-slate-900">{totalHygiene}</p>
          <p className="mt-1 text-xs text-red-600">NG {ngHygiene}件({ngRate}%)</p>
        </div>
        <div className="col-span-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">是正処置 記録件数(累計)</p>
          <p className="text-2xl font-bold text-slate-900">{openActionsCount ?? 0}</p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">日別実施件数(直近14日)</h2>
        <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          {dayBuckets.map((d) => (
            <div key={d.date} className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-xs text-slate-500">{d.date.slice(5)}</span>
              <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
                <div
                  className={`h-full ${d.flagged > 0 ? "bg-red-400" : "bg-blue-400"}`}
                  style={{ width: `${(d.total / maxTotal) * 100}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right text-xs text-slate-600">
                {d.total}件{d.flagged > 0 ? `(異常${d.flagged})` : ""}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
