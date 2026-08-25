import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { SubmitButton } from "../SubmitButton";
import { recordEmployeeCheck } from "./actions";

// 従業員衛生チェック8項目
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
      <div className="p-8 text-sm text-slate-500">
        店舗スコープを持つアカウントでログインしてください。
      </div>
    );
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

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

  // 同一従業員(または同一氏名の未紐付け)の最新versionのみを表示する
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
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <div className="mb-4">
        <Link href="/haccp" className="text-xs text-blue-700 underline">
          ← HACCP管理TOPに戻る
        </Link>
      </div>
      <h1 className="mb-1 text-lg font-bold text-slate-900">従業員衛生チェック</h1>
      <p className="mb-6 text-xs text-slate-500">
        {ctx.store.name}（{ctx.store.storeCode}） / {today}
      </p>

      {success && (
        <p className="mb-4 rounded bg-green-50 p-3 text-sm text-green-700">記録しました。</p>
      )}
      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">本日の記録済み従業員</h2>
        {recordedToday.length === 0 ? (
          <p className="text-sm text-slate-500">本日はまだ記録がありません。</p>
        ) : (
          <ul className="space-y-2">
            {recordedToday.map((r, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
              >
                <p className="text-sm font-medium text-slate-800">{r.name}</p>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-bold text-white ${
                    r.hasBad ? "bg-red-600" : "bg-green-600"
                  }`}
                >
                  {r.hasBad ? "要対応" : "良好"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">衛生チェックを記録</h2>
        <form action={recordEmployeeCheck} className="space-y-4">
          <input type="hidden" name="company_id" value={ctx.company?.id ?? ""} />
          <input type="hidden" name="store_id" value={ctx.store.id} />

          <div>
            <label htmlFor="target_date" className="mb-1 block text-xs font-medium text-slate-700">
              対象日
            </label>
            <input
              id="target_date"
              name="target_date"
              type="date"
              required
              defaultValue={today}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="employee_id" className="mb-1 block text-xs font-medium text-slate-700">
              従業員を選択
            </label>
            <select
              id="employee_id"
              name="employee_id"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">選択してください</option>
              {employeeOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name}（{e.employee_code}）
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="manual_name" className="mb-1 block text-xs font-medium text-slate-700">
              コードが不明な場合は氏名を直接入力
            </label>
            <input
              id="manual_name"
              name="manual_name"
              type="text"
              placeholder="氏名を入力"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-3">
            {ITEMS.map((item) => (
              <div key={item.code} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <p className="mb-2 text-sm text-slate-700">{item.label}</p>
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer rounded-md border border-slate-300 px-3 py-3 text-center text-sm text-slate-700 has-[:checked]:border-green-600 has-[:checked]:bg-green-50 has-[:checked]:font-semibold has-[:checked]:text-green-700">
                    <input
                      type="radio"
                      name={`answer_${item.code}`}
                      value="good"
                      required
                      className="sr-only"
                    />
                    良好
                  </label>
                  <label className="flex-1 cursor-pointer rounded-md border border-slate-300 px-3 py-3 text-center text-sm text-slate-700 has-[:checked]:border-red-600 has-[:checked]:bg-red-50 has-[:checked]:font-semibold has-[:checked]:text-red-700">
                    <input
                      type="radio"
                      name={`answer_${item.code}`}
                      value="bad"
                      required
                      className="sr-only"
                    />
                    異常
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label htmlFor="note" className="mb-1 block text-xs font-medium text-slate-700">
              備考（「異常」の項目がある場合は必須）
            </label>
            <textarea
              id="note"
              name="note"
              rows={2}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="action_taken" className="mb-1 block text-xs font-medium text-slate-700">
              対応内容（「異常」の項目がある場合は必須）
            </label>
            <textarea
              id="action_taken"
              name="action_taken"
              rows={2}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <SubmitButton
            className="w-full rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
            pendingText="登録中..."
          >
            記録する
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}
