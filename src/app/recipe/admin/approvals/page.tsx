// RV-50 承認待ち・承認履歴。
// 仕様書上は申請書/添付ファイル単位の判定を持つ独立ワークフローだが、本MVPでは
// recipes.status ('draft'=未公開/承認待ち, 'published'=公開済み) を軽量な承認ゲートとして
// 再利用する(approvals/actions.ts参照)。差し戻し済みかどうかはrejection_noteの有無で判定する。
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isRecipeAdminRole } from "@/app/recipe/admin/guard";
import { approveRecipe, rejectRecipe } from "@/app/recipe/admin/approvals/actions";
import { Banner } from "@/components/Banner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { SubmitButton } from "@/components/SubmitButton";
import { AccessDenied } from "@/components/AccessDenied";

type SearchParams = { error?: string; success?: string };

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ja-JP");
}

// company_id は recipes の必須列だが、RLSでcompaniesが見えない/データ不整合のケースに備えて
// フォールバック表示を用意する。
function companyName(companies: { name: string } | null | undefined): string {
  return companies?.name ?? "-";
}

export default async function RecipeApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { error, success } = await searchParams;
  const ctx = await getPortalContext();

  if (!ctx || !isRecipeAdminRole(ctx.roleCode ?? null)) {
    return <AccessDenied />;
  }

  const supabase = await createClient();

  const [{ data: pending }, { data: recentlyPublished }] = await Promise.all([
    supabase
      .from("recipes")
      .select(
        "id, recipe_code, name, category, rejection_note, created_at, companies!recipes_company_id_fkey(name)"
      )
      .eq("status", "draft")
      .order("created_at", { ascending: true }),
    supabase
      .from("recipes")
      .select("id, recipe_code, name, updated_at, companies!recipes_company_id_fkey(name)")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(10),
  ]);

  const pendingRecipes = pending ?? [];
  const publishedRecipes = recentlyPublished ?? [];

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6">
      <PageHeader
        backHref="/recipe"
        backLabel="レシピ一覧に戻る"
        title="レシピ承認"
        subtitle={`承認待ち ${pendingRecipes.length}件`}
      />

      <div className="mb-5 flex justify-end">
        <Link
          href="/recipe/admin/submit"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 active:bg-blue-950"
        >
          ＋ 新規レシピ申請
        </Link>
      </div>

      {/* 承認フロー図解 */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">承認ワークフロー</h3>
        <div className="flex flex-wrap items-start justify-center gap-0">
          {/* 作成・編集 */}
          <div className="flex flex-col items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
            </div>
            <p className="mt-1.5 text-xs font-medium text-slate-700">作成・編集</p>
          </div>
          {/* 矢印 */}
          <div className="mt-4 flex items-center px-2 text-slate-300 sm:px-3">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
          </div>
          {/* 申請 */}
          <div className="flex flex-col items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </div>
            <p className="mt-1.5 text-xs font-medium text-slate-700">申請</p>
            <span className="mt-1 inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">承認待ち</span>
          </div>
          {/* 矢印 */}
          <div className="mt-4 flex items-center px-2 text-slate-300 sm:px-3">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
          </div>
          {/* 承認 */}
          <div className="flex flex-col items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <p className="mt-1.5 text-xs font-medium text-slate-700">承認</p>
            <span className="mt-1 inline-flex items-center rounded-md bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">承認済み</span>
          </div>
          {/* 矢印 */}
          <div className="mt-4 flex items-center px-2 text-slate-300 sm:px-3">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
          </div>
          {/* 公開 */}
          <div className="flex flex-col items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            </div>
            <p className="mt-1.5 text-xs font-medium text-slate-700">公開</p>
          </div>
        </div>
        {/* 差し戻しループ */}
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-red-500">
          <svg className="h-3.5 w-3.5 rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>
          <span className="font-medium">差し戻し（承認 → 作成・編集へ）</span>
        </div>
      </div>

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
        <h2 className="mb-3 text-sm font-bold text-slate-900">承認待ち一覧</h2>
        {pendingRecipes.length === 0 ? (
          <EmptyState message="承認待ちのレシピはありません。" />
        ) : (
          <div className="space-y-4">
            {pendingRecipes.map((recipe) => {
              const rejected = Boolean(recipe.rejection_note);
              return (
                <div key={recipe.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">{recipe.recipe_code}</p>
                      <h3 className="text-sm font-semibold text-slate-900">{recipe.name}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {companyName(recipe.companies)}
                        {recipe.category ? ` / ${recipe.category}` : ""}
                        {` / 申請日: ${formatDate(recipe.created_at)}`}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-md px-2.5 py-1 text-xs font-bold ${
                        rejected ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {rejected ? "差し戻し済み" : "承認待ち"}
                    </span>
                  </div>

                  {rejected && (
                    <div className="border-b border-slate-100 bg-red-50/60 px-5 py-3">
                      <p className="text-xs font-medium text-red-700">前回の差し戻し理由</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-red-800">{recipe.rejection_note}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-start gap-3 px-5 py-4">
                    <form action={approveRecipe}>
                      <input type="hidden" name="recipe_id" value={recipe.id} />
                      <SubmitButton
                        className="rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 active:bg-blue-950"
                        pendingText="承認中..."
                      >
                        承認して公開
                      </SubmitButton>
                    </form>

                    <form action={rejectRecipe} className="flex min-w-[260px] flex-1 flex-wrap items-start gap-2">
                      <input type="hidden" name="recipe_id" value={recipe.id} />
                      <textarea
                        name="reason"
                        required
                        rows={2}
                        placeholder="差し戻し理由を入力してください"
                        className="min-w-[200px] flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <SubmitButton
                        className="shrink-0 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-50"
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
                  <tr key={recipe.id} className={`transition-colors hover:bg-blue-50/50 ${idx % 2 === 1 ? "bg-slate-50/50" : ""}`}>
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
  );
}
