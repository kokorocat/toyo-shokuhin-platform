import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export default async function RecipeListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const ctx = await getPortalContext();
  if (!ctx) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">セッションを確認できませんでした。</p>
      </div>
    );
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
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <PageHeader
        backHref="/"
        backLabel="ポータルTOPに戻る"
        title="レシピ閲覧"
        subtitle={ctx.company ? ctx.company.name : undefined}
      />

      <form className="mb-5">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="レシピコード・レシピ名・カテゴリで検索（スペース区切りでAND検索）"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </form>

      {!recipes || recipes.length === 0 ? (
        <EmptyState message="該当するレシピがありません。" />
      ) : (
        <ul className="space-y-2">
          {recipes.map((r) => (
            <li key={r.id}>
              <Link
                href={`/recipe/${r.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-blue-300 hover:shadow-md"
              >
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">{r.recipe_code}</p>
                  <p className="truncate text-sm font-semibold text-slate-800">{r.name}</p>
                  {r.category && <p className="mt-0.5 text-xs text-slate-500">{r.category}</p>}
                </div>
                <div className="shrink-0 text-right text-xs text-slate-400">
                  <p>関連資料 {r.recipe_files?.length ?? 0}件</p>
                  <p className="mt-0.5">{new Date(r.updated_at).toLocaleDateString("ja-JP")}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
