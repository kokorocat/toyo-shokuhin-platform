import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { EmptyState } from "@/components/EmptyState";
import { AccessDenied } from "@/components/AccessDenied";
import { RecipeHeader, RecipeTabs } from "./RecipeShell";

export default async function RecipeListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const ctx = await getPortalContext();
  if (!ctx) {
    return <AccessDenied message="セッションを確認できませんでした。" />;
  }

  const supabase = await createClient();

  // RLSが会社・エリアスコープ外のレシピを自動的に除外するため、
  // ここでは追加のスコープ絞り込みは行わない(URL改ざんでも範囲外は取得できない)。
  let query = supabase
    .from("recipes")
    .select("id, recipe_code, name, category, updated_at, recipe_files(id)")
    .eq("status", "published")
    .order("recipe_code")
    .limit(100);

  const keywords = (q ?? "").trim().split(/\s+/).filter(Boolean);
  for (const kw of keywords) {
    query = query.or(`name.ilike.%${kw}%,recipe_code.ilike.%${kw}%,category.ilike.%${kw}%`);
  }

  const { data: recipes } = await query;

  return (
    <div className="min-h-screen bg-slate-50">
      <RecipeHeader />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <RecipeTabs roleCode={ctx.roleCode ?? null} activeHref="/recipe" />

        <form className="mb-6 flex flex-wrap items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="レシピコード・レシピ名・カテゴリで検索（スペース区切りでAND検索）"
            className="min-w-[200px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
          >
            検索
          </button>
          <span className="text-xs text-slate-500">{recipes?.length ?? 0}件表示</span>
        </form>

        {!recipes || recipes.length === 0 ? (
          <EmptyState message="該当するレシピがありません。" />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">
                  <th className="whitespace-nowrap px-4 py-3">呼出No</th>
                  <th className="whitespace-nowrap px-4 py-3">レシピ名</th>
                  <th className="whitespace-nowrap px-4 py-3">カテゴリ</th>
                  <th className="whitespace-nowrap px-4 py-3">更新日</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recipes.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={`transition-colors hover:bg-blue-50/50 ${idx % 2 === 1 ? "bg-slate-50/60" : ""}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{r.recipe_code}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/recipe/${r.id}`}
                        className="font-medium text-blue-700 hover:text-blue-900 hover:underline"
                      >
                        {r.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{r.category ?? "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {new Date(r.updated_at).toLocaleDateString("ja-JP")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
