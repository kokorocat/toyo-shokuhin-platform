import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { SubmitButton } from "../SubmitButton";
import { recordInspection } from "./actions";
import { INSPECTION_CATEGORIES } from "./constants";
import { Banner } from "@/components/Banner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { todayInTokyo } from "@/lib/date";

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
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">
          店舗スコープを持つアカウントでログインしてください。
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const todayStr = todayInTokyo();
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
      <PageHeader
        backHref="/haccp"
        backLabel="HACCP管理TOPに戻る"
        title="食品衛生自主点検入力"
        subtitle={`${ctx.store.name}（${ctx.store.storeCode}） / 対象月: ${formatMonth(targetMonth)}`}
      />

      {success && (
        <div className="mb-5">
          <Banner variant="success">提出しました。</Banner>
        </div>
      )}
      {error && (
        <div className="mb-5">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      {currentInspection && (
        <div className="mb-5">
          <Banner variant="info">
            今月は提出済みです（{currentInspection.submitted_on}提出 / v{currentInspection.version} /{" "}
            {EVALUATION_LABELS[currentInspection.overall_evaluation] ?? currentInspection.overall_evaluation}
            ）。再度送信すると新しいバージョンとして記録されます。
          </Banner>
        </div>
      )}

      <form action={recordInspection} className="space-y-6">
        <input type="hidden" name="company_id" value={ctx.company?.id ?? ""} />
        <input type="hidden" name="store_id" value={ctx.store.id} />

        {/* Basic info */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">基本情報</h2>
          </div>
          <div className="space-y-4 px-5 py-5">
            <div>
              <label
                htmlFor="store_manager_name"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                店長名（任意）
              </label>
              <input
                id="store_manager_name"
                name="store_manager_name"
                type="text"
                defaultValue={storeRow?.manager_name ?? ""}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label
                htmlFor="hygiene_officer_name"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                食品衛生責任者名（任意）
              </label>
              <input
                id="hygiene_officer_name"
                name="hygiene_officer_name"
                type="text"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label
                htmlFor="area_manager_name"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                エリア長名（任意）
              </label>
              <input
                id="area_manager_name"
                name="area_manager_name"
                type="text"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label
                htmlFor="area_hygiene_officer_name"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                エリア衛生担当者（任意）
              </label>
              <input
                id="area_hygiene_officer_name"
                name="area_hygiene_officer_name"
                type="text"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label
                htmlFor="implementer_name"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                実施者名
                <span className="ml-1 text-xs text-red-600">必須</span>
              </label>
              <input
                id="implementer_name"
                name="implementer_name"
                type="text"
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        {/* 8 categories / 18 items */}
        <section className="space-y-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            点検項目（8カテゴリ・18項目）
          </h2>
          {INSPECTION_CATEGORIES.map((category) => (
            <div key={category.no}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
                  {category.no}
                </span>
                {category.title}
              </h3>
              <div className="space-y-3">
                {category.items.map((q) => (
                  <fieldset
                    key={q.code}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                  >
                    <legend className="mb-3 text-sm font-medium text-slate-800">
                      {category.items.length > 1 && (
                        <span className="mr-1.5 text-xs font-semibold text-slate-400">
                          {q.code.replace("q", "").replace("_", "-")}
                        </span>
                      )}
                      {q.text}
                    </legend>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-3.5 text-center text-sm text-slate-700 transition-colors has-[:checked]:border-green-600 has-[:checked]:bg-green-50 has-[:checked]:font-semibold has-[:checked]:text-green-700">
                        <input
                          type="radio"
                          name={`answer_${q.code}`}
                          value="good"
                          required
                          className="sr-only"
                        />
                        良好
                      </label>
                      <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-3.5 text-center text-sm text-slate-700 transition-colors has-[:checked]:border-amber-600 has-[:checked]:bg-amber-50 has-[:checked]:font-semibold has-[:checked]:text-amber-700">
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
            </div>
          ))}
        </section>

        {/* Improvement details */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">
              改善が必要な項目がある場合の詳細
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              いずれかの項目で「要改善」を選択した場合は、該当項目と改善内容を具体的に入力してください（必須）。
            </p>
          </div>
          <div className="px-5 py-5">
            <textarea
              name="improvement_reason"
              rows={4}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Self evaluation & footer fields */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">自主評価</h2>
          </div>
          <div className="space-y-4 px-5 py-5">
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-700">
                今月の総合的な自己評価
                <span className="ml-1 text-xs text-red-600">必須</span>
              </legend>
              <div className="grid grid-cols-2 gap-2">
                <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-3.5 text-center text-sm text-slate-700 transition-colors has-[:checked]:border-green-600 has-[:checked]:bg-green-50 has-[:checked]:font-semibold has-[:checked]:text-green-700">
                  <input type="radio" name="self_evaluation" value="good" required className="sr-only" />
                  良好
                </label>
                <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-3.5 text-center text-sm text-slate-700 transition-colors has-[:checked]:border-amber-600 has-[:checked]:bg-amber-50 has-[:checked]:font-semibold has-[:checked]:text-amber-700">
                  <input
                    type="radio"
                    name="self_evaluation"
                    value="needs_improvement"
                    required
                    className="sr-only"
                  />
                  要改善
                </label>
              </div>
            </fieldset>
            <div>
              <label
                htmlFor="business_license_expiry_date"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                営業許可証の有効期限日（任意）
              </label>
              <input
                id="business_license_expiry_date"
                name="business_license_expiry_date"
                type="date"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label htmlFor="special_notes" className="mb-1.5 block text-sm font-medium text-slate-700">
                特記事項（任意）
              </label>
              <textarea
                id="special_notes"
                name="special_notes"
                rows={3}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        <SubmitButton
          className="w-full rounded-lg bg-blue-800 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 active:bg-blue-950"
          pendingText="送信中..."
        >
          点検結果を登録する
        </SubmitButton>
      </form>

      {/* Past results */}
      <div className="mt-10 border-t border-slate-200 pt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          過去の点検結果（直近3か月）
        </h2>
        {history.length === 0 ? (
          <EmptyState message="まだ過去の記録がありません。" />
        ) : (
          <ul className="space-y-2">
            {history.map((h) => (
              <li
                key={h.id}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 shadow-sm ${
                  h.overall_evaluation === "needs_improvement"
                    ? "border-red-200 bg-red-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{formatMonth(h.target_month)}</p>
                  <p className="text-xs text-slate-400">{h.submitted_on}提出</p>
                </div>
                <span
                  className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${
                    h.overall_evaluation === "needs_improvement"
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {EVALUATION_LABELS[h.overall_evaluation] ?? h.overall_evaluation}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
