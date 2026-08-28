// RV-50 承認待ち・承認履歴。
// 2026-08-27にクライアントから確定した3段階判定(承認して公開/承認/差し戻し)・複数ファイル
// 一括申請のバッチ表示に対応。バッチのグルーピングはsrc/lib/recipe/applications.tsを使用する。
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isRecipeApprovalRole } from "@/app/recipe/admin/guard";
import { approveRecipe, approveRecipeWithoutPublishing, rejectRecipe } from "@/app/recipe/admin/approvals/actions";
import { groupByApplication, isJudged, type FlatRecipeRow } from "@/lib/recipe/applications";
import { Banner } from "@/components/Banner";
import { EmptyState } from "@/components/EmptyState";
import { SubmitButton } from "@/components/SubmitButton";
import { AccessDenied } from "@/components/AccessDenied";
import { RecipeHeader, RecipeTabs } from "@/app/recipe/RecipeShell";

type SearchParams = { error?: string; success?: string };

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ja-JP");
}

function companyName(companies: { name: string } | null | undefined): string {
  return companies?.name ?? "-";
}

const PENDING_SELECT =
  "id, recipe_code, name, category, status, rejection_note, created_at, updated_at, application_id, company_id, companies!recipes_company_id_fkey(name), recipe_applications(id, created_at, recipe_submitters(name))";

