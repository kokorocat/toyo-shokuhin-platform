import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { recordTemperatureCheck, recordHygieneCheck } from "./actions";

const CATEGORY_LABELS: Record<string, string> = {
  refrigerator: "冷蔵",
  freezer: "冷凍",
  cooking: "調理後",
  other: "その他",
};

function rangeLabel(min: number | null, max: number | null, unit: string) {
  if (min !== null && max !== null) return `${min}〜${max}${unit}`;
  if (min !== null) return `${min}${unit}以上`;
  if (max !== null) return `${max}${unit}以下`;
  return "基準値未設定";
}

export default async function HaccpPage({
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

  const { data: checkPoints } = await supabase
    .from("haccp_check_points")
    .select("id, name, category, unit, min_value, max_value")
    .eq("store_id", ctx.store.id)
    .eq("status", "active")
    .order("display_order");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: todayRecords } = await supabase
    .from("haccp_temperature_records")
    .select("check_point_id, value, is_out_of_range, recorded_at")
    .eq("store_id", ctx.store.id)
    .gte("recorded_at", todayStart.toISOString())
    .order("recorded_at", { ascending: false });

  const latestByCheckPoint = new Map<string, { value: number; is_out_of_range: boolean }>();
  for (const r of todayRecords ?? []) {
    if (!latestByCheckPoint.has(r.check_point_id)) {
      latestByCheckPoint.set(r.check_point_id, { value: r.value, is_out_of_range: r.is_out_of_range });
    }
  }

  const { data: hygieneItems } = await supabase
    .from("haccp_hygiene_items")
    .select("id, name")
    .eq("store_id", ctx.store.id)
    .eq("status", "active")
    .order("display_order");

  const { data: todayHygieneRecords } = await supabase
    .from("haccp_hygiene_records")
    .select("item_id, is_ok, checked_at")
    .eq("store_id", ctx.store.id)
    .gte("checked_at", todayStart.toISOString())
    .order("checked_at", { ascending: false });

  const latestByHygieneItem = new Map<string, { is_ok: boolean }>();
  for (const r of todayHygieneRecords ?? []) {
    if (!latestByHygieneItem.has(r.item_id)) {
      latestByHygieneItem.set(r.item_id, { is_ok: r.is_ok });
    }
  }

  const { data: hygieneHistory } = await supabase
    .from("haccp_hygiene_records")
    .select("id, is_ok, checked_at, note, haccp_hygiene_items(name)")
    .eq("store_id", ctx.store.id)
    .order("checked_at", { ascending: false })
    .limit(20);

  const { data: history } = await supabase
    .from("haccp_temperature_records")
    .select("id, value, is_out_of_range, recorded_at, note, haccp_check_points(name)")
    .eq("store_id", ctx.store.id)
    .order("recorded_at", { ascending: false })
    .limit(20);

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <div className="mb-4">
        <Link href="/" className="text-xs text-blue-700 underline">
          ← 店舗ポータルTOPに戻る
        </Link>
      </div>
      <h1 className="mb-1 text-lg font-bold text-slate-900">HACCP管理 - 温度点検</h1>
      <p className="mb-4 text-xs text-slate-500">
        {ctx.store.name}（{ctx.store.storeCode}）
      </p>

      {error && (
        <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">本日の点検状況</h2>
        <ul className="space-y-2">
          {checkPoints?.map((cp) => {
            const today = latestByCheckPoint.get(cp.id);
            return (
              <li
                key={cp.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {cp.name}
                    <span className="ml-2 text-xs text-slate-400">
                      ({CATEGORY_LABELS[cp.category] ?? cp.category} / 基準値: {rangeLabel(cp.min_value, cp.max_value, cp.unit)})
                    </span>
                  </p>
                </div>
                {!today ? (
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">未実施</span>
                ) : today.is_out_of_range ? (
                  <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                    範囲外 {today.value}{cp.unit}
                  </span>
                ) : (
                  <span className="rounded bg-green-600 px-2 py-0.5 text-xs font-bold text-white">
                    正常 {today.value}{cp.unit}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">点検記録フォーム</h2>
        <form action={recordTemperatureCheck} className="space-y-3">
          <input type="hidden" name="store_id" value={ctx.store.id} />
          <div>
            <label htmlFor="check_point_id" className="mb-1 block text-xs font-medium text-slate-700">
              点検項目
            </label>
            <select
              id="check_point_id"
              name="check_point_id"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {checkPoints?.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.name}（基準値: {rangeLabel(cp.min_value, cp.max_value, cp.unit)}）
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="value" className="mb-1 block text-xs font-medium text-slate-700">
              測定値(℃)
            </label>
            <input
              id="value"
              name="value"
              type="number"
              step="0.1"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="note" className="mb-1 block text-xs font-medium text-slate-700">
              メモ(任意)
            </label>
            <input
              id="note"
              name="note"
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
          >
            記録する
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-800">点検履歴(直近20件)</h2>
        {(!history || history.length === 0) && (
          <p className="text-sm text-slate-500">まだ記録がありません。</p>
        )}
        <ul className="space-y-2">
          {history?.map((h) => (
            <li
              key={h.id}
              className={`rounded-lg border p-3 shadow-sm ${
                h.is_out_of_range ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(h.haccp_check_points as any)?.name ?? "-"}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-bold ${
                    h.is_out_of_range ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {h.value}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {new Date(h.recorded_at).toLocaleString("ja-JP")}
                {h.note ? ` / ${h.note}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <hr className="my-8 border-slate-200" />

      <h2 className="mb-1 text-base font-bold text-slate-900">衛生管理チェックリスト</h2>
      <p className="mb-4 text-xs text-slate-500">温度以外の日常衛生点検項目</p>

      <section className="mb-6">
        <h3 className="mb-2 text-sm font-semibold text-slate-800">本日のチェック状況</h3>
        <ul className="space-y-2">
          {hygieneItems?.map((hi) => {
            const today = latestByHygieneItem.get(hi.id);
            return (
              <li
                key={hi.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
              >
                <p className="text-sm font-medium text-slate-800">{hi.name}</p>
                {!today ? (
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">未実施</span>
                ) : today.is_ok ? (
                  <span className="rounded bg-green-600 px-2 py-0.5 text-xs font-bold text-white">OK</span>
                ) : (
                  <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">NG</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">チェック記録フォーム</h3>
        <form action={recordHygieneCheck} className="space-y-3">
          <input type="hidden" name="store_id" value={ctx.store.id} />
          <div>
            <label htmlFor="item_id" className="mb-1 block text-xs font-medium text-slate-700">
              チェック項目
            </label>
            <select
              id="item_id"
              name="item_id"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {hygieneItems?.map((hi) => (
                <option key={hi.id} value={hi.id}>
                  {hi.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="hygiene-note" className="mb-1 block text-xs font-medium text-slate-700">
              メモ(任意)
            </label>
            <input
              id="hygiene-note"
              name="note"
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              name="is_ok"
              value="true"
              className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              OK
            </button>
            <button
              type="submit"
              name="is_ok"
              value="false"
              className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              NG
            </button>
          </div>
        </form>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">チェック履歴(直近20件)</h3>
        {(!hygieneHistory || hygieneHistory.length === 0) && (
          <p className="text-sm text-slate-500">まだ記録がありません。</p>
        )}
        <ul className="space-y-2">
          {hygieneHistory?.map((h) => (
            <li
              key={h.id}
              className={`rounded-lg border p-3 shadow-sm ${
                !h.is_ok ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(h.haccp_hygiene_items as any)?.name ?? "-"}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-bold ${
                    !h.is_ok ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {h.is_ok ? "OK" : "NG"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {new Date(h.checked_at).toLocaleString("ja-JP")}
                {h.note ? ` / ${h.note}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
