import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";

// 訂正は新版を追加する運用のため、同一対象日/対象月の中で最新versionのみを「有効版」として表示する
function latestByKey<T extends { version: number }>(rows: T[], keyOf: (r: T) => string): T[] {
  const byKey = new Map<string, T>();
  for (const r of rows) {
    const k = keyOf(r);
    const existing = byKey.get(k);
    if (!existing || r.version > existing.version) byKey.set(k, r);
  }
  return [...byKey.values()];
}

export default async function HaccpHistoryPage() {
  const ctx = await getPortalContext();

  if (!ctx?.store) {
    return (
      <div className="p-8 text-sm text-slate-500">
        店舗スコープを持つアカウントでログインしてください。
      </div>
    );
  }

  const supabase = await createClient();

  const [
    { data: keypointRows },
    { data: employeeRows },
    { data: inspectionRows },
  ] = await Promise.all([
    supabase
      .from("haccp_keypoint_responses")
      .select("id, target_date, version, created_at")
      .eq("store_id", ctx.store.id)
      .order("target_date", { ascending: false })
      .order("version", { ascending: false })
      .limit(200),
    supabase
      .from("haccp_employee_responses")
      .select("id, target_date, version, created_at, manual_name, employee_id, employees(full_name)")
      .eq("store_id", ctx.store.id)
      .order("target_date", { ascending: false })
      .order("version", { ascending: false })
      .limit(200),
    supabase
      .from("haccp_inspections")
      .select("id, target_month, version, created_at, overall_evaluation, submitted_on")
      .eq("store_id", ctx.store.id)
      .order("target_month", { ascending: false })
      .order("version", { ascending: false })
      .limit(50),
  ]);

  const keypoints = latestByKey(keypointRows ?? [], (r) => r.target_date).slice(0, 30);
  const employeeResponses = latestByKey(
    employeeRows ?? [],
    (r) => `${r.target_date}::${r.employee_id ?? r.manual_name}`
  )
    .sort((a, b) => (a.target_date < b.target_date ? 1 : -1))
    .slice(0, 30);
  const inspections = latestByKey(inspectionRows ?? [], (r) => r.target_month).slice(0, 12);

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <div className="mb-4">
        <Link href="/haccp" className="text-xs text-blue-700 underline">
          ← HACCP管理TOPに戻る
        </Link>
      </div>
      <h1 className="mb-1 text-lg font-bold text-slate-900">過去回答一覧</h1>
      <p className="mb-6 text-xs text-slate-500">
        {ctx.store.name}（{ctx.store.storeCode}） / 訂正がある場合は最新版のみ表示しています
      </p>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">
          重要ポイント・温度・ラベル(直近{keypoints.length}件)
        </h2>
        {keypoints.length === 0 && <p className="text-sm text-slate-500">記録がありません。</p>}
        <ul className="space-y-1.5">
          {keypoints.map((k) => (
            <li
              key={k.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
            >
              <span className="text-slate-800">{k.target_date}</span>
              <span className="text-xs text-slate-400">
                v{k.version} / {new Date(k.created_at).toLocaleString("ja-JP")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">
          従業員衛生(直近{employeeResponses.length}件)
        </h2>
        {employeeResponses.length === 0 && <p className="text-sm text-slate-500">記録がありません。</p>}
        <ul className="space-y-1.5">
          {employeeResponses.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
            >
              <span className="text-slate-800">
                {e.target_date} /{" "}
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(e.employees as any)?.full_name ?? e.manual_name ?? "-"}
              </span>
              <span className="text-xs text-slate-400">v{e.version}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-800">
          食品衛生自主点検(直近{inspections.length}件)
        </h2>
        {inspections.length === 0 && <p className="text-sm text-slate-500">記録がありません。</p>}
        <ul className="space-y-1.5">
          {inspections.map((i) => (
            <li
              key={i.id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm shadow-sm ${
                i.overall_evaluation === "needs_improvement"
                  ? "border-red-300 bg-red-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <span className="text-slate-800">{i.target_month.slice(0, 7)}</span>
              <span className="text-xs text-slate-500">
                {i.overall_evaluation === "needs_improvement" ? "要改善" : "良好"} / 提出:{" "}
                {i.submitted_on}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
