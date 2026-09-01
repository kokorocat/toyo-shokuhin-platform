import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { SubmitButton } from "../SubmitButton";
import { recordEmployeeCheck } from "./actions";
import { Banner } from "@/components/Banner";
import { EmptyState } from "@/components/EmptyState";
import { todayInTokyo } from "@/lib/date";

const ITEMS: { code: string; label: string }[] = [
  { code: "handwash", label: "正しい手洗いができているか" },
  { code: "clean_uniform", label: "清潔な白衣・エプロンを着用しているか" },
  { code: "proper_cap", label: "正しい帽子を着用しているか" },
  { code: "nails", label: "爪は短く切ってあるか" },
  { code: "no_accessory", label: "不要なアクセサリーを着用していないか" },
  { code: "skin_injury", label: "手荒れ・傷がないか" },
  { code: "stomach_symptom", label: "下痢・嘔吐・吐き気等の症状がないか" },
  { code: "body_temp", label: "体温は37.5℃以下か" },
];

export default async function EmployeeCheckPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
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
  const today = todayInTokyo();

  const [{ data: assignmentRows }, { data: todayResponses }] = await Promise.all([
    supabase
      .from("employee_assignments")
      .select("employee_id, employees(id, employee_code, full_name, status)")
      .eq("store_id", ctx.store.id)
      .is("ended_on", null),
    supabase
      .from("haccp_employee_responses")
      .select(
        "id, employee_id, manual_name, is_unmatched, version, employees(full_name), haccp_employee_items(answer)"
      )
      .eq("store_id", ctx.store.id)
      .eq("target_date", today)
      .order("version", { ascending: false }),
  ]);

  const employeeOptions = (assignmentRows ?? [])
    .map((a) => a.employees)
    .filter((e): e is { id: string; employee_code: string; full_name: string; status: string } =>
      Boolean(e && e.status === "active")
    )
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "ja"));

  const latestByIdentity = new Map<
    string,
    { name: string; hasBad: boolean }
  >();
  for (const r of todayResponses ?? []) {
    const key = r.employee_id ?? `manual:${r.manual_name ?? ""}`;
    if (latestByIdentity.has(key)) continue;
    latestByIdentity.set(key, {
      name: r.employees?.full_name ?? r.manual_name ?? "(不明)",
      hasBad: (r.haccp_employee_items ?? []).some((i) => i.answer === "bad"),
    });
  }
  const recordedToday = [...latestByIdentity.values()];

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 px-4 py-3 text-white">
        <h1 className="text-lg font-bold">従業員の衛生管理点検表（毎日・従業員ごと）</h1>
        <p className="mt-0.5 text-sm text-blue-100">
          {ctx.store.name}（{ctx.store.storeCode}） / {today}
        </p>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/haccp" className="text-sm text-blue-600 hover:underline">
          ← HACCP管理TOPに戻る
        </Link>

        {success && (
          <div className="mt-4">
            <Banner variant="success">記録しました。</Banner>
          </div>
        )}
        {error && (
          <div className="mt-4">
            <Banner variant="error">{error}</Banner>
          </div>
        )}

        {/* Today's records */}
        <section className="mt-6 mb-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-px flex-1 bg-slate-200" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              本日の記録済み従業員
            </h2>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          {recordedToday.length === 0 ? (
            <EmptyState message="本日はまだ記録がありません。" />
          ) : (
            <ul className="space-y-2">
              {recordedToday.map((r, i) => (
                <li
                  key={i}
                  className={`flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 shadow-sm ${
                    i % 2 === 1 ? "bg-slate-50/60" : "bg-white"
                  }`}
                >
                  <p className="text-sm font-medium text-slate-800">{r.name}</p>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                      r.hasBad
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {r.hasBad ? "要対応" : "良好"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Entry form */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-emerald-50 px-5 py-3">
            <h2 className="text-base font-bold text-emerald-800">入力</h2>
          </div>
          <div className="px-5 py-5">
            <form action={recordEmployeeCheck} className="space-y-5">
              <input type="hidden" name="company_id" value={ctx.company?.id ?? ""} />
              <input type="hidden" name="store_id" value={ctx.store.id} />

              <div>
                <label htmlFor="target_date" className="mb-1.5 block text-sm font-medium text-slate-700">
                  対象日
                </label>
                <input
                  id="target_date"
                  name="target_date"
                  type="date"
                  required
                  defaultValue={today}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label htmlFor="employee_id" className="mb-1.5 block text-sm font-medium text-slate-700">
                  店舗の従業員リストから選択
                </label>
                <select
                  id="employee_id"
                  name="employee_id"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">選択してください</option>
                  {employeeOptions.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name}（{e.employee_code}）
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="employee_code_search" className="mb-1.5 block text-sm font-medium text-slate-700">
                    社員コードで検索（任意・2〜6桁対応）
                  </label>
                  <input
                    id="employee_code_search"
                    name="employee_code_search"
                    type="text"
                    placeholder="例）24 / 000024"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="company_display" className="mb-1.5 block text-sm font-medium text-slate-700">
                    会社名（任意・自動表示）
                  </label>
                  <input
                    id="company_display"
                    type="text"
                    readOnly
                    tabIndex={-1}
                    defaultValue={ctx.company?.name ?? ""}
                    placeholder="会社名は従業員選択時に自動表示"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="manual_name" className="mb-1.5 block text-sm font-medium text-slate-700">
                  氏名（任意・手入力しても保存可）
                </label>
                <input
                  id="manual_name"
                  name="manual_name"
                  type="text"
                  placeholder="手入力の場合は空欄でも可"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="flex items-center bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-800">
                  <span className="w-10">No</span>
                  <span className="flex-1">項目</span>
                  <span className="w-36 text-center">判定（必須）</span>
                </div>
                {ITEMS.map((item, idx) => (
                  <div key={item.code} className="flex items-center border-t border-slate-100 px-4 py-3">
                    <span className="w-10 text-sm font-bold text-slate-500">{String.fromCodePoint(0x2460 + idx)}</span>
                    <span className="flex-1 text-sm text-slate-800">{item.label}</span>
                    <div className="flex w-36 justify-center gap-2">
                      <label className="cursor-pointer rounded-full border-2 border-green-300 px-4 py-1.5 text-sm font-bold text-green-600 has-[:checked]:border-green-600 has-[:checked]:bg-green-50 has-[:checked]:text-green-700">
                        <input type="radio" name={`answer_${item.code}`} value="good" required className="sr-only" />
                        良
                      </label>
                      <label className="cursor-pointer rounded-full border-2 border-red-300 px-4 py-1.5 text-sm font-bold text-red-500 has-[:checked]:border-red-600 has-[:checked]:bg-red-50 has-[:checked]:text-red-700">
                        <input type="radio" name={`answer_${item.code}`} value="bad" required className="sr-only" />
                        否
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label htmlFor="note" className="mb-1.5 block text-sm font-medium text-slate-700">
                  備考（「否」の項目がある場合は必須）
                </label>
                <textarea
                  id="note"
                  name="note"
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label htmlFor="action_taken" className="mb-1.5 block text-sm font-medium text-slate-700">
                  対応内容（「否」の項目がある場合は必須）
                </label>
                <textarea
                  id="action_taken"
                  name="action_taken"
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <SubmitButton
                className="w-full rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
                pendingText="登録中..."
              >
                記録する
              </SubmitButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
