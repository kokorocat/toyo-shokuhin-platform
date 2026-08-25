import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { SubmitButton } from "../SubmitButton";
import { recordKeypointCheck } from "./actions";
import { KEYPOINT_ITEMS } from "./constants";

const JUDGMENT_LABELS: Record<string, string> = {
  ok: "OK",
  ng: "NG",
};

export default async function KeypointCheckPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const ctx = await getPortalContext();

  if (!ctx?.store) {
    return (
      <div className="p-8 text-sm text-slate-500">
        店舗スコープを持つアカウントでログインしてください。
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();

  const { data: latestResponse } = await supabase
    .from("haccp_keypoint_responses")
    .select("id, version, created_at")
    .eq("store_id", ctx.store.id)
    .eq("target_date", today)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [{ data: items }, { data: labels }] = latestResponse
    ? await Promise.all([
        supabase
          .from("haccp_keypoint_items")
          .select("item_code, checked, note")
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
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <div className="mb-4">
        <Link href="/haccp" className="text-xs text-blue-700 underline">
          ← HACCP管理TOPに戻る
        </Link>
      </div>
      <h1 className="mb-1 text-lg font-bold text-slate-900">重要ポイント・温度・ラベル入力</h1>
      <p className="mb-4 text-xs text-slate-400">
        {ctx.store.name}({ctx.store.storeCode})
      </p>

      {params.error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      )}

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-slate-900">本日の記録状況</h2>
        {!latestResponse ? (
          <p className="text-sm text-slate-500">本日はまだ記録がありません。</p>
        ) : (
          <>
            <p className="mb-2 text-xs text-slate-400">
              v{latestResponse.version} ・{" "}
              {new Date(latestResponse.created_at).toLocaleString("ja-JP")} 登録
            </p>
            <ul className="mb-3 space-y-1">
              {KEYPOINT_ITEMS.map(({ code, label }) => {
                const item = itemsByCode.get(code);
                return (
                  <li key={code} className="flex items-center gap-2 text-sm text-slate-700">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                        item?.checked
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item?.checked ? "確認済" : "未確認"}
                    </span>
                    <span>{label}</span>
                    {item?.note && <span className="text-xs text-slate-400">({item.note})</span>}
                  </li>
                );
              })}
            </ul>
            <div className="space-y-1 text-sm text-slate-700">
              <p>
                温度チェック:{" "}
                {temperatureCheck
                  ? `${temperatureCheck.measured_value ?? "-"}℃ / ${
                      temperatureCheck.judgment
                        ? (JUDGMENT_LABELS[temperatureCheck.judgment] ?? temperatureCheck.judgment)
                        : "-"
                    }${temperatureCheck.note ? ` (${temperatureCheck.note})` : ""}`
                  : "未記録"}
              </p>
              <p>
                ラベルチェック:{" "}
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

      <form action={recordKeypointCheck} className="space-y-6">
        <input type="hidden" name="company_id" value={ctx.company?.id ?? ""} />
        <input type="hidden" name="store_id" value={ctx.store.id} />

        <div>
          <label htmlFor="target_date" className="mb-1 block text-sm font-medium text-slate-700">
            対象日
          </label>
          <input
            id="target_date"
            name="target_date"
            type="date"
            required
            defaultValue={today}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-bold text-slate-900">重要ポイント6項目</h2>
          <p className="mb-3 text-xs text-slate-500">
            ※重要ポイントの正確な入力欄・単位・合否ルールは仕様書内で未確定のため、暫定的な構成で実装しています。原紙またはGASソースの確認後、正式な項目に調整します。
          </p>
          <div className="space-y-4">
            {KEYPOINT_ITEMS.map(({ code, label }) => (
              <div
                key={code}
                className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0"
              >
                <p className="mb-1 text-sm font-medium text-slate-800">{label}</p>
                <label className="mb-2 flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name={`checked_${code}`}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  本日該当あり(重要管理点を確認済み)
                </label>
                <input
                  type="text"
                  name={`note_${code}`}
                  placeholder="メモ(任意)"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-slate-900">温度・ラベルチェック</h2>

          <div className="mb-4 border-b border-slate-100 pb-4">
            <p className="mb-2 text-sm font-medium text-slate-800">温度チェック</p>
            <div className="flex flex-wrap gap-2">
              <input
                type="number"
                step="0.1"
                name="temp_value"
                placeholder="測定値(℃)"
                className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <select
                name="temp_judgment"
                defaultValue=""
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">判定なし</option>
                <option value="ok">OK</option>
                <option value="ng">NG</option>
              </select>
              <input
                type="text"
                name="temp_note"
                placeholder="メモ(任意)"
                className="min-w-[8rem] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-800">ラベルチェック</p>
            <div className="flex flex-wrap gap-2">
              <select
                name="label_judgment"
                defaultValue=""
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">判定なし</option>
                <option value="ok">OK</option>
                <option value="ng">NG</option>
              </select>
              <input
                type="text"
                name="label_note"
                placeholder="メモ(任意)"
                className="min-w-[8rem] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <SubmitButton
          className="w-full rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
          pendingText="登録中..."
        >
          {latestResponse ? "再登録する(新しいバージョンとして記録)" : "記録する"}
        </SubmitButton>
      </form>
    </div>
  );
}
