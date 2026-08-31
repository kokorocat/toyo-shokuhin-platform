import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { KEYPOINT_ITEMS } from "@/app/haccp/keypoint/constants";

const JUDGMENT_LABELS: Record<string, string> = { ok: "OK", ng: "NG" };

export default async function KeypointHistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getPortalContext();

  if (!ctx?.store) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">店舗スコープを持つアカウントでログインしてください。</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: response } = await supabase
    .from("haccp_keypoint_responses")
    .select("id, target_date, version, created_at, confirmed_by_name")
    .eq("id", id)
    .eq("store_id", ctx.store.id)
    .maybeSingle();

  if (!response) notFound();

  const [{ data: items }, { data: labels }] = await Promise.all([
    supabase.from("haccp_keypoint_items").select("item_code, judgment, note").eq("response_id", id),
    supabase
      .from("haccp_temperature_labels")
      .select("label_type, measured_value, judgment, note")
      .eq("response_id", id),
  ]);

  const itemsByCode = new Map((items ?? []).map((i) => [i.item_code, i]));
  const temperatureCheck = (labels ?? []).find((l) => l.label_type === "temperature");
  const labelCheck = (labels ?? []).find((l) => l.label_type === "label");

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-white shadow-md">
        <h1 className="text-lg font-bold">重要ポイント・温度・ラベル（詳細）</h1>
        <p className="mt-0.5 text-sm text-blue-100">
          {ctx.store.name}（{ctx.store.storeCode}） / {response.target_date}
        </p>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/haccp/history" className="text-sm text-blue-600 hover:underline">
          ← 過去回答一覧に戻る
        </Link>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-blue-50 px-5 py-3">
            <p className="text-xs text-slate-500">
              v{response.version} ・確認者：{response.confirmed_by_name ?? "-"} ・{" "}
              {new Date(response.created_at).toLocaleString("ja-JP")} 登録
            </p>
          </div>
          <div className="px-5 py-4">
            <ul className="mb-4 space-y-2">
              {KEYPOINT_ITEMS.map(({ code, label }) => {
                const item = itemsByCode.get(code);
                const isNg = item?.judgment === "ng";
                return (
                  <li key={code} className="flex items-center gap-3 text-sm text-slate-700">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        !item ? "bg-slate-100 text-slate-500" : isNg ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
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
                      temperatureCheck.judgment ? (JUDGMENT_LABELS[temperatureCheck.judgment] ?? temperatureCheck.judgment) : "-"
                    }${temperatureCheck.note ? ` (${temperatureCheck.note})` : ""}`
                  : "未記録"}
              </p>
              <p>
                <span className="font-medium">ラベルチェック：</span>
                {labelCheck
                  ? `${labelCheck.judgment ? (JUDGMENT_LABELS[labelCheck.judgment] ?? labelCheck.judgment) : "-"}${
                      labelCheck.note ? ` (${labelCheck.note})` : ""
                    }`
                  : "未記録"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
