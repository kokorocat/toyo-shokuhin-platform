import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import {
  recordTemperatureCheck,
  recordHygieneCheck,
  recordCorrectiveAction,
  approveToday,
} from "./actions";
import { SubmitButton } from "./SubmitButton";

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
  const storeId = ctx.store.id;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayDateStr = new Date().toISOString().slice(0, 10);

  // 12個の独立したクエリを並列実行(以前は直列実行でページ読み込みが遅くなっていた)
  const [
    { data: checkPoints },
    { data: todayRecords },
    { data: hygieneItems },
    { data: todayHygieneRecords },
    { data: hygieneHistory },
    { data: history },
    { data: correctiveActions },
    { data: flaggedTemperatureRecords },
    { data: flaggedHygieneRecords },
    { data: correctiveHistory },
    { data: todayApproval },
    { data: approvalHistory },
  ] = await Promise.all([
    supabase
      .from("haccp_check_points")
      .select("id, name, category, unit, min_value, max_value")
      .eq("store_id", storeId)
      .eq("status", "active")
      .order("display_order"),
    supabase
      .from("haccp_temperature_records")
      .select("check_point_id, value, is_out_of_range, recorded_at")
      .eq("store_id", storeId)
      .gte("recorded_at", todayStart.toISOString())
      .order("recorded_at", { ascending: false }),
    supabase
      .from("haccp_hygiene_items")
      .select("id, name")
      .eq("store_id", storeId)
      .eq("status", "active")
      .order("display_order"),
    supabase
      .from("haccp_hygiene_records")
      .select("item_id, is_ok, checked_at")
      .eq("store_id", storeId)
      .gte("checked_at", todayStart.toISOString())
      .order("checked_at", { ascending: false }),
    supabase
      .from("haccp_hygiene_records")
      .select("id, is_ok, checked_at, note, haccp_hygiene_items(name)")
      .eq("store_id", storeId)
      .order("checked_at", { ascending: false })
      .limit(20),
    supabase
      .from("haccp_temperature_records")
      .select("id, value, is_out_of_range, recorded_at, note, haccp_check_points(name)")
      .eq("store_id", storeId)
      .order("recorded_at", { ascending: false })
      .limit(20),
    supabase
      .from("haccp_corrective_actions")
      .select("temperature_record_id, hygiene_record_id")
      .eq("store_id", storeId),
    supabase
      .from("haccp_temperature_records")
      .select("id, value, recorded_at, haccp_check_points(name, unit)")
      .eq("store_id", storeId)
      .eq("is_out_of_range", true)
      .order("recorded_at", { ascending: false })
      .limit(30),
    supabase
      .from("haccp_hygiene_records")
      .select("id, checked_at, haccp_hygiene_items(name)")
      .eq("store_id", storeId)
      .eq("is_ok", false)
      .order("checked_at", { ascending: false })
      .limit(30),
    supabase
      .from("haccp_corrective_actions")
      .select(
        "id, cause, action_taken, created_at, temperature_record_id, hygiene_record_id, haccp_temperature_records(haccp_check_points(name)), haccp_hygiene_records(haccp_hygiene_items(name))"
      )
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("haccp_daily_approvals")
      .select("id, approved_at, note")
      .eq("store_id", storeId)
      .eq("approved_date", todayDateStr)
      .maybeSingle(),
    supabase
      .from("haccp_daily_approvals")
      .select("id, approved_date, approved_at, note")
      .eq("store_id", storeId)
      .order("approved_date", { ascending: false })
      .limit(10),
  ]);

  const latestByCheckPoint = new Map<string, { value: number; is_out_of_range: boolean }>();
  for (const r of todayRecords ?? []) {
    if (!latestByCheckPoint.has(r.check_point_id)) {
      latestByCheckPoint.set(r.check_point_id, { value: r.value, is_out_of_range: r.is_out_of_range });
    }
  }

  const latestByHygieneItem = new Map<string, { is_ok: boolean }>();
  for (const r of todayHygieneRecords ?? []) {
    if (!latestByHygieneItem.has(r.item_id)) {
      latestByHygieneItem.set(r.item_id, { is_ok: r.is_ok });
    }
  }

  // 是正・対応管理: 範囲外/NGの記録のうち、まだ是正処置が記録されていないものを抽出
  const resolvedTemperatureIds = new Set(
    (correctiveActions ?? []).map((a) => a.temperature_record_id).filter(Boolean)
  );
  const resolvedHygieneIds = new Set(
    (correctiveActions ?? []).map((a) => a.hygiene_record_id).filter(Boolean)
  );

  const unresolvedTemperature = (flaggedTemperatureRecords ?? []).filter(
    (r) => !resolvedTemperatureIds.has(r.id)
  );
  const unresolvedHygiene = (flaggedHygieneRecords ?? []).filter(
    (r) => !resolvedHygieneIds.has(r.id)
  );

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <div className="mb-4">
        <Link href="/" className="text-xs text-blue-700 underline">
          ← 店舗ポータルTOPに戻る
        </Link>
      </div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">HACCP管理</h1>
        <div className="flex gap-3 text-xs">
          <Link href="/haccp/report" className="text-blue-700 underline">
            分析レポート
          </Link>
          <Link href="/haccp/print" className="text-blue-700 underline">
            帳票出力(印刷)
          </Link>
        </div>
      </div>
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
          <SubmitButton
            className="w-full rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
            pendingText="記録中..."
          >
            記録する
          </SubmitButton>
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
            <SubmitButton
              name="is_ok"
              value="true"
              className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              pendingText="記録中..."
            >
              OK
            </SubmitButton>
            <SubmitButton
              name="is_ok"
              value="false"
              className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              pendingText="記録中..."
            >
              NG
            </SubmitButton>
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

      <hr className="my-8 border-slate-200" />

      <h2 className="mb-1 text-base font-bold text-slate-900">是正・対応管理</h2>
      <p className="mb-4 text-xs text-slate-500">範囲外・NGとなった記録への原因分析・是正処置</p>

      <section className="mb-6">
        <h3 className="mb-2 text-sm font-semibold text-slate-800">
          対応が必要な記録({unresolvedTemperature.length + unresolvedHygiene.length}件)
        </h3>
        {unresolvedTemperature.length === 0 && unresolvedHygiene.length === 0 && (
          <p className="text-sm text-slate-500">現在、未対応の範囲外・NG記録はありません。</p>
        )}
        <ul className="space-y-3">
          {unresolvedTemperature.map((r) => (
            <li key={`t-${r.id}`} className="rounded-lg border border-red-300 bg-red-50 p-3 shadow-sm">
              <p className="mb-2 text-sm font-medium text-slate-800">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                温度点検: {(r.haccp_check_points as any)?.name ?? "-"}({r.value}
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(r.haccp_check_points as any)?.unit ?? "℃"}) - {new Date(r.recorded_at).toLocaleString("ja-JP")}
              </p>
              <form action={recordCorrectiveAction} className="space-y-2">
                <input type="hidden" name="store_id" value={ctx.store!.id} />
                <input type="hidden" name="temperature_record_id" value={r.id} />
                <input
                  name="cause"
                  placeholder="原因(例: ドアの開閉頻度が高かった)"
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  name="action_taken"
                  placeholder="対応内容(例: 設定温度を確認し再測定、正常値を確認)"
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <SubmitButton
                  className="rounded-md bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
                  pendingText="記録中..."
                >
                  是正処置を記録
                </SubmitButton>
              </form>
            </li>
          ))}
          {unresolvedHygiene.map((r) => (
            <li key={`h-${r.id}`} className="rounded-lg border border-red-300 bg-red-50 p-3 shadow-sm">
              <p className="mb-2 text-sm font-medium text-slate-800">
                衛生チェック: {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(r.haccp_hygiene_items as any)?.name ?? "-"} - {new Date(r.checked_at).toLocaleString("ja-JP")}
              </p>
              <form action={recordCorrectiveAction} className="space-y-2">
                <input type="hidden" name="store_id" value={ctx.store!.id} />
                <input type="hidden" name="hygiene_record_id" value={r.id} />
                <input
                  name="cause"
                  placeholder="原因"
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  name="action_taken"
                  placeholder="対応内容"
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <SubmitButton
                  className="rounded-md bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
                  pendingText="記録中..."
                >
                  是正処置を記録
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="mb-2 text-sm font-semibold text-slate-800">是正処置の記録(直近10件)</h3>
        {(!correctiveHistory || correctiveHistory.length === 0) && (
          <p className="text-sm text-slate-500">まだ記録がありません。</p>
        )}
        <ul className="space-y-2">
          {correctiveHistory?.map((c) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cc = c as any;
            const sourceName =
              cc.haccp_temperature_records?.haccp_check_points?.name ??
              cc.haccp_hygiene_records?.haccp_hygiene_items?.name ??
              "-";
            return (
              <li key={c.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-sm font-medium text-slate-800">{sourceName}</p>
                <p className="mt-1 text-xs text-slate-600">原因: {c.cause}</p>
                <p className="text-xs text-slate-600">対応: {c.action_taken}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(c.created_at).toLocaleString("ja-JP")}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <hr className="my-8 border-slate-200" />

      <h2 className="mb-1 text-base font-bold text-slate-900">承認・レビュー</h2>
      <p className="mb-4 text-xs text-slate-500">店舗責任者による当日分の記録確認・承認</p>

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {todayApproval ? (
          <p className="text-sm text-green-700">
            本日分は承認済みです({new Date(todayApproval.approved_at).toLocaleString("ja-JP")})
            {todayApproval.note ? ` / ${todayApproval.note}` : ""}
          </p>
        ) : (
          <form action={approveToday} className="space-y-3">
            <input type="hidden" name="store_id" value={ctx.store.id} />
            <p className="text-sm text-slate-600">
              本日の点検・衛生チェック記録を確認し、問題なければ承認してください。
            </p>
            <input
              name="note"
              placeholder="コメント(任意)"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <SubmitButton
              className="w-full rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
              pendingText="承認中..."
            >
              本日分を承認する
            </SubmitButton>
          </form>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-800">承認履歴(直近10件)</h3>
        {(!approvalHistory || approvalHistory.length === 0) && (
          <p className="text-sm text-slate-500">まだ承認記録がありません。</p>
        )}
        <ul className="space-y-2">
          {approvalHistory?.map((a) => (
            <li key={a.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-sm font-medium text-slate-800">{a.approved_date}</p>
              <p className="mt-1 text-xs text-slate-400">
                {new Date(a.approved_at).toLocaleString("ja-JP")}
                {a.note ? ` / ${a.note}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
