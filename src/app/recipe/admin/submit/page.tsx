import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { PageHeader } from "@/components/PageHeader";
import { Banner } from "@/components/Banner";
import { SubmitButton } from "@/components/SubmitButton";
import { isRecipeAdminRole } from "../guard";
import { submitRecipe } from "./actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-slate-700";

export default async function RecipeSubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const ctx = await getPortalContext();

  if (!isRecipeAdminRole(ctx?.roleCode ?? null)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">
          権限がありません。管理者アカウントで再度ログインしてください。
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  // RLSにより、呼び出し元がアクセス可能な会社・エリアのみが返る。
  const [{ data: companies }, { data: areas }] = await Promise.all([
    supabase.from("companies").select("id, name").eq("status", "active").order("name"),
    supabase.from("areas").select("id, name, company_id").eq("status", "active").order("name"),
  ]);

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <PageHeader backHref="/recipe" backLabel="レシピ一覧に戻る" title="新規レシピ申請" />

      {error && (
        <div className="mb-5">
          <Banner variant="error">{error}</Banner>
        </div>
      )}
      {success && (
        <div className="mb-5">
          <Banner variant="success">申請を受け付けました。承認され次第、一覧に公開されます。</Banner>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">レシピ情報</h2>
        </div>
        <div className="px-5 py-5">
          <form action={submitRecipe} encType="multipart/form-data" className="space-y-4">
            <div>
              <label htmlFor="company_id" className={LABEL_CLASS}>
                会社
              </label>
              <select id="company_id" name="company_id" required defaultValue="" className={INPUT_CLASS}>
                <option value="" disabled>
                  選択してください
                </option>
                {(companies ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="area_id" className={LABEL_CLASS}>
                エリア（任意）
              </label>
              <select id="area_id" name="area_id" defaultValue="" className={INPUT_CLASS}>
                <option value="">未選択</option>
                {(areas ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="recipe_code" className={LABEL_CLASS}>
                レシピコード
              </label>
              <input
                id="recipe_code"
                name="recipe_code"
                type="text"
                required
                placeholder="0001"
                className={INPUT_CLASS}
              />
              <p className="mt-1 text-xs text-slate-400">同一会社内で重複しないコードを入力してください。</p>
            </div>

            <div>
              <label htmlFor="name" className={LABEL_CLASS}>
                レシピ名
              </label>
              <input id="name" name="name" type="text" required className={INPUT_CLASS} />
            </div>

            <div>
              <label htmlFor="category" className={LABEL_CLASS}>
                カテゴリ（任意）
              </label>
              <input
                id="category"
                name="category"
                type="text"
                placeholder="弁当、惣菜 など"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="original_file" className={LABEL_CLASS}>
                レシピ原本ファイル（任意）
              </label>
              <input
                id="original_file"
                name="original_file"
                type="file"
                accept=".xlsx,.xls,.pdf"
                className={`${INPUT_CLASS} file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700`}
              />
              <p className="mt-1 text-xs text-slate-400">xlsx / xls / pdf 形式に対応しています。</p>
            </div>

            <SubmitButton
              className="w-full rounded-lg bg-blue-800 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 active:bg-blue-950"
              pendingText="申請中..."
            >
              申請する
            </SubmitButton>
          </form>
          <p className="mt-3 text-xs text-slate-400">
            申請後は承認待ちの状態となり、管理者の承認をもってレシピ一覧に公開されます。
          </p>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link href="/recipe/admin/approvals" className="text-sm text-blue-700 transition-colors hover:text-blue-900">
          承認待ち一覧を見る
        </Link>
      </div>
    </div>
  );
}
