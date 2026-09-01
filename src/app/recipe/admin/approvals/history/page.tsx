// 承認履歴(承認者視点、全権限管理者専用)。承認済みレシピアップロード由来
// (application_idがnull)のレシピはこの画面には出さない(申請フローを経ていないため)。
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isRecipeApprovalRole } from "@/app/recipe/admin/guard";
import { approveRecipe } from "@/app/recipe/admin/approvals/actions";
import { groupByApplication, isJudged, type FlatRecipeRow } from "@/lib/recipe/applications";
import { Banner } from "@/components/Banner";
import { EmptyState } from "@/components/EmptyState";
import { SubmitButton } from "@/components/SubmitButton";
import { AccessDenied } from "@/components/AccessDenied";
import { RecipeHeader, RecipeTabs } from "@/app/recipe/RecipeShell";

const BUCKETS = [
  { key: "", label: "すべて" },
  { key: "rejected", label: "差し戻し" },
  { key: "approved", label: "承認済み(未公開)" },
  { key: "published", label: "承認済み(公開済み)" },
];

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ja-JP");
}

function matchesBucket(item: { status: string; rejection_note: string | null }, bucket: string): boolean {
  if (bucket === "rejected") return item.status === "rejected";
  if (bucket === "approved") return item.status === "approved";
  if (bucket === "published") return item.status === "published";
  return item.status !== "draft";
}

const HISTORY_SELECT =
  "id, recipe_code, name, category, status, rejection_note, created_at, updated_at, application_id, company_id, companies!recipes_company_id_fkey(name), recipe_applications(id, created_at, recipe_submitters(name))";

export default async function RecipeApprovalHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; success?: string; error?: string }>;
}) {
  const { status, success, error } = await searchParams;
  const bucket = status ?? "";
  const ctx = await getPortalContext();

  if (!ctx || !isRecipeApprovalRole(ctx.roleCode ?? null)) {
    return <AccessDenied />;
  }

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("recipes")
    .select(HISTORY_SELECT)
    .not("application_id", "is", null)
    .order("created_at", { ascending: false });

  // 先にフィルタしてからグルーピングすると、バッチ内の他の行がフィルタで落ちた場合に
  // 判定済み件数・合計件数がバッチ本来の構成と食い違う。必ず全行でグルーピングしてから、
  // バケットに該当する行を含むバッチだけを表示する(history/page.tsxと同じ修正)。
  const flatRows = (rows ?? []) as unknown as FlatRecipeRow[];
  const applications = groupByApplication(flatRows).filter((app) =>
    app.items.some((item) => matchesBucket(item, bucket))
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <RecipeHeader />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <RecipeTabs roleCode={ctx.roleCode ?? null} activeHref="/recipe/admin/approvals/history" />

        {success && <Banner variant="success" className="mb-4">処理が完了しました。</Banner>}
        {error && <Banner variant="error" className="mb-4">{error}</Banner>}

        <nav className="mb-6 flex flex-wrap gap-2">
          {BUCKETS.map((b) => (
            <Link
              key={b.key}
              href={b.key ? `/recipe/admin/approvals/history?status=${b.key}` : "/recipe/admin/approvals/history"}
              className={
                bucket === b.key
                  ? "rounded-full bg-slate-800 px-4 py-2 text-xs font-bold text-white"
                  : "rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              }
            >
              {b.label}
            </Link>
          ))}
        </nav>

        {applications.length === 0 ? (
          <EmptyState message="該当するレシピがありません。" />
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const judgedCount = app.items.filter(isJudged).length;
              const total = app.items.length;
              return (
                <details key={app.applicationId ?? app.items[0].id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">
                        {app.companyName} / 申請者: {app.submitterName ?? "(名簿未設定)"}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>申請日: {formatDate(app.createdAt)}</span>
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {judgedCount}/{total}件
                        </span>
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-md px-2.5 py-1 text-xs font-bold ${
                        judgedCount === total ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {judgedCount === total ? "判定完了" : "判定中"}
                    </span>
                  </summary>
                  <div className="divide-y divide-slate-100 border-t border-slate-100">
                    {app.items.map((item) => (
                      <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="text-xs text-slate-400">{item.recipe_code}</p>
                          <Link href={`/recipe/${item.id}`} className="text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline">
                            {item.name}
                          </Link>
                          {item.rejection_note && (
                            <p className="mt-1 whitespace-pre-wrap text-xs text-red-700">差し戻し理由: {item.rejection_note}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${
                              item.status === "published"
                                ? "bg-green-100 text-green-700"
                                : item.status === "approved"
                                  ? "bg-blue-100 text-blue-700"
                                  : item.status === "rejected"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {item.status === "published"
                              ? "公開済み"
                              : item.status === "approved"
                                ? "承認済み(未公開)"
                                : item.status === "rejected"
                                  ? "差し戻し"
                                  : "承認待ち"}
                          </span>
                          {item.status === "approved" && (
                            <form action={approveRecipe}>
                              <input type="hidden" name="recipe_id" value={item.id} />
                              <input type="hidden" name="redirect_to" value="/recipe/admin/approvals/history" />
                              <SubmitButton
                                className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-600"
                                pendingText="処理中..."
                              >
                                公開する
                              </SubmitButton>
                            </form>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
