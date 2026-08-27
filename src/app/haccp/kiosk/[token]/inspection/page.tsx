import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { Banner } from "@/components/Banner";
import { SubmitButton } from "@/components/SubmitButton";
import { INSPECTION_CATEGORIES } from "@/app/haccp/inspection/constants";
import { kioskSubmitInspection } from "./actions";

export default async function KioskInspectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { token } = await params;
  const { error, success } = await searchParams;
  const supabase = await createClient();
  const { data, error: storeError } = await supabase.rpc("kiosk_get_store", { p_token: token });

  if (storeError) {
    console.error("[haccp/kiosk/inspection] kiosk_get_store failed", storeError);
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center">
        <p className="text-sm text-slate-500">
          一時的なエラーが発生しました。しばらくしてから再度お試しください。
        </p>
      </div>
    );
  }

  const store = data?.[0];
  if (!store) notFound();

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <PageHeader
        backHref={`/haccp/kiosk/${token}`}
        backLabel="メニューに戻る"
        title="食品衛生自主点検入力"
        subtitle={store.store_name}
      />

      {success && (
        <div className="mb-5">
          <Banner variant="success">提出しました。ご協力ありがとうございました。</Banner>
        </div>
      )}
      {error && (
        <div className="mb-5">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <form action={kioskSubmitInspection} className="space-y-6">
        <input type="hidden" name="token" value={token} />

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">基本情報</h2>
          </div>
          <div className="space-y-4 px-5 py-5">
            <div>
              <label htmlFor="store_manager_name" className="mb-1.5 block text-sm font-medium text-slate-700">
                店長名（任意）
              </label>
              <input
                id="store_manager_name"
                name="store_manager_name"
                type="text"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label htmlFor="hygiene_officer_name" className="mb-1.5 block text-sm font-medium text-slate-700">
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
              <label htmlFor="area_manager_name" className="mb-1.5 block text-sm font-medium text-slate-700">
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
              <label htmlFor="area_hygiene_officer_name" className="mb-1.5 block text-sm font-medium text-slate-700">
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
              <label htmlFor="implementer_name" className="mb-1.5 block text-sm font-medium text-slate-700">
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
                  <fieldset key={q.code} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
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
                        <input type="radio" name={`answer_${q.code}`} value="good" required className="sr-only" />
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

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">改善が必要な項目がある場合の詳細</h2>
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
                  <input type="radio" name="self_evaluation" value="needs_improvement" required className="sr-only" />
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
    </div>
  );
}
