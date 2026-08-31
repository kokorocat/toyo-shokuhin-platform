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

// Office Online Viewerのfetchが完了するまでの余裕を見て、他のsigned URL(10分)より長めに取る。
const SIGNED_URL_TTL_SECONDS = 60 * 30;

// レシピ原本(Excel)をアプリ内でプレビューする(仕様書RV-20「左約80%メインプレビュー」相当)。
// 独自のシート描画・ズームエンジンを新規に作る時間が無いため、Microsoft純正のOffice Online
// Viewerへ署名付きURLを渡して埋め込む方式を採用(社内向けにOffice365を利用しているクライアント
// 環境と親和性が高く、シートタブ切替もビューア自身のUIでそのまま利用できる)。
// 注意: プレビュー時、原本ファイルの内容がMicrosoftのサーバーを経由する。この点はクライアントに
// 説明済みで、了承のうえで採用している。
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
    <div className="min-h-screen bg-slate-50">
      <RecipeHeader />
      <div className="mx-auto max-w-6xl px-4 py-6">
        <RecipeTabs roleCode={ctx.roleCode ?? null} activeHref="/recipe" />

        <Link
          href="/recipe"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
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
          {/* メインプレビュー(PC約80%) */}
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
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
                    >
                      全画面で見る
                    </a>
                    <a
                      href={originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
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

          {/* 関連コンテンツ(PC約20%) */}
          <div className="min-w-0 space-y-6 lg:w-[22%]">
            <section>
              <h2 className="mb-3 text-sm font-bold text-slate-900">関連資料</h2>
              <div className="space-y-2">
                {FILE_TYPE_ORDER.map((type) => {
                  const items = filesByType.get(type) ?? [];
                  return (
                    <div key={type} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
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
                                    className="inline-block rounded-lg px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-slate-100"
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

            <section>
              <h2 className="mb-3 text-sm font-bold text-slate-900">関連商品</h2>
              {!relatedProducts || relatedProducts.length === 0 ? (
                <EmptyState message="関連商品が登録されていません。" />
              ) : (
                <ul className="space-y-2">
                  {relatedProducts.map((p) => (
                    <li key={p.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <p className="text-sm font-medium text-slate-800">{p.product_name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {[p.product_code, p.spec, p.supplier].filter(Boolean).join(" / ")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
