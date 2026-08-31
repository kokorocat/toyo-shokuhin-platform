import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";

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

export default async function EmployeeHistoryDetailPage({
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
    .from("haccp_employee_responses")
    .select("id, target_date, version, created_at, manual_name, employees(full_name)")
    .eq("id", id)
    .eq("store_id", ctx.store.id)
    .maybeSingle();

  if (!response) notFound();

  const { data: items } = await supabase
    .from("haccp_employee_items")
    .select("item_code, answer, note, action_taken")
    .eq("response_id", id);

  const itemsByCode = new Map((items ?? []).map((i) => [i.item_code, i]));
  const displayName = response.employees?.full_name ?? response.manual_name ?? "(不明)";

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-white shadow-md">
        <h1 className="text-lg font-bold">従業員衛生チェック（詳細）</h1>
        <p className="mt-0.5 text-sm text-blue-100">
          {ctx.store.name}（{ctx.store.storeCode}） / {response.target_date} / {displayName}
        </p>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/haccp/history" className="text-sm text-blue-600 hover:underline">
          ← 過去回答一覧に戻る
        </Link>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-blue-50 px-5 py-3">
            <p className="text-xs text-slate-500">
              v{response.version} ・{new Date(response.created_at).toLocaleString("ja-JP")} 登録
            </p>
          </div>
          <div className="divide-y divide-slate-100 px-5 py-2">
            {ITEMS.map((item) => {
              const answer = itemsByCode.get(item.code);
              const isBad = answer?.answer === "bad";
              return (
                <div key={item.code} className="flex items-center gap-3 py-3 text-sm text-slate-700">
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      !answer ? "bg-slate-100 text-slate-500" : isBad ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                    }`}
                  >
                    {!answer ? "未回答" : isBad ? "否" : "良"}
                  </span>
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
          {(() => {
            const values = [...itemsByCode.values()];
            const noteValue = values.find((v) => v.note)?.note;
            const actionValue = values.find((v) => v.action_taken)?.action_taken;
            if (!noteValue && !actionValue) return null;
            return (
              <div className="space-y-2 border-t border-slate-100 px-5 py-4 text-sm text-slate-700">
                {noteValue && (
                  <p>
                    <span className="font-medium">備考：</span>
                    {noteValue}
                  </p>
                )}
                {actionValue && (
                  <p>
                    <span className="font-medium">対応内容：</span>
                    {actionValue}
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
