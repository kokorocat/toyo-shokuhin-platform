import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { PageHeader } from "@/components/PageHeader";
import { Banner } from "@/components/Banner";
import { SubmitButton } from "@/components/SubmitButton";
import { AccessDenied } from "@/components/AccessDenied";
import { isRecipeAdminRole, isRecipeApprovalRole } from "../guard";
import { submitRecipe } from "./actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-slate-700";

export default async function RecipeSubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; company_id?: string }>;
}) {
  const { error, success, company_id } = await searchParams;
  const ctx = await getPortalContext();

  if (!isRecipeAdminRole(ctx?.roleCode ?? null)) {
    return <AccessDenied message="権限がありません。管理者アカウントで再度ログインしてください。" />;
  }

  const supabase = await createClient();

  // RLSにより、呼び出し元がアクセス可能な会社のみが返る。
  const { data: companies } = await supabase.from("companies").select("id, name").eq("status", "active").order("name");
  const companyOptions = companies ?? [];
  const selectedCompanyId = company_id || (companyOptions.length === 1 ? companyOptions[0].id : "");

  // 会社が複数ある(=全権限管理者)場合のみ、先に会社を選んでもらう。company_adminは実質この画面は出ない。
  if (!selectedCompanyId) {
    return (
      <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
        <PageHeader backHref="/recipe" backLabel="レシピ一覧に戻る" title="新規レシピ申請" />
        {error && <div className="mb-5"><Banner variant="error">{error}</Banner></div>}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <form className="space-y-3">
            <label htmlFor="company_id" className={LABEL_CLASS}>会社を選択してください</label>
            <select id="company_id" name="company_id" required defaultValue="" className={INPUT_CLASS}>
              <option value="" disabled>選択してください</option>
              {companyOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <SubmitButton className="w-full rounded-lg bg-blue-800 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-900">
              次へ
            </SubmitButton>
          </form>
        </div>
      </div>
    );
  }

  const [{ data: areas }, { data: submitters }] = await Promise.all([
    supabase.from("areas").select("id, name").eq("company_id", selectedCompanyId).eq("status", "active").order("name"),
    supabase.from("recipe_submitters").select("id, name").eq("company_id", selectedCompanyId).eq("status", "active").order("name"),
  ]);
  const submitterOptions = submitters ?? [];

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
          <Banner variant="success">{success}</Banner>
        </div>
      )}

      {submitterOptions.length === 0 ? (
        <Banner variant="warning">
          この会社の申請者名簿が未登録です。先に
          <Link href={`/recipe/admin/submitters?company_id=${selectedCompanyId}`} className="mx-1 underline">
            申請者名簿
          </Link>
          から申請者を登録してください。
        </Banner>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">レシピ情報</h2>
          </div>
          <div className="px-5 py-5">
            <form action={submitRecipe} encType="multipart/form-data" className="space-y-4">
              <input type="hidden" name="company_id" value={selectedCompanyId} />

              <div>
                <label htmlFor="submitter_id" className={LABEL_CLASS}>
                  申請者 <span className="text-red-600">*</span>
                </label>
                <select id="submitter_id" name="submitter_id" required defaultValue="" className={INPUT_CLASS}>
                  <option value="" disabled>選択してください</option>
                  {submitterOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="area_id" className={LABEL_CLASS}>
                  エリア（任意・選択したファイル全件に適用）
                </label>
                <select id="area_id" name="area_id" defaultValue="" className={INPUT_CLASS}>
                  <option value="">未選択</option>
                  {(areas ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="category" className={LABEL_CLASS}>
                  カテゴリ（任意・選択したファイル全件に適用）
                </label>
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
                  xlsx / xls / pdf 形式に対応しています。Excelファイルはファイル内の「呼出No.」「商品名」のセルから自動で読み取ります(ファイル名の変更は不要です)。
                </p>
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
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3 text-center">
        <Link
          href={`/recipe/admin/submitters?company_id=${selectedCompanyId}`}
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
        >
          申請者名簿を編集
        </Link>
        {isRecipeAdminRole(ctx?.roleCode ?? null) && (
          <Link
            href="/recipe/admin/history"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            申請履歴を見る
          </Link>
        )}
        {isRecipeApprovalRole(ctx?.roleCode ?? null) && (
          <Link
            href="/recipe/admin/approvals"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            承認待ち一覧を見る
          </Link>
        )}
      </div>
    </div>
  );
}
