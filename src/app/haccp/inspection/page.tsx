import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { SubmitButton } from "../SubmitButton";
import { recordInspection } from "./actions";
import { INSPECTION_QUESTIONS } from "./constants";

const EVALUATION_LABELS: Record<string, string> = {
  good: "良好",
  needs_improvement: "要改善",
};

function formatMonth(targetMonth: string) {
  const [y, m] = targetMonth.slice(0, 7).split("-");
  return `${y}年${Number(m)}月`;
}

type InspectionSummary = {
  id: string;
  target_month: string;
  overall_evaluation: string;
  submitted_on: string;
  version: number;
};

export default async function HaccpInspectionPage({
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
  const todayStr = new Date().toISOString().slice(0, 10);
  const targetMonth = `${todayStr.slice(0, 7)}-01`;

  const [{ data: inspectionRows }, { data: storeRow }] = await Promise.all([
    supabase
      .from("haccp_inspections")
      .select("id, target_month, overall_evaluation, submitted_on, version")
      .eq("store_id", ctx.store.id)
      .order("target_month", { ascending: false })
      .order("version", { ascending: false })
      .limit(50),
    supabase.from("stores").select("manager_name").eq("id", ctx.store.id).maybeSingle(),
  ]);

  // 訂正は新版を追加する運用のため、対象月ごとに最新versionのみを「有効版」として扱う
  const latestByMonth = new Map<string, InspectionSummary>();
  for (const row of inspectionRows ?? []) {
    if (!latestByMonth.has(row.target_month)) latestByMonth.set(row.target_month, row);
  }

  const currentInspection = latestByMonth.get(targetMonth) ?? null;
  const history = [...latestByMonth.values()]
    .filter((r) => r.target_month !== targetMonth)
    .slice(0, 3);

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <div className="mb-4">
        <Link href="/haccp" className="text-xs text-blue-700 underline">
          ← HACCP管理TOPに戻る
        </Link>
      </div>
      <h1 className="mb-1 text-lg font-bold text-slate-900">食品衛生自主点検入力</h1>
      <p className="mb-4 text-xs text-slate-500">
        {ctx.store.name}（{ctx.store.storeCode}） / 対象月: {formatMonth(targetMonth)}
      </p>

      <p className="mb-4 text-xs text-slate-500">
        ※以下の17問は、原紙(旧GASシステムの自主点検用紙)が未確認のため、一般的な食品衛生自主点検表の構成に基づく暫定の設問です。正式な問題文は原紙確認後に差し替えます。
      </p>

      {success && (
        <p className="mb-4 rounded bg-green-50 p-3 text-sm text-green-700">提出しました。</p>
      )}
      {error && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {currentInspection && (
        <p className="mb-4 rounded bg-blue-50 p-3 text-sm text-blue-800">
          今月は提出済みです({currentInspection.submitted_on}提出 / v{currentInspection.version} /{" "}
          {EVALUATION_LABELS[currentInspection.overall_evaluation] ?? currentInspection.overall_evaluation}
          )。再度送信すると新しいバージョンとして記録されます。
        </p>
      )}

      <form action={recordInspection} className="space-y-6">
        <input type="hidden" name="company_id" value={ctx.company?.id ?? ""} />
        <input type="hidden" name="store_id" value={ctx.store.id} />

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">基本情報</h2>
          <div className="space-y-3">
            <div>
              <label
                htmlFor="store_manager_name"
                className="mb-1 block text-xs font-medium text-slate-700"
              >
                店長名(任意)
              </label>
              <input
                id="store_manager_name"
                name="store_manager_name"
                type="text"
                defaultValue={storeRow?.manager_name ?? ""}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="hygiene_officer_name"
                className="mb-1 block text-xs font-medium text-slate-700"
              >
                食品衛生責任者名(任意)
              </label>
              <input
                id="hygiene_officer_name"
                name="hygiene_officer_name"
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="implementer_name"
                className="mb-1 block text-xs font-medium text-slate-700"
              >
                実施者名(必須)
              </label>
              <input
                id="implementer_name"
                name="implementer_name"
                type="text"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">点検項目(17問)</h2>
          <div className="space-y-3">
            {INSPECTION_QUESTIONS.map((q, idx) => (
              <fieldset
                key={q.code}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <legend className="mb-2 text-sm font-medium text-slate-800">
                  {idx + 1}. {q.text}
                </legend>
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer rounded-md border border-slate-300 px-3 py-3 text-center text-sm text-slate-700 has-[:checked]:border-green-600 has-[:checked]:bg-green-50 has-[:checked]:font-semibold has-[:checked]:text-green-700">
                    <input
                      type="radio"
                      name={`answer_${q.code}`}
                      value="good"
                      required
                      className="sr-only"
                    />
                    良好
                  </label>
                  <label className="flex-1 cursor-pointer rounded-md border border-slate-300 px-3 py-3 text-center text-sm text-slate-700 has-[:checked]:border-amber-600 has-[:checked]:bg-amber-50 has-[:checked]:font-semibold has-[:checked]:text-amber-700">
                    <input
                      type="radio"
                      name={`answer_${q.code}`}
                      value="needs_improvement"
                      required
                      className="sr-only"
                    />
                    要改善
                  </label>
                </div>
              </fieldset>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-800">
            改善が必要な項目がある場合の詳細
          </h2>
          <p className="mb-2 text-xs text-slate-500">
            いずれかの項目で「要改善」を選択した場合は、該当項目と改善内容を具体的に入力してください(必須)。
          </p>
          <textarea
            name="improvement_reason"
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </section>

        <SubmitButton
          className="w-full rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
          pendingText="送信中..."
        >
          点検結果を登録する
        </SubmitButton>
      </form>

      <hr className="my-8 border-slate-200" />

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-800">過去の点検結果(直近3か月)</h2>
        {history.length === 0 && (
          <p className="text-sm text-slate-500">まだ過去の記録がありません。</p>
        )}
        <ul className="space-y-2">
          {history.map((h) => (
            <li
              key={h.id}
              className={`flex items-center justify-between rounded-lg border p-3 shadow-sm ${
                h.overall_evaluation === "needs_improvement"
                  ? "border-red-300 bg-red-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{formatMonth(h.target_month)}</p>
                <p className="text-xs text-slate-400">{h.submitted_on}提出</p>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-xs font-bold ${
                  h.overall_evaluation === "needs_improvement"
                    ? "bg-red-600 text-white"
                    : "bg-green-600 text-white"
                }`}
              >
                {EVALUATION_LABELS[h.overall_evaluation] ?? h.overall_evaluation}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
