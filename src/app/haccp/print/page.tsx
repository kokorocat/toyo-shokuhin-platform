import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { PrintButton } from "./PrintButton";

export default async function HaccpPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const ctx = await getPortalContext();

  if (!ctx?.store) {
    return (
      <div className="p-8 text-sm text-slate-500">
        店舗スコープを持つアカウントでログインしてください。
      </div>
    );
  }

  const targetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10);
  const dayStart = `${targetDate}T00:00:00.000Z`;
  const dayEnd = `${targetDate}T23:59:59.999Z`;

  const supabase = await createClient();

  const { data: tempRecords } = await supabase
    .from("haccp_temperature_records")
    .select("value, is_out_of_range, recorded_at, note, haccp_check_points(name, unit)")
    .eq("store_id", ctx.store.id)
    .gte("recorded_at", dayStart)
    .lte("recorded_at", dayEnd)
    .order("recorded_at");

  const { data: hygieneRecords } = await supabase
    .from("haccp_hygiene_records")
    .select("is_ok, checked_at, note, haccp_hygiene_items(name)")
    .eq("store_id", ctx.store.id)
    .gte("checked_at", dayStart)
    .lte("checked_at", dayEnd)
    .order("checked_at");

  const { data: approval } = await supabase
    .from("haccp_daily_approvals")
    .select("approved_at, note, user_profiles(display_name)")
    .eq("store_id", ctx.store.id)
    .eq("approved_date", targetDate)
    .maybeSingle();

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-8 print:px-0 print:py-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/haccp" className="text-xs text-blue-700 underline">
          ← HACCP管理TOPに戻る
        </Link>
        <div className="flex items-center gap-3">
          <form className="flex items-center gap-2">
            <input
              type="date"
              name="date"
              defaultValue={targetDate}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
            >
              表示
            </button>
          </form>
          <PrintButton />
        </div>
      </div>

      <h1 className="mb-1 text-center text-lg font-bold text-slate-900">HACCP日常点検記録簿</h1>
      <p className="mb-6 text-center text-sm text-slate-600">
        {ctx.store.name}（{ctx.store.storeCode}） / {targetDate}
      </p>

      <h2 className="mb-2 text-sm font-semibold text-slate-800">温度点検記録</h2>
      <table className="mb-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-400 text-left">
            <th className="py-1 pr-2">時刻</th>
            <th className="py-1 pr-2">点検項目</th>
            <th className="py-1 pr-2">測定値</th>
            <th className="py-1 pr-2">判定</th>
            <th className="py-1">メモ</th>
          </tr>
        </thead>
        <tbody>
          {(!tempRecords || tempRecords.length === 0) && (
            <tr>
              <td colSpan={5} className="py-2 text-slate-400">
                記録なし
              </td>
            </tr>
          )}
          {tempRecords?.map((r, i) => (
            <tr key={i} className="border-b border-slate-200">
              <td className="py-1 pr-2">{new Date(r.recorded_at).toLocaleTimeString("ja-JP")}</td>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <td className="py-1 pr-2">{(r.haccp_check_points as any)?.name ?? "-"}</td>
              <td className="py-1 pr-2">
                {r.value}
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(r.haccp_check_points as any)?.unit ?? ""}
              </td>
              <td className="py-1 pr-2">{r.is_out_of_range ? "範囲外" : "正常"}</td>
              <td className="py-1">{r.note ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mb-2 text-sm font-semibold text-slate-800">衛生管理チェック記録</h2>
      <table className="mb-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-400 text-left">
            <th className="py-1 pr-2">時刻</th>
            <th className="py-1 pr-2">チェック項目</th>
            <th className="py-1 pr-2">判定</th>
            <th className="py-1">メモ</th>
          </tr>
        </thead>
        <tbody>
          {(!hygieneRecords || hygieneRecords.length === 0) && (
            <tr>
              <td colSpan={4} className="py-2 text-slate-400">
                記録なし
              </td>
            </tr>
          )}
          {hygieneRecords?.map((r, i) => (
            <tr key={i} className="border-b border-slate-200">
              <td className="py-1 pr-2">{new Date(r.checked_at).toLocaleTimeString("ja-JP")}</td>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <td className="py-1 pr-2">{(r.haccp_hygiene_items as any)?.name ?? "-"}</td>
              <td className="py-1 pr-2">{r.is_ok ? "OK" : "NG"}</td>
              <td className="py-1">{r.note ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-8 border-t border-slate-300 pt-4 text-sm">
        <p className="font-semibold text-slate-800">承認状況</p>
        {approval ? (
          <p className="mt-1 text-slate-600">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            承認者: {(approval.user_profiles as any)?.display_name ?? "-"} / 承認日時:{" "}
            {new Date(approval.approved_at).toLocaleString("ja-JP")}
            {approval.note ? ` / ${approval.note}` : ""}
          </p>
        ) : (
          <p className="mt-1 text-slate-400">この日はまだ承認されていません。</p>
        )}
      </div>
    </div>
  );
}
