import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { SubmitButton } from "../SubmitButton";
import { registerStoreHoliday, cancelStoreHoliday } from "./actions";

export default async function StoreHolidayPage({
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

  const { data: holidays } = await supabase
    .from("store_holidays")
    .select("id, holiday_date, reason, status, created_at")
    .eq("store_id", ctx.store.id)
    .order("holiday_date", { ascending: false })
    .limit(30);

  // 日付ごとに最新のstatusを採用(履歴は残しつつ、現在有効かどうかを判定)
  const latestByDate = new Map<string, { status: string; reason: string | null; created_at: string }>();
  for (const h of holidays ?? []) {
    if (!latestByDate.has(h.holiday_date)) {
      latestByDate.set(h.holiday_date, { status: h.status, reason: h.reason, created_at: h.created_at });
    }
  }
  const activeHolidays = [...latestByDate.entries()]
    .filter(([, v]) => v.status === "active")
    .sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <div className="mb-4">
        <Link href="/haccp" className="text-xs text-blue-700 underline">
          ← HACCP管理TOPに戻る
        </Link>
      </div>
      <h1 className="mb-1 text-lg font-bold text-slate-900">店休日登録</h1>
      <p className="mb-4 text-xs text-slate-500">
        {ctx.store.name}（{ctx.store.storeCode}）
      </p>

      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">店休日を登録</h2>
        <form action={registerStoreHoliday} className="space-y-3">
          <input type="hidden" name="company_id" value={ctx.company?.id ?? ""} />
          <input type="hidden" name="store_id" value={ctx.store.id} />
          <div>
            <label htmlFor="holiday_date" className="mb-1 block text-xs font-medium text-slate-700">
              日付
            </label>
            <input
              id="holiday_date"
              name="holiday_date"
              type="date"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="reason" className="mb-1 block text-xs font-medium text-slate-700">
              理由(任意)
            </label>
            <input
              id="reason"
              name="reason"
              type="text"
              placeholder="臨時休業、改装等"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <SubmitButton
            className="w-full rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
            pendingText="登録中..."
          >
            登録する
          </SubmitButton>
        </form>
        <p className="mt-2 text-xs text-slate-400">
          既に点検記録がある日付は店休日として登録できません。
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-800">登録済みの店休日</h2>
        {activeHolidays.length === 0 && (
          <p className="text-sm text-slate-500">登録された店休日はありません。</p>
        )}
        <ul className="space-y-2">
          {activeHolidays.map(([date, v]) => (
            <li
              key={date}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{date}</p>
                {v.reason && <p className="text-xs text-slate-500">{v.reason}</p>}
              </div>
              <form action={cancelStoreHoliday}>
                <input type="hidden" name="company_id" value={ctx.company?.id ?? ""} />
                <input type="hidden" name="store_id" value={ctx.store!.id} />
                <input type="hidden" name="holiday_date" value={date} />
                <SubmitButton
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  pendingText="取消中..."
                >
                  取消
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
