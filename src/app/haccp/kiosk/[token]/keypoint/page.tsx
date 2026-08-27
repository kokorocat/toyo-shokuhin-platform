import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { Banner } from "@/components/Banner";
import { SubmitButton } from "@/components/SubmitButton";
import { todayInTokyo } from "@/lib/date";
import { kioskSubmitKeypoint } from "./actions";

const KEYPOINT_ITEMS: { code: string; label: string }[] = [
  { code: "heat_room", label: "加熱(常温)" },
  { code: "heat_cold", label: "加熱(冷蔵)" },
  { code: "nonheat_room", label: "非加熱(常温)" },
  { code: "nonheat_cold", label: "非加熱(冷蔵)" },
  { code: "mixed_room", label: "混合(常温)加熱・非加熱" },
  { code: "mixed_cold", label: "混合(冷蔵)加熱・非加熱" },
];

export default async function KioskKeypointPage({
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
    console.error("[haccp/kiosk/keypoint] kiosk_get_store failed", storeError);
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

  const today = todayInTokyo();

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <PageHeader
        backHref={`/haccp/kiosk/${token}`}
        backLabel="メニューに戻る"
        title="重要ポイント・温度・ラベル入力"
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

      <form action={kioskSubmitKeypoint} className="space-y-6">
        <input type="hidden" name="token" value={token} />

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
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">重要ポイント6項目</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {KEYPOINT_ITEMS.map(({ code, label }) => (
              <div key={code} className="px-5 py-4">
                <p className="mb-2 text-sm font-medium text-slate-800">{label}</p>
                <label className="mb-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition-colors has-[:checked]:border-green-500 has-[:checked]:bg-green-50 has-[:checked]:text-green-800">
                  <input
                    type="checkbox"
                    name={`checked_${code}`}
                    className="h-5 w-5 rounded border-slate-300 text-green-600 focus:ring-green-500/30"
                  />
                  <span>本日該当あり（重要管理点を確認済み）</span>
                </label>
                <input
                  type="text"
                  name={`note_${code}`}
                  placeholder="メモ（任意）"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">温度・ラベルチェック</h2>
          </div>

          <div className="border-b border-slate-100 px-5 py-4">
            <p className="mb-3 text-sm font-medium text-slate-800">温度チェック</p>
            <div className="space-y-3">
              <input
                type="number"
                step="0.1"
                name="temp_value"
                placeholder="測定値（℃）"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <fieldset>
                <legend className="mb-2 text-xs font-medium text-slate-600">判定</legend>
                <div className="grid grid-cols-3 gap-2">
                  <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-3 text-center text-sm text-slate-600 transition-colors has-[:checked]:border-slate-500 has-[:checked]:bg-slate-100 has-[:checked]:font-semibold has-[:checked]:text-slate-800">
                    <input type="radio" name="temp_judgment" value="" defaultChecked className="sr-only" />
                    判定なし
                  </label>
                  <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-3 text-center text-sm text-slate-600 transition-colors has-[:checked]:border-green-600 has-[:checked]:bg-green-50 has-[:checked]:font-semibold has-[:checked]:text-green-700">
                    <input type="radio" name="temp_judgment" value="ok" className="sr-only" />
                    OK
                  </label>
                  <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-3 text-center text-sm text-slate-600 transition-colors has-[:checked]:border-red-600 has-[:checked]:bg-red-50 has-[:checked]:font-semibold has-[:checked]:text-red-700">
                    <input type="radio" name="temp_judgment" value="ng" className="sr-only" />
                    NG
                  </label>
                </div>
              </fieldset>
              <input
                type="text"
                name="temp_note"
                placeholder="メモ（任意）"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="px-5 py-4">
            <p className="mb-3 text-sm font-medium text-slate-800">ラベルチェック</p>
            <div className="space-y-3">
              <fieldset>
                <legend className="mb-2 text-xs font-medium text-slate-600">判定</legend>
                <div className="grid grid-cols-3 gap-2">
                  <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-3 text-center text-sm text-slate-600 transition-colors has-[:checked]:border-slate-500 has-[:checked]:bg-slate-100 has-[:checked]:font-semibold has-[:checked]:text-slate-800">
                    <input type="radio" name="label_judgment" value="" defaultChecked className="sr-only" />
                    判定なし
                  </label>
                  <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-3 text-center text-sm text-slate-600 transition-colors has-[:checked]:border-green-600 has-[:checked]:bg-green-50 has-[:checked]:font-semibold has-[:checked]:text-green-700">
                    <input type="radio" name="label_judgment" value="ok" className="sr-only" />
                    OK
                  </label>
                  <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-3 text-center text-sm text-slate-600 transition-colors has-[:checked]:border-red-600 has-[:checked]:bg-red-50 has-[:checked]:font-semibold has-[:checked]:text-red-700">
                    <input type="radio" name="label_judgment" value="ng" className="sr-only" />
                    NG
                  </label>
                </div>
              </fieldset>
              <input
                type="text"
                name="label_note"
                placeholder="メモ（任意）"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        <SubmitButton
          className="w-full rounded-lg bg-blue-800 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 active:bg-blue-950"
          pendingText="登録中..."
        >
          記録する
        </SubmitButton>
      </form>
    </div>
  );
}
