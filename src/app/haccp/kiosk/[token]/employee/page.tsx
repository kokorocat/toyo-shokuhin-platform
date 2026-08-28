import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-50">
      <header className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 text-white shadow-md">
        <div className="mx-auto max-w-2xl">
          <p className="text-lg font-bold">従業員衛生チェック</p>
          <p className="text-sm text-emerald-100">{store.store_name}</p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link href={`/haccp/kiosk/${token}`} className="text-sm text-blue-600 hover:underline">
          ← メニューに戻る
        </Link>

        {success && (
          <div className="mt-4">
            <Banner variant="success">記録しました。ご協力ありがとうございました。</Banner>
          </div>
        )}
        {error && (
          <div className="mt-4">
            <Banner variant="error">{error}</Banner>
          </div>
        )}

        <form action={kioskSubmitEmployeeCheck} className="mt-6 space-y-6">
          <input type="hidden" name="token" value={token} />

          {/* Basic info card */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-green-50 px-5 py-3">
              <h2 className="text-base font-bold text-green-800">基本情報</h2>
            </div>
            <div className="space-y-5 px-5 py-5">
              <div>
                <label htmlFor="target_date" className="mb-2 block text-sm font-semibold text-slate-700">
                  対象日
                </label>
                <input
                  id="target_date"
                  name="target_date"
                  type="date"
                  required
                  defaultValue={today}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label htmlFor="employee_id" className="mb-2 block text-sm font-semibold text-slate-700">
                  ご自身のお名前を選択
                </label>
                <select
                  id="employee_id"
                  name="employee_id"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                <label htmlFor="manual_name" className="mb-2 block text-sm font-semibold text-slate-700">
                  一覧にない場合はお名前を直接入力
                </label>
                <input
                  id="manual_name"
                  name="manual_name"
                  type="text"
                  placeholder="氏名を入力"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* Check items card */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-green-50 px-5 py-3">
              <h2 className="text-base font-bold text-green-800">チェック項目</h2>
            </div>
            {/* Table header */}
            <div className="flex items-center border-b border-slate-200 bg-slate-50 px-5 py-2 text-xs font-bold text-slate-500">
              <span className="w-10">No</span>
              <span className="flex-1">項目</span>
              <span className="w-36 text-center">判定</span>
            </div>
            {/* Rows */}
            <div>
              {ITEMS.map((item, idx) => (
                <div key={item.code} className="flex items-center border-b border-slate-100 px-5 py-4">
                  <span className="w-10 text-sm font-bold text-slate-500">{idx + 1}</span>
                  <span className="flex-1 text-sm text-slate-800">{item.label}</span>
                  <div className="flex w-36 justify-center gap-2">
                    <label className="cursor-pointer rounded-full border-2 border-green-300 px-5 py-2 text-sm font-bold text-green-600 transition-all has-[:checked]:border-green-600 has-[:checked]:bg-green-50 has-[:checked]:text-green-700">
                      <input type="radio" name={`answer_${item.code}`} value="good" required className="sr-only" />
                      良好
                    </label>
                    <label className="cursor-pointer rounded-full border-2 border-red-300 px-5 py-2 text-sm font-bold text-red-500 transition-all has-[:checked]:border-red-600 has-[:checked]:bg-red-50 has-[:checked]:text-red-700">
                      <input type="radio" name={`answer_${item.code}`} value="bad" required className="sr-only" />
                      異常
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes card */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-green-50 px-5 py-3">
              <h2 className="text-base font-bold text-green-800">備考・対応</h2>
              <p className="mt-0.5 text-xs text-green-600">
                「異常」の項目がある場合は必ず記入してください。
              </p>
            </div>
            <div className="space-y-5 px-5 py-5">
              <div>
                <label htmlFor="note" className="mb-2 block text-sm font-semibold text-slate-700">
                  備考
                </label>
                <textarea
                  id="note"
                  name="note"
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label htmlFor="action_taken" className="mb-2 block text-sm font-semibold text-slate-700">
                  対応内容
                </label>
                <textarea
                  id="action_taken"
                  name="action_taken"
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          <SubmitButton
            className="w-full rounded-lg bg-blue-600 px-4 py-4 text-lg font-bold text-white shadow-md transition-colors hover:bg-blue-700"
            pendingText="登録中..."
          >
            記録する
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
