import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Banner } from "@/components/Banner";
import { SubmitButton } from "@/components/SubmitButton";
import { kioskSubmitInspection } from "./actions";
import {
  InspectionHeaderFields,
  InspectionItemsTable,
  UnansweredMonthBanner,
  unansweredYmList,
} from "@/app/haccp/inspection/InspectionUi";
import { todayInTokyo } from "@/lib/date";

export default async function KioskInspectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; success?: string; ym?: string }>;
}) {
  const { token } = await params;
  const { error, success, ym } = await searchParams;
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

  const todayStr = todayInTokyo();
  const displayYm = ym && /^\d{4}-\d{2}$/.test(ym) ? ym : todayStr.slice(0, 7);
  const [displayYear, displayMonth] = displayYm.split("-");
  // 要確認: キオスクは未回答月の取得RPCが無いため、直近未選択月の見た目のみ。
  const missingMonths = unansweredYmList(new Set(), todayStr).slice(-6);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-slate-50">
      <header className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-white shadow-md">
        <div className="mx-auto max-w-2xl">
          <p className="text-lg font-bold">食品衛生自主点検入力</p>
          <p className="text-sm text-orange-100">{store.store_name}</p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link href={`/haccp/kiosk/${token}`} className="text-sm text-blue-600 hover:underline">
          ← メニューに戻る
        </Link>

        {success && (
          <div className="mt-4">
            <Banner variant="success">提出しました。ご協力ありがとうございました。</Banner>
          </div>
        )}
        {error && (
          <div className="mt-4">
            <Banner variant="error">{error}</Banner>
          </div>
        )}

        <form action={kioskSubmitInspection} className="mt-6 space-y-6">
          <input type="hidden" name="token" value={token} />

          <UnansweredMonthBanner months={missingMonths} hrefBase={`/haccp/kiosk/${token}/inspection`} />

          <InspectionHeaderFields
            year={displayYear}
            month={String(Number(displayMonth))}
            submittedOn={todayStr}
            storeName={store.store_name}
          />

          {/* Basic info */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-orange-50 px-5 py-3">
              <h2 className="text-base font-bold text-orange-800">基本情報</h2>
            </div>
            <div className="space-y-4 px-5 py-5">
              {[
                { id: "store_manager_name", label: "店長名", required: false },
                { id: "hygiene_officer_name", label: "食品衛生責任者名", required: false },
                { id: "area_manager_name", label: "エリア長名", required: false },
                { id: "area_hygiene_officer_name", label: "エリア衛生担当者", required: false },
                { id: "implementer_name", label: "実施者名", required: true },
              ].map((field) => (
                <div key={field.id}>
                  <label htmlFor={field.id} className="mb-2 block text-sm font-semibold text-slate-700">
                    {field.label}
                    {field.required ? (
                      <span className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-600">必須</span>
                    ) : (
                      <span className="ml-1.5 text-sm font-normal text-slate-400">任意</span>
                    )}
                  </label>
                  <input
                    id={field.id}
                    name={field.id}
                    type="text"
                    required={field.required}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              ))}
            </div>
          </div>

          <InspectionItemsTable />

          {/* Improvement details */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-orange-50 px-5 py-3">
              <h2 className="text-base font-bold text-orange-800">改善が必要な場合の詳細</h2>
              <p className="mt-0.5 text-xs text-orange-600">
                「否」を選択した項目について、理由・対応内容をそれぞれ入力してください。
              </p>
            </div>
            <div className="space-y-4 px-5 py-5">
              <div>
                <label htmlFor="improvement_reason" className="mb-1.5 block text-sm font-medium text-slate-700">
                  理由
                </label>
                <textarea
                  id="improvement_reason"
                  name="improvement_reason"
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label htmlFor="improvement_action" className="mb-1.5 block text-sm font-medium text-slate-700">
                  対応内容
                </label>
                <textarea
                  id="improvement_action"
                  name="improvement_action"
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* Self evaluation */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-orange-50 px-5 py-3">
              <h2 className="text-base font-bold text-orange-800">自主評価</h2>
            </div>
            <div className="space-y-5 px-5 py-5">
              <fieldset>
                <legend className="mb-3 text-sm font-semibold text-slate-700">
                  今月の総合的な自己評価
                  <span className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-600">必須</span>
                </legend>
                <div className="flex gap-3">
                  <label className="cursor-pointer rounded-full border-2 border-green-300 px-5 py-2 text-sm font-bold text-green-600 transition-all has-[:checked]:border-green-600 has-[:checked]:bg-green-50 has-[:checked]:text-green-700">
                    <input type="radio" name="self_evaluation" value="good" required className="sr-only" />
                    良
                  </label>
                  <label className="cursor-pointer rounded-full border-2 border-red-300 px-5 py-2 text-sm font-bold text-red-500 transition-all has-[:checked]:border-red-600 has-[:checked]:bg-red-50 has-[:checked]:text-red-700">
                    <input type="radio" name="self_evaluation" value="needs_improvement" required className="sr-only" />
                    否
                  </label>
                </div>
              </fieldset>
              <div>
                <label
                  htmlFor="business_license_expiry_date"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  営業許可証の有効期限日
                  <span className="ml-1.5 text-sm font-normal text-slate-400">任意</span>
                </label>
                <input
                  id="business_license_expiry_date"
                  name="business_license_expiry_date"
                  type="date"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label htmlFor="special_notes" className="mb-2 block text-sm font-semibold text-slate-700">
                  特記事項
                  <span className="ml-1.5 text-sm font-normal text-slate-400">任意</span>
                </label>
                <textarea
                  id="special_notes"
                  name="special_notes"
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          <SubmitButton
            className="w-full rounded-lg bg-orange-500 px-4 py-4 text-lg font-bold text-white shadow-md transition-colors hover:bg-orange-600"
            pendingText="送信中..."
          >
            点検結果を登録する
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
