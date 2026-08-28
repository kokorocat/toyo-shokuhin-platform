import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { SubmitButton } from "../SubmitButton";
import { registerStoreHoliday, cancelStoreHoliday } from "./actions";
import { Banner } from "@/components/Banner";
import { EmptyState } from "@/components/EmptyState";

export default async function StoreHolidayPage({
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

  const { data: holidays } = await supabase
    .from("store_holidays")
    .select("id, holiday_date, reason, status, created_at")
    .eq("store_id", ctx.store.id)
    .order("holiday_date", { ascending: false })
    .limit(30);

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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-white shadow-md">
        <h1 className="text-lg font-bold">店休日登録</h1>
        <p className="mt-0.5 text-sm text-blue-100">
          {ctx.store.name}（{ctx.store.storeCode}）
        </p>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/haccp" className="text-sm text-blue-600 hover:underline">
          ← HACCP管理TOPに戻る
        </Link>

        {error && (
          <div className="mt-4">
            <Banner variant="error">{error}</Banner>
          </div>
        )}

        {/* Registration form */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-blue-50 px-5 py-3">
            <h2 className="text-base font-bold text-blue-800">店休日を登録</h2>
          </div>
          <div className="px-5 py-5">
            <form action={registerStoreHoliday} className="space-y-4">
              <input type="hidden" name="company_id" value={ctx.company?.id ?? ""} />
              <input type="hidden" name="store_id" value={ctx.store.id} />
              <div>
                <label htmlFor="holiday_date" className="mb-1.5 block text-sm font-medium text-slate-700">
                  日付
                </label>
                <input
                  id="holiday_date"
                  name="holiday_date"
                  type="date"
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label htmlFor="reason" className="mb-1.5 block text-sm font-medium text-slate-700">
                  理由（任意）
                </label>
                <input
                  id="reason"
                  name="reason"
                  type="text"
                  placeholder="臨時休業、改装等"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <SubmitButton
                className="w-full rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
                pendingText="登録中..."
              >
                登録する
              </SubmitButton>
            </form>
            <p className="mt-3 text-xs text-slate-400">
              既に点検記録がある日付は店休日として登録できません。
            </p>
          </div>
        </div>

        {/* Registered holidays */}
        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-200" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              登録済みの店休日
            </h2>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          {activeHolidays.length === 0 ? (
            <EmptyState
              message="登録された店休日はありません。"
              icon={
                <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
              }
            />
          ) : (
            <ul className="space-y-2">
              {activeHolidays.map(([date, v]) => (
                <li
                  key={date}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">{date}</p>
                    {v.reason && <p className="mt-0.5 text-xs text-slate-500">{v.reason}</p>}
                  </div>
                  <form action={cancelStoreHoliday}>
                    <input type="hidden" name="company_id" value={ctx.company?.id ?? ""} />
                    <input type="hidden" name="store_id" value={ctx.store!.id} />
                    <input type="hidden" name="holiday_date" value={date} />
                    <SubmitButton
                      className="rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white"
                      pendingText="取消中..."
                    >
                      取消
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
