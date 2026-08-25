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
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">
          この画面を表示する権限がありません。管理者権限を持つアカウントで再ログインしてください。
        </p>
      </div>
    );
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
                      <button
                        type="submit"
                        className="rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 active:bg-blue-950"
                      >
                        承認して公開
                      </button>
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
                      <button
                        type="submit"
                        className="shrink-0 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-50"
                      >
                        差し戻す
                      </button>
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
                {publishedRecipes.map((recipe) => (
                  <tr key={recipe.id}>
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
