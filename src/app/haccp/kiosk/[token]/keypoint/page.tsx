import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Banner } from "@/components/Banner";
import { SubmitButton } from "@/components/SubmitButton";
import { todayInTokyo } from "@/lib/date";
import { kioskSubmitKeypoint } from "./actions";
import Link from "next/link";

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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-50">
      {/* GAS-style blue header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-white shadow-md">
        <div className="mx-auto max-w-2xl">
          <p className="text-lg font-bold">HACCP管理（重要ポイント・温度・ラベル）</p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-4">
          <Link href={`/haccp/kiosk/${token}`} className="text-sm text-blue-600 hover:underline">
            ← メニューに戻る
          </Link>
        </div>

        {success && (
          <div className="mb-4">
            <Banner variant="success">記録しました。ご協力ありがとうございました。</Banner>
          </div>
        )}
        {error && (
          <div className="mb-4">
            <Banner variant="error">{error}</Banner>
          </div>
        )}

        <form action={kioskSubmitKeypoint}>
          <input type="hidden" name="token" value={token} />

          {/* 回答日 card — matching GAS style */}
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-bold text-slate-800">回答日</h2>
            <div>
              <label htmlFor="target_date" className="mb-1 block text-xs font-medium text-slate-500">
                日付（必須）
              </label>
              <input
                id="target_date"
                name="target_date"
                type="date"
                required
                defaultValue={today}
                className="rounded-lg border border-slate-300 px-4 py-3 text-base transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* 重要ポイントチェック — GAS-style table with No./項目/判定 */}
          <div className="mb-4 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 bg-blue-50 px-5 py-3">
              <h2 className="text-base font-bold text-blue-800">重要ポイントチェック（毎日）</h2>
              <span className="text-xs font-medium text-slate-500">良 / 否（必須）</span>
            </div>
            {/* Table header */}
            <div className="flex items-center border-b border-slate-200 bg-slate-50 px-5 py-2 text-xs font-bold text-slate-500">
              <span className="w-10">No</span>
              <span className="flex-1">項目</span>
              <span className="w-28 text-center">判定</span>
            </div>
            {KEYPOINT_ITEMS.map(({ code, label }, idx) => (
              <div key={code} className={`flex items-center border-b border-slate-100 px-5 py-4 last:border-0 ${idx % 2 === 1 ? "bg-slate-50/50" : ""}`}>
                <span className="w-10 text-sm font-bold text-slate-400">{idx + 1}</span>
                <div className="flex-1">
                  <label className="flex items-center gap-3 text-base text-slate-700">
                    <input
                      type="checkbox"
                      name={`checked_${code}`}
                      className="h-5 w-5 rounded border-slate-300 text-green-600 focus:ring-green-500/30"
                    />
                    <span className="font-medium">{label}</span>
                  </label>
                  <input
                    type="text"
                    name={`note_${code}`}
                    placeholder="メモ（任意）"
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 温度・ラベルチェック */}
          <div className="mb-4 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-blue-50 px-5 py-3">
              <h2 className="text-base font-bold text-blue-800">温度・ラベルチェック</h2>
            </div>

            {/* Temperature */}
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="mb-2 text-sm font-bold text-slate-700">温度チェック</p>
              <input
                type="number"
                step="0.1"
                name="temp_value"
                placeholder="測定値（℃）"
                className="mb-3 w-full rounded-lg border border-slate-300 px-4 py-3 text-lg font-semibold tabular-nums transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <fieldset>
                <legend className="mb-2 text-xs font-medium text-slate-500">判定</legend>
                <div className="flex gap-3">
                  <label className="cursor-pointer rounded-full border-2 border-slate-300 px-5 py-2 text-sm font-bold text-slate-500 transition-all has-[:checked]:border-slate-600 has-[:checked]:bg-slate-100 has-[:checked]:text-slate-800">
                    <input type="radio" name="temp_judgment" value="" defaultChecked className="sr-only" />
                    なし
                  </label>
                  <label className="cursor-pointer rounded-full border-2 border-green-300 px-5 py-2 text-sm font-bold text-green-600 transition-all has-[:checked]:border-green-600 has-[:checked]:bg-green-50 has-[:checked]:text-green-700">
                    <input type="radio" name="temp_judgment" value="ok" className="sr-only" />
                    良
                  </label>
                  <label className="cursor-pointer rounded-full border-2 border-red-300 px-5 py-2 text-sm font-bold text-red-500 transition-all has-[:checked]:border-red-600 has-[:checked]:bg-red-50 has-[:checked]:text-red-700">
                    <input type="radio" name="temp_judgment" value="ng" className="sr-only" />
                    否
                  </label>
                </div>
              </fieldset>
              <input
                type="text"
                name="temp_note"
                placeholder="メモ（任意）"
                className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
              />
            </div>

            {/* Label */}
            <div className="px-5 py-4">
              <p className="mb-2 text-sm font-bold text-slate-700">ラベルチェック</p>
              <fieldset>
                <legend className="mb-2 text-xs font-medium text-slate-500">判定</legend>
                <div className="flex gap-3">
                  <label className="cursor-pointer rounded-full border-2 border-slate-300 px-5 py-2 text-sm font-bold text-slate-500 transition-all has-[:checked]:border-slate-600 has-[:checked]:bg-slate-100 has-[:checked]:text-slate-800">
                    <input type="radio" name="label_judgment" value="" defaultChecked className="sr-only" />
                    なし
                  </label>
                  <label className="cursor-pointer rounded-full border-2 border-green-300 px-5 py-2 text-sm font-bold text-green-600 transition-all has-[:checked]:border-green-600 has-[:checked]:bg-green-50 has-[:checked]:text-green-700">
                    <input type="radio" name="label_judgment" value="ok" className="sr-only" />
                    良
                  </label>
                  <label className="cursor-pointer rounded-full border-2 border-red-300 px-5 py-2 text-sm font-bold text-red-500 transition-all has-[:checked]:border-red-600 has-[:checked]:bg-red-50 has-[:checked]:text-red-700">
                    <input type="radio" name="label_judgment" value="ng" className="sr-only" />
                    否
                  </label>
                </div>
              </fieldset>
              <input
                type="text"
                name="label_note"
                placeholder="メモ（任意）"
                className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <SubmitButton
            className="w-full rounded-lg bg-blue-600 px-4 py-4 text-lg font-bold text-white shadow-md transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2"
            pendingText="登録中..."
          >
            記録する
          </SubmitButton>
        </form>
      </main>
    </div>
  );
}