export default async function RecipeApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { error, success } = await searchParams;
  const ctx = await getPortalContext();

  if (!ctx || !isRecipeApprovalRole(ctx.roleCode ?? null)) {
    return <AccessDenied />;
  }

  const supabase = await createClient();

  // 未判定(status='draft')の行だけで絞り込むと、バッチ内の他の行が既に判定済みの場合に
  // バッチの本来の構成(判定済み件数・合計件数)が分からなくなる(1件だけ承認した4件バッチが
  // 「3件のバッチ」に見えてしまう)。そのため、直近の申請(全ステータス、作成日時降順で一定件数)を
  // 取得し、バッチ単位でグルーピングした後に「1件でも未判定の行が残っているバッチ」を優先表示する。
  // 全件判定済みのバッチも、直近作成分であればそのまま折りたたみ表示で残す(判定直後に
  // 「判定済みX/X件」が確認できるようにするため)。
  const [{ data: recent }, { data: recentlyPublished }] = await Promise.all([
    supabase.from("recipes").select(PENDING_SELECT).order("created_at", { ascending: false }).limit(200),
    supabase
      .from("recipes")
      .select("id, recipe_code, name, updated_at, companies!recipes_company_id_fkey(name)")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(10),
  ]);

  const recentRows = (recent ?? []) as unknown as FlatRecipeRow[];
  const pendingApplications = groupByApplication(recentRows).sort((a, b) => {
    const aDone = a.items.every(isJudged);
    const bDone = b.items.every(isJudged);
    if (aDone !== bDone) return aDone ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
  const publishedRecipes = recentlyPublished ?? [];
  const totalPending = recentRows.filter((r) => !isJudged(r)).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <RecipeHeader />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <RecipeTabs roleCode={ctx.roleCode ?? null} activeHref="/recipe/admin/approvals" />

        {error && (
          <Banner variant="error" className="mb-5">
            {error}
          </Banner>
        )}
        {success && (
          <Banner variant="success" className="mb-5">
            処理が完了しました。
          </Banner>
        )}

        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">承認待ち一覧</h2>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
              {totalPending}件
            </span>
          </div>
          {pendingApplications.length === 0 ? (
            <EmptyState message="承認待ちのレシピはありません。" />
          ) : (
            <div className="space-y-4">
              {pendingApplications.map((app) => {
                const judgedCount = app.items.filter(isJudged).length;
                const total = app.items.length;
                const allJudged = judgedCount === total;
                return (
                  <details
                    key={app.applicationId ?? app.items[0].id}
                    open={!allJudged}
                    className="rounded-xl border border-slate-200 bg-white shadow-sm"
                  >
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">
                          {app.companyName} / 申請者: {app.submitterName ?? "(名簿未設定)"}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>申請日: {formatDate(app.createdAt)}</span>
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            判定済み {judgedCount}/{total}件
                          </span>
                          {!allJudged && (
                            <span className="font-semibold text-amber-600">残り{total - judgedCount}件</span>
                          )}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-md px-2.5 py-1 text-xs font-bold ${
                          allJudged ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {allJudged ? "判定完了" : "判定中"}
                      </span>
                    </summary>
                    <div className="divide-y divide-slate-100 border-t border-slate-100">
                      {app.items.map((item) => {
                        const rejected = Boolean(item.rejection_note);
                        return (
                          <div key={item.id} className="px-5 py-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs text-slate-400">{item.recipe_code}</p>
                                <h3 className="inline text-sm font-bold text-slate-900">
                                  {item.name}
                                  {item.status === "approved" && (
                                    <span className="ml-2 inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">承認済み</span>
                                  )}
                                  {item.status === "published" && (
                                    <span className="ml-2 inline-flex items-center rounded-md bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">公開済み</span>
                                  )}
                                </h3>
                                {item.category && <p className="mt-0.5 text-xs text-slate-500">{item.category}</p>}
                              </div>
                              {rejected && (
                                <span className="inline-flex shrink-0 items-center rounded-md bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                                  差し戻し済み
                                </span>
                              )}
                            </div>

                            {rejected && (
                              <div className="mt-3 rounded-lg bg-red-50 px-4 py-3">
                                <p className="text-xs font-medium text-red-700">前回の差し戻し理由</p>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-red-800">{item.rejection_note}</p>
                              </div>
                            )}

                            <div className="mt-3 flex flex-wrap items-start gap-3">
                              <form action={approveRecipe}>
                                <input type="hidden" name="recipe_id" value={item.id} />
                                <SubmitButton
                                  className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-600"
                                  pendingText="処理中..."
                                >
                                  承認して公開
                                </SubmitButton>
                              </form>
                              <form action={approveRecipeWithoutPublishing}>
                                <input type="hidden" name="recipe_id" value={item.id} />
                                <SubmitButton
                                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                                  pendingText="処理中..."
                                >
                                  承認（未公開のまま）
                                </SubmitButton>
                              </form>
                              <form action={rejectRecipe} className="flex min-w-[260px] flex-1 flex-wrap items-start gap-2">
                                <input type="hidden" name="recipe_id" value={item.id} />
                                <textarea
                                  name="reason"
                                  required
                                  rows={2}
                                  placeholder="差し戻し理由を入力してください"
                                  className="min-w-[200px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                                <SubmitButton
                                  className="shrink-0 rounded-lg bg-red-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-red-600"
                                  pendingText="処理中..."
                                >
                                  差し戻す
                                </SubmitButton>
                              </form>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold text-slate-900">最近承認したレシピ</h2>
          {publishedRecipes.length === 0 ? (
            <p className="text-sm text-slate-400">承認履歴はまだありません。</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">
                    <th className="whitespace-nowrap px-4 py-3">レシピコード</th>
                    <th className="whitespace-nowrap px-4 py-3">レシピ名</th>
                    <th className="whitespace-nowrap px-4 py-3">会社</th>
                    <th className="whitespace-nowrap px-4 py-3">更新日</th>
                    <th className="whitespace-nowrap px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {publishedRecipes.map((recipe, idx) => (
                    <tr key={recipe.id} className={`transition-colors hover:bg-blue-50/50 ${idx % 2 === 1 ? "bg-slate-50/60" : ""}`}>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{recipe.recipe_code}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{recipe.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {companyName(recipe.companies)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(recipe.updated_at)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <span className="inline-flex items-center rounded-md bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
                          公開済み
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
