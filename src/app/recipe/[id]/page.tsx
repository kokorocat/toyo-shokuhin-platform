import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

const FILE_TYPE_LABELS: Record<string, string> = {
  work_instruction: "作業手順書",
  container: "容器",
  pop: "POP",
  seal_label: "シール・ラベル",
  video: "動画",
  other: "その他資料",
};

const FILE_TYPE_ORDER = ["work_instruction", "container", "pop", "seal_label", "video", "other"];

const SIGNED_URL_TTL_SECONDS = 60 * 10;

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getPortalContext();
  if (!ctx) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">セッションを確認できませんでした。</p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: recipe } = await supabase
    .from("recipes")
    .select(
      "id, recipe_code, name, category, updated_at, current_version_id, recipe_versions!recipes_current_version_id_fkey(id, version_no, original_storage_path, published_at)"
    )
    .eq("id", id)
    .maybeSingle();

  // RLSスコープ外、または存在しないIDはnotFoundとして扱う(URL直指定での範囲外取得を防止)
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

  // 閲覧ログ(仕様書5: レシピを開いた時点で記録)。失敗しても閲覧自体はブロックしない。
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
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <PageHeader backHref="/recipe" backLabel="レシピ一覧に戻る" title={recipe.name} subtitle={recipe.recipe_code} />

      {/* メインプレビュー(左約80%相当。モバイルは縦積み) */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">レシピ原本</h2>
        </div>
        <div className="p-5">
          {originalUrl ? (
            <a
              href={originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              レシピ原本を開く
            </a>
          ) : (
            <p className="text-sm text-slate-400">登録されていません。</p>
          )}
          <p className="mt-3 text-xs text-slate-400">
            ※ Excelのブラウザ内プレビュー方式は本番仕様書で未確定のため、本MVPでは原本ファイルを直接開く方式としています。
          </p>
        </div>
      </div>

      {/* 関連資料 */}
      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">関連資料</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {FILE_TYPE_ORDER.map((type) => {
            const items = filesByType.get(type) ?? [];
            return (
              <div key={type} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="mb-1.5 text-xs font-semibold text-slate-600">{FILE_TYPE_LABELS[type]}</p>
                {items.length === 0 ? (
                  <p className="text-xs text-slate-400">登録されていません</p>
                ) : (
                  <ul className="space-y-1">
                    {items.map((f) => {
                      const url = signedFileUrls.get(f.id);
                      return (
                        <li key={f.id}>
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-700 hover:underline"
                            >
                              開く →
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
            );
          })}
        </div>
      </section>

      {/* 関連商品 */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">関連商品</h2>
        {!relatedProducts || relatedProducts.length === 0 ? (
          <EmptyState message="関連商品が登録されていません。" />
        ) : (
          <ul className="space-y-2">
            {relatedProducts.map((p) => (
              <li
                key={p.id}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <p className="text-sm font-medium text-slate-800">{p.product_name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {[p.product_code, p.spec, p.supplier].filter(Boolean).join(" / ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8">
        <Link href="/recipe" className="text-sm text-blue-700 hover:underline">
          ← レシピ一覧に戻る
        </Link>
      </div>
    </div>
  );
}
