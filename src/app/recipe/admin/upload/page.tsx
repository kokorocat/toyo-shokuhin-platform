// RV-*: 承認・公開済みレシピの一括アップロード(2026-08-27にクライアントより追加確定)。
// 既に社内承認済みで、Teach me Biz/そうけん君に格納されている約4万件のレシピを、承認フローを
// 経ずに直接公開状態で登録するための機能。ファイル名の先頭トークンを呼出番号として扱う規約
// (actions.tsのparseFileName参照)。
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { createClient } from "@/lib/supabase/server";
import { isRecipeAdminRole } from "@/app/recipe/admin/guard";
import { Banner } from "@/components/Banner";
import { SubmitButton } from "@/components/SubmitButton";
import { AccessDenied } from "@/components/AccessDenied";
import { bulkUploadApprovedRecipes } from "./actions";
import { RecipeHeader, RecipeTabs } from "@/app/recipe/RecipeShell";

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-slate-700";

export default async function RecipeBulkUploadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const ctx = await getPortalContext();

  if (!isRecipeAdminRole(ctx?.roleCode ?? null)) {
    return <AccessDenied message="権限がありません。管理者アカウントで再度ログインしてください。" />;
  }

  const supabase = await createClient();

  const [{ data: companies }, { data: areas }] = await Promise.all([
    supabase.from("companies").select("id, name").eq("status", "active").order("name"),
    supabase.from("areas").select("id, name, company_id").eq("status", "active").order("name"),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <RecipeHeader ctx={ctx} />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <RecipeTabs roleCode={ctx?.roleCode ?? null} activeHref="/recipe/admin/upload" />

        <div className="mb-5">
          <Banner variant="info">
            既に社内承認済みのレシピを、承認フローを経ずに直接公開する一括アップロード機能です。Excelファイル(xlsx/xls)は、ファイル内の「呼出No.」「商品名」のセルから自動で読み取って登録します(ファイル名の変更は不要です)。それ以外の形式(pdf等)は、ファイル名の先頭(数字部分)を呼出番号として登録します。
          </Banner>
        </div>

        {error && (
          <div className="mb-5">
            <Banner variant="error">{error}</Banner>
          </div>
        )}
        {success && (
          <div className="mb-5">
            <Banner variant="success">{success}</Banner>
          </div>
        )}

        <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">アップロード先・対象ファイル</h2>
          </div>
          <div className="px-5 py-5">
            <form action={bulkUploadApprovedRecipes} encType="multipart/form-data" className="space-y-4">
              <div>
                <label htmlFor="company_id" className={LABEL_CLASS}>
                  会社 <span className="text-red-600">*</span>
                </label>
                <select id="company_id" name="company_id" required defaultValue="" className={INPUT_CLASS}>
                  <option value="" disabled>選択してください</option>
                  {(companies ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="area_id" className={LABEL_CLASS}>エリア（任意・選択したファイル全件に適用）</label>
                <select id="area_id" name="area_id" defaultValue="" className={INPUT_CLASS}>
                  <option value="">未選択</option>
                  {(areas ?? []).map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="category" className={LABEL_CLASS}>カテゴリ（任意・選択したファイル全件に適用）</label>
                <input id="category" name="category" type="text" placeholder="弁当、惣菜 など" className={INPUT_CLASS} />
              </div>

              <div>
                <label htmlFor="files" className={LABEL_CLASS}>
                  レシピファイル（複数選択可） <span className="text-red-600">*</span>
                </label>
                <input
                  id="files"
                  name="files"
                  type="file"
                  multiple
                  required
                  accept=".xlsx,.xls,.pdf"
                  className={`${INPUT_CLASS} file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700`}
                />
                <p className="mt-1 text-xs text-slate-400">
                  xlsx / xls / pdf 形式に対応しています。同じ呼出番号が既に登録済みの場合はスキップされます。
                </p>
              </div>

              <div>
                <label htmlFor="format_rule" className={LABEL_CLASS}>自動文字整形</label>
                <select id="format_rule" name="format_rule" className={INPUT_CLASS}>
                  <option>枠に合わせて自動整形する</option>
                  <option>整形しない</option>
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
              <SubmitButton
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white"
                pendingText="アップロード中..."
              >
                アップロードする
              </SubmitButton>
              <button type="reset" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">選択をクリア</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
