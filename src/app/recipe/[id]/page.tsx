import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
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
      <RecipeHeader ctx={ctx} />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <RecipeTabs roleCode={ctx.roleCode ?? null} activeHref="/recipe" />

        <div className="mb-3">
          <p className="text-[11px] text-slate-400">{recipe.recipe_code} {recipe.name}</p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Main preview (left ~78%) — matching GAS layout */}
          <div className="min-w-0 lg:w-[78%]">
              {originalUrl ? (
                <>
                <iframe
                  src={officeViewerUrl(originalUrl)}
                  title={recipe.name}
                  className="h-[75vh] w-full"
                />
                <div className="mt-3 flex items-center justify-center gap-3 text-sm text-slate-600">
                  <button type="button" className="rounded-lg border border-slate-300 px-3 py-1">－</button>
                  <span>🔍</span>
                  <button type="button" className="rounded-lg border border-slate-300 px-3 py-1">＋</button>
                  {/* 要確認: Office Viewer側のズーム制御 */}
                </div>
                </>
              ) : (
                <div className="px-5 py-14 text-center">
                  <p className="text-sm text-slate-400">登録されていません。</p>
                </div>
              )}
          </div>

          {/* Related content sidebar (right ~22%) — matching GAS layout */}
          <div className="min-w-0 space-y-4 lg:w-[22%]">
            {/* Related products — GAS uses slate-800 cards with white bold text */}
            <section className="rounded-lg bg-white">
              <div className="px-1 py-2">
                <h2 className="text-sm font-bold text-slate-900">関連商品</h2>
              </div>
              <div className="px-1 py-1">
                {!relatedProducts || relatedProducts.length === 0 ? (
                  <p className="text-xs text-slate-400">関連商品が登録されていません。</p>
                ) : (
                  <ul className="space-y-2">
                    {relatedProducts.map((p) => (
                      <li key={p.id} className="rounded-lg bg-slate-800 px-3 py-2.5 text-sm">
                        <p className="font-bold text-white break-words">{p.product_name}</p>
                        <p className="mt-0.5 text-xs text-white/70 break-words">
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
                    <p className="text-sm font-medium leading-snug break-words">{recipe.name}</p>
                    <p className="mt-0.5 text-xs text-white/60">レシピ</p>
                  </div>
                )}
                {!originalUrl && (
                  <p className="text-xs text-slate-400">ファイルが登録されていません。</p>
                )}
              </div>
            </section>

            {/* Additional file types */}
            {(() => {
              const grouped = [
                { key: "container_pop_seal", types: ["container", "pop", "seal_label"], label: "容器・POP・シール" },
                { key: "video", types: ["video"], label: FILE_TYPE_LABELS.video },
                { key: "other", types: ["other"], label: FILE_TYPE_LABELS.other },
                { key: "work_instruction", types: ["work_instruction"], label: FILE_TYPE_LABELS.work_instruction },
              ];
              return grouped.map((group) => {
                const items = group.types.flatMap((type) => filesByType.get(type) ?? []);
                const emptyLabel = group.types.length === 1 ? `${FILE_TYPE_LABELS[group.types[0]]}はありません。` : "容器・POP・シールはありません。";
                return (
                <section key={group.key} className="rounded-lg bg-white">
                  <div className="px-1 py-2">
                    <h2 className="text-sm font-bold text-slate-900">{group.label}</h2>
                  </div>
                  <div className="px-1 py-2">
                    {items.length === 0 ? (
                      <p className="text-xs text-slate-400">{emptyLabel}</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {items.map((f) => {
                          const url = signedFileUrls.get(f.id);
                          return (
                            <li key={f.id}>
                              {url ? (
                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-700">
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
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
