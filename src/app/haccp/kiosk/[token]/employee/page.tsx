import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { Banner } from "@/components/Banner";
import { SubmitButton } from "@/components/SubmitButton";
import { todayInTokyo } from "@/lib/date";
import { kioskSubmitEmployeeCheck } from "./actions";

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

export default async function KioskEmployeePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { token } = await params;
  const { error, success } = await searchParams;
  const supabase = await createClient();

  const [
    { data: storeRows, error: storeError },
    { data: employeeRows, error: employeeError },
  ] = await Promise.all([
    supabase.rpc("kiosk_get_store", { p_token: token }),
    supabase.rpc("kiosk_get_employees", { p_token: token }),
  ]);

  if (storeError) {
    console.error("[haccp/kiosk/employee] kiosk_get_store failed", storeError);
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center">
        <p className="text-sm text-slate-500">
          一時的なエラーが発生しました。しばらくしてから再度お試しください。
        </p>
      </div>
    );
  }
  if (employeeError) {
    console.error("[haccp/kiosk/employee] kiosk_get_employees failed", employeeError);
  }

  const store = storeRows?.[0];
  if (!store) notFound();

  const today = todayInTokyo();
  const employeeOptions = employeeRows ?? [];

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6 pb-8">
      <PageHeader
        backHref={`/haccp/kiosk/${token}`}
        backLabel="メニューに戻る"
        title="従業員衛生チェック"
        subtitle={store.store_name}
      />

      {success && (
        <div className="mb-5">
          <Banner variant="success">記録しました。ご協力ありがとうございました。</Banner>
        </div>
      )}
      {error && (
        <div className="mb-5">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">衛生チェックを記録</h2>
        </div>
        <div className="px-5 py-5">
          <form action={kioskSubmitEmployeeCheck} className="space-y-5">
            <input type="hidden" name="token" value={token} />

            <div>
              <label htmlFor="target_date" className="mb-1.5 block text-base font-medium text-slate-700">
                対象日
              </label>
              <input
                id="target_date"
                name="target_date"
                type="date"
                required
                defaultValue={today}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3.5 text-base shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label htmlFor="employee_id" className="mb-1.5 block text-base font-medium text-slate-700">
                ご自身のお名前を選択
              </label>
              <select
                id="employee_id"
                name="employee_id"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3.5 text-base shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">選択してください</option>
                {employeeOptions.map((e) => (
                  <option key={e.employee_id} value={e.employee_id}>
                    {e.full_name}（{e.employee_code}）
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="manual_name" className="mb-1.5 block text-base font-medium text-slate-700">
                一覧にない場合はお名前を直接入力
              </label>
              <input
                id="manual_name"
                name="manual_name"
                type="text"
                placeholder="氏名を入力"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3.5 text-base shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-4">
              {ITEMS.map((item) => (
                <div key={item.code} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                  <p className="mb-3 text-base font-medium text-slate-700">{item.label}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="cursor-pointer rounded-lg border-2 border-slate-300 px-3 py-4 text-center text-base text-slate-700 transition-colors has-[:checked]:border-green-600 has-[:checked]:bg-green-50 has-[:checked]:font-bold has-[:checked]:text-green-700">
                      <input type="radio" name={`answer_${item.code}`} value="good" required className="sr-only" />
                      良好
                    </label>
                    <label className="cursor-pointer rounded-lg border-2 border-slate-300 px-3 py-4 text-center text-base text-slate-700 transition-colors has-[:checked]:border-red-600 has-[:checked]:bg-red-50 has-[:checked]:font-bold has-[:checked]:text-red-700">
                      <input type="radio" name={`answer_${item.code}`} value="bad" required className="sr-only" />
                      異常
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label htmlFor="note" className="mb-1.5 block text-base font-medium text-slate-700">
                備考（「異常」の項目がある場合は必須）
              </label>
              <textarea
                id="note"
                name="note"
                rows={2}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3.5 text-base shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label htmlFor="action_taken" className="mb-1.5 block text-base font-medium text-slate-700">
                対応内容（「異常」の項目がある場合は必須）
              </label>
              <textarea
                id="action_taken"
                name="action_taken"
                rows={2}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3.5 text-base shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <SubmitButton
              className="w-full rounded-xl bg-blue-800 px-4 py-4 text-lg font-bold text-white shadow-sm transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 active:bg-blue-950"
              pendingText="登録中..."
            >
              記録する
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
