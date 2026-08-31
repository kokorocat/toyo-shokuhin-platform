import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { Banner } from "@/components/Banner";
import { INSPECTION_CATEGORIES } from "@/app/haccp/inspection/constants";

export default async function InspectionHistoryDetailPage({
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
  const { data: inspection } = await supabase
    .from("haccp_inspections")
    .select(
      "id, target_month, version, created_at, submitted_on, overall_evaluation, implementer_name, store_manager_name, hygiene_officer_name, area_manager_name, area_hygiene_officer_name, improvement_reason, improvement_action, self_evaluation, special_notes, business_license_expiry_date"
    )
    .eq("id", id)
    .eq("store_id", ctx.store.id)
    .maybeSingle();

  if (!inspection) notFound();

  const { data: items } = await supabase
    .from("haccp_inspection_items")
    .select("question_code, answer")
    .eq("inspection_id", id);

  const answerByCode = new Map((items ?? []).map((i) => [i.question_code, i.answer]));

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-white shadow-md">
        <h1 className="text-lg font-bold">食品衛生自主点検（詳細）</h1>
        <p className="mt-0.5 text-sm text-blue-100">
          {ctx.store.name}（{ctx.store.storeCode}） / {inspection.target_month.slice(0, 7)}
        </p>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/haccp/history" className="text-sm text-blue-600 hover:underline">
          ← 過去回答一覧に戻る
        </Link>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-blue-50 px-5 py-3">
            <p className="text-xs text-slate-500">
              v{inspection.version} ・実施者：{inspection.implementer_name} ・提出日：{inspection.submitted_on}
            </p>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                inspection.overall_evaluation === "needs_improvement"
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {inspection.overall_evaluation === "needs_improvement" ? "要改善" : "良好"}
            </span>
          </div>
          <div className="space-y-1 border-b border-slate-100 px-5 py-4 text-sm text-slate-700">
            <p>店長名：{inspection.store_manager_name ?? "-"}</p>
            <p>食品衛生責任者名：{inspection.hygiene_officer_name ?? "-"}</p>
            <p>エリア長名：{inspection.area_manager_name ?? "-"}</p>
            <p>エリア衛生担当者名：{inspection.area_hygiene_officer_name ?? "-"}</p>
            <p>営業許可証有効期限：{inspection.business_license_expiry_date ?? "-"}</p>
          </div>
          <div className="divide-y divide-slate-100 px-5 py-2">
            {INSPECTION_CATEGORIES.map((category) => (
              <div key={category.no} className="py-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {category.no}. {category.title}
                </p>
                <div className="space-y-2">
                  {category.items.map((q) => {
                    const answer = answerByCode.get(q.code);
                    const isBad = answer === "needs_improvement";
                    return (
                      <div key={q.code} className="flex items-center gap-3 text-sm text-slate-700">
                        <span
                          className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            !answer ? "bg-slate-100 text-slate-500" : isBad ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                          }`}
                        >
                          {!answer ? "未回答" : isBad ? "要改善" : "良好"}
                        </span>
                        <span>{q.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {(inspection.improvement_reason || inspection.improvement_action) && (
            <Banner variant="warning" className="mx-5 mb-4">
              {inspection.improvement_reason && (
                <>
                  <p className="mb-1 font-medium">理由</p>
                  <p className="mb-2">{inspection.improvement_reason}</p>
                </>
              )}
              {inspection.improvement_action && (
                <>
                  <p className="mb-1 font-medium">対応内容</p>
                  <p>{inspection.improvement_action}</p>
                </>
              )}
            </Banner>
          )}
          {inspection.special_notes && (
            <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-700">
              <p className="mb-1 font-medium">特記事項</p>
              <p>{inspection.special_notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
