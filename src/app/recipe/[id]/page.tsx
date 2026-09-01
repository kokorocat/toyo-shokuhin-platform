import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { EmptyState } from "@/components/EmptyState";
import { AccessDenied } from "@/components/AccessDenied";
import { RecipeHeader, RecipeTabs } from "../RecipeShell";

const FILE_TYPE_LABELS: Record<string, string> = {
  work_instruction: "作業手順書",
  container: "容器",
  pop: "POP",
  seal_label: "シール・ラベル",
  video: "動画",
  other: "その他資料",
};

const FILE_TYPE_ORDER = ["work_instruction", "container", "pop", "seal_label", "video", "other"];

const SIGNED_URL_TTL_SECONDS = 60 * 30;

function officeViewerUrl(fileUrl: string): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getPortalContext();
  if (!ctx) {
    return <AccessDenied message="セッションを確認できませんでした。" />;
  }

  const supabase = await createClient();

  const { data: recipe } = await supabase
    .from("recipes")
    .select(
      "id, recipe_code, name, category, updated_at, current_version_id, recipe_versions!recipes_current_version_id_fkey(id, version_no, original_storage_path, published_at)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!recipe) notFound();

  const [{ data: files }, { data: relatedProducts }] = await Promise.all([
    supabase
      .from("recipe_files")
      .select("id, file_type, storage_path, display_order")
      .eq("recipe_id", id)
      .order("display_order"),
    supabase
      .from("recipe_related_products")
      .select("id, product_code, product_name, spec, supplier, display_order")
      .eq("recipe_id", id)
      .order("display_order"),
  ]);

  await supabase.from("recipe_view_logs").insert({ recipe_id: id, user_id: ctx.userId });

  const currentVersion = recipe.recipe_versions;

  let originalUrl: string | null = null;
  if (currentVersion?.original_storage_path) {
    const { data: signed } = await supabase.storage
      .from("recipe-files")
      .createSignedUrl(currentVersion.original_storage_path, SIGNED_URL_TTL_SECONDS);
    originalUrl = signed?.signedUrl ?? null;
  }

  const filesByType = new Map<string, { id: string; storage_path: string }[]>();
  for (const f of files ?? []) {
    const list = filesByType.get(f.file_type) ?? [];
    list.push(f);
    filesByType.set(f.file_type, list);
  }

  const signedFileUrls = new Map<string, string>();
  for (const f of files ?? []) {
    const { data: signed } = await supabase.storage
      .from("recipe-files")
      .createSignedUrl(f.storage_path, SIGNED_URL_TTL_SECONDS);
    if (signed?.signedUrl) signedFileUrls.set(f.id, signed.signedUrl);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <RecipeHeader />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <RecipeTabs roleCode={ctx.roleCode ?? null} activeHref="/recipe" />

        <Link
          href="/recipe"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          レシピ一覧に戻る
        </Link>

        <div className="mb-6">
          <p className="text-xs text-slate-400">{recipe.recipe_code}</p>
          <h1 className="text-xl font-bold text-slate-900">{recipe.name}</h1>
          {recipe.category && <p className="mt-1 text-sm text-slate-500">{recipe.category}</p>}
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Main preview (left ~78%) — matching GAS layout */}
          <div className="min-w-0 lg:w-[78%]">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
                <h2 className="text-sm font-bold text-slate-900">レシピ原本</h2>
                {originalUrl && (
                  <div className="flex gap-2">
                    <a
                      href={officeViewerUrl(originalUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-slate-700"
                    >
                      全画面で見る
                    </a>
                    <a
                      href={originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                    >
                      原本ファイルを開く
                    </a>
                  </div>
                )}
              </div>
              {originalUrl ? (
                <iframe
                  src={officeViewerUrl(originalUrl)}
                  title={recipe.name}
                  className="h-[75vh] w-full rounded-b-xl"
                />
              ) : (
                <div className="px-5 py-14 text-center">
                  <p className="text-sm text-slate-400">登録されていません。</p>
                </div>
              )}
            </div>
          </div>

          {/* Related content sidebar (right ~22%) — matching GAS layout */}
          <div className="min-w-0 space-y-4 lg:w-[22%]">
            {/* Related products — GAS uses amber/orange cards */}
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-bold text-slate-900">関連商品</h2>
              </div>
              <div className="px-4 py-3">
                {!relatedProducts || relatedProducts.length === 0 ? (
                  <p className="text-xs text-slate-400">関連商品が登録されていません。</p>
                ) : (
                  <ul className="space-y-2">
                    {relatedProducts.map((p) => (
                      <li key={p.id} className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm">
                        <p className="font-bold text-amber-900">{p.product_name}</p>
                        <p className="mt-0.5 text-xs text-amber-700">
                          {[p.product_code, p.spec, p.supplier].filter(Boolean).join(" / ")}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* Recipe files — GAS shows "レシピ・画像" with dark button + file card */}
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-bold text-slate-900">レシピ・画像</h2>
              </div>
              <div className="px-4 py-3">
                {originalUrl && (
                  <a
                    href={officeViewerUrl(originalUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-3 block w-full rounded-lg bg-slate-800 px-4 py-2.5 text-center text-sm font-bold text-white shadow-sm transition-colors hover:bg-slate-700"
                  >
                    全画面で見る
                  </a>
                )}
                {originalUrl && (
                  <div className="rounded-lg bg-slate-800 px-4 py-3 text-white">
                    <p className="text-sm font-medium leading-snug">{recipe.name}</p>
                    <p className="mt-0.5 text-xs text-white/60">レシピ</p>
                  </div>
                )}
                {!originalUrl && (
                  <p className="text-xs text-slate-400">ファイルが登録されていません。</p>
                )}
              </div>
            </section>

            {/* Additional file types */}
            {FILE_TYPE_ORDER.map((type) => {
              const items = filesByType.get(type) ?? [];
              return (
                <section key={type} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <h2 className="text-sm font-bold text-slate-900">{FILE_TYPE_LABELS[type]}</h2>
                  </div>
                  <div className="px-4 py-3">
                    {items.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        {FILE_TYPE_LABELS[type]}はありません。
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {items.map((f) => {
                          const url = signedFileUrls.get(f.id);
                          return (
                            <li key={f.id}>
                              {url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-blue-700 transition-colors hover:bg-slate-100"
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                  </svg>
                                  開く
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400">読み込みエラー</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
