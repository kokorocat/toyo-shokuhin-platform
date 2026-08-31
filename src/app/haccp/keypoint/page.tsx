import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { SubmitButton } from "../SubmitButton";
import { recordKeypointCheck } from "./actions";
import { KEYPOINT_ITEMS } from "./constants";
import { Banner } from "@/components/Banner";
import { todayInTokyo } from "@/lib/date";

const JUDGMENT_LABELS: Record<string, string> = {
  ok: "OK",
  ng: "NG",
};

export default async function KeypointCheckPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
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

  const today = todayInTokyo();
  const supabase = await createClient();

  const { data: latestResponse } = await supabase
    .from("haccp_keypoint_responses")
    .select("id, version, created_at, confirmed_by_name")
    .eq("store_id", ctx.store.id)
    .eq("target_date", today)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [{ data: items }, { data: labels }] = latestResponse
    ? await Promise.all([
        supabase
          .from("haccp_keypoint_items")
          .select("item_code, judgment, note")
          .eq("response_id", latestResponse.id),
        supabase
          .from("haccp_temperature_labels")
          .select("label_type, measured_value, judgment, note")
          .eq("response_id", latestResponse.id),
      ])
    : [{ data: null }, { data: null }];

  const itemsByCode = new Map((items ?? []).map((i) => [i.item_code, i]));
  const temperatureCheck = (labels ?? []).find((l) => l.label_type === "temperature");
  const labelCheck = (labels ?? []).find((l) => l.label_type === "label");

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-white shadow-md">
        <h1 className="text-lg font-bold">重要ポイント・温度・ラベル入力</h1>
        <p className="mt-0.5 text-sm text-blue-100">
          {ctx.store.name}（{ctx.store.storeCode}）
        </p>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/haccp" className="text-sm text-blue-600 hover:underline">
          ← HACCP管理TOPに戻る
        </Link>

        {params.success && (
          <div className="mt-4">
            <Banner variant="success">記録しました。</Banner>
          </div>
        )}
        {params.error && (
          <div className="mt-4">
            <Banner variant="error">{params.error}</Banner>
          </div>
        )}

        {/* Today's record summary */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-blue-50 px-5 py-3">
            <h2 className="text-base font-bold text-blue-800">本日の記録状況</h2>
          </div>
          <div className="px-5 py-4">
            {!latestResponse ? (
              <p className="text-sm text-slate-500">本日はまだ記録がありません。</p>
            ) : (
              <>
                <p className="mb-3 text-xs text-slate-400">
                  v{latestResponse.version} ・確認者：{latestResponse.confirmed_by_name ?? "-"} ・
                  {new Date(latestResponse.created_at).toLocaleString("ja-JP")} 登録
                </p>
                <ul className="mb-4 space-y-2">
                  {KEYPOINT_ITEMS.map(({ code, label }) => {
                    const item = itemsByCode.get(code);
                    const isNg = item?.judgment === "ng";
                    return (
                      <li key={code} className="flex items-center gap-3 text-sm text-slate-700">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            !item
                              ? "bg-slate-100 text-slate-500"
                              : isNg
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                          }`}
                        >
                          {!item ? "未回答" : isNg ? "否" : "良"}
                        </span>
                        <span>{label}</span>
                        {item?.note && <span className="text-xs text-slate-400">({item.note})</span>}
                      </li>
                    );
                  })}
                </ul>
                <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  <p>
                    <span className="font-medium">温度チェック：</span>
                    {temperatureCheck
                      ? `${temperatureCheck.measured_value ?? "-"}℃ / ${
                          temperatureCheck.judgment
                            ? (JUDGMENT_LABELS[temperatureCheck.judgment] ?? temperatureCheck.judgment)
                            : "-"
                        }${temperatureCheck.note ? ` (${temperatureCheck.note})` : ""}`
                      : "未記録"}
                  </p>
                  <p>
                    <span className="font-medium">ラベルチェック：</span>
                    {labelCheck
                      ? `${
                          labelCheck.judgment
                            ? (JUDGMENT_LABELS[labelCheck.judgment] ?? labelCheck.judgment)
                            : "-"
                        }${labelCheck.note ? ` (${labelCheck.note})` : ""}`
                      : "未記録"}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Entry form */}
        <form action={recordKeypointCheck} className="mt-6 space-y-6">
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
            <label htmlFor="confirmed_by_name" className="mb-1.5 block text-sm font-medium text-slate-700">
              確認者 <span className="text-red-600">*</span>
            </label>
            <input
              id="confirmed_by_name"
              name="confirmed_by_name"
              type="text"
              required
              placeholder="例）山田 太郎"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* 6-item keypoints */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-blue-50 px-5 py-3">
              <h2 className="text-base font-bold text-blue-800">重要ポイント6項目</h2>
              <p className="mt-1 text-xs text-slate-500">否の場合は理由の入力が必須です</p>
            </div>
            <div className="divide-y divide-slate-100">
              {KEYPOINT_ITEMS.map(({ code, label }) => (
                <div key={code} className="px-5 py-4">
                  <p className="mb-2 text-sm font-medium text-slate-800">{label}</p>
                  <fieldset className="mb-3">
                    <div className="flex flex-wrap gap-2">
                      <label className="cursor-pointer rounded-full border-2 border-green-300 px-5 py-2 text-sm font-bold text-green-600 has-[:checked]:border-green-600 has-[:checked]:bg-green-50 has-[:checked]:text-green-700">
                        <input type="radio" name={`judgment_${code}`} value="ok" required className="sr-only" />
                        良
                      </label>
                      <label className="cursor-pointer rounded-full border-2 border-red-300 px-5 py-2 text-sm font-bold text-red-500 has-[:checked]:border-red-600 has-[:checked]:bg-red-50 has-[:checked]:text-red-700">
                        <input type="radio" name={`judgment_${code}`} value="ng" required className="sr-only" />
                        否
                      </label>
                    </div>
                  </fieldset>
                  <input
                    type="text"
                    name={`note_${code}`}
                    placeholder="否の場合は理由を入力"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Temperature & label checks */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-blue-50 px-5 py-3">
              <h2 className="text-base font-bold text-blue-800">温度・ラベルチェック</h2>
            </div>

            {/* Temperature */}
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="mb-3 text-sm font-medium text-slate-800">温度チェック</p>
              <div className="space-y-3">
                <input
                  type="number"
                  step="0.1"
                  name="temp_value"
                  placeholder="測定値（℃）"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <fieldset>
                  <legend className="mb-2 text-xs font-medium text-slate-600">判定</legend>
                  <div className="flex flex-wrap gap-2">
                    <label className="cursor-pointer rounded-full border-2 border-slate-300 px-5 py-2 text-sm font-bold text-slate-500 has-[:checked]:border-slate-600 has-[:checked]:bg-slate-50 has-[:checked]:text-slate-700">
                      <input type="radio" name="temp_judgment" value="" defaultChecked className="sr-only" />
                      判定なし
                    </label>
                    <label className="cursor-pointer rounded-full border-2 border-green-300 px-5 py-2 text-sm font-bold text-green-600 has-[:checked]:border-green-600 has-[:checked]:bg-green-50 has-[:checked]:text-green-700">
                      <input type="radio" name="temp_judgment" value="ok" className="sr-only" />
                      OK
                    </label>
                    <label className="cursor-pointer rounded-full border-2 border-red-300 px-5 py-2 text-sm font-bold text-red-500 has-[:checked]:border-red-600 has-[:checked]:bg-red-50 has-[:checked]:text-red-700">
                      <input type="radio" name="temp_judgment" value="ng" className="sr-only" />
                      NG
                    </label>
                  </div>
                </fieldset>
                <input
                  type="text"
                  name="temp_note"
                  placeholder="メモ（任意）"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Label */}
            <div className="px-5 py-4">
              <p className="mb-3 text-sm font-medium text-slate-800">ラベルチェック</p>
              <div className="space-y-3">
                <fieldset>
                  <legend className="mb-2 text-xs font-medium text-slate-600">判定</legend>
                  <div className="flex flex-wrap gap-2">
                    <label className="cursor-pointer rounded-full border-2 border-slate-300 px-5 py-2 text-sm font-bold text-slate-500 has-[:checked]:border-slate-600 has-[:checked]:bg-slate-50 has-[:checked]:text-slate-700">
                      <input type="radio" name="label_judgment" value="" defaultChecked className="sr-only" />
                      判定なし
                    </label>
                    <label className="cursor-pointer rounded-full border-2 border-green-300 px-5 py-2 text-sm font-bold text-green-600 has-[:checked]:border-green-600 has-[:checked]:bg-green-50 has-[:checked]:text-green-700">
                      <input type="radio" name="label_judgment" value="ok" className="sr-only" />
                      OK
                    </label>
                    <label className="cursor-pointer rounded-full border-2 border-red-300 px-5 py-2 text-sm font-bold text-red-500 has-[:checked]:border-red-600 has-[:checked]:bg-red-50 has-[:checked]:text-red-700">
                      <input type="radio" name="label_judgment" value="ng" className="sr-only" />
                      NG
                    </label>
                  </div>
                </fieldset>
                <input
                  type="text"
                  name="label_note"
                  placeholder="メモ（任意）"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          <SubmitButton
            className="w-full rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
            pendingText="登録中..."
          >
            {latestResponse ? "再登録する（新しいバージョンとして記録）" : "記録する"}
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
