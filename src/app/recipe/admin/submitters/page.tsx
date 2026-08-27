// 申請者名簿(ログインアカウントとは別に、レシピ申請時に選ぶ人名の小さなマスタ)。
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { createClient } from "@/lib/supabase/server";
import { isRecipeAdminRole } from "@/app/recipe/admin/guard";
import { PageHeader } from "@/components/PageHeader";
import { Banner } from "@/components/Banner";
import { SubmitButton } from "@/components/SubmitButton";
import { AccessDenied } from "@/components/AccessDenied";
import { EmptyState } from "@/components/EmptyState";
import { createSubmitter, renameSubmitter, toggleSubmitterStatus } from "./actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

type SubmitterRow = { id: string; name: string; status: string };

export default async function RecipeSubmittersPage({
  searchParams,
}: {
  searchParams: Promise<{ company_id?: string; error?: string; success?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getPortalContext();

  if (!isRecipeAdminRole(ctx?.roleCode ?? null)) {
    return <AccessDenied message="権限がありません。管理者アカウントで再度ログインしてください。" />;
  }

  const supabase = await createClient();
  const { data: companies } = await supabase.from("companies").select("id, name").eq("status", "active").order("name");
  const companyOptions = companies ?? [];
  const selectedCompanyId = sp.company_id || (companyOptions.length === 1 ? companyOptions[0].id : "");

  const rows: SubmitterRow[] = [];
  if (selectedCompanyId) {
    const { data: submitters } = await supabase
      .from("recipe_submitters")
      .select("id, name, status")
      .eq("company_id", selectedCompanyId)
      .order("status")
      .order("name");
    rows.push(...((submitters ?? []) as SubmitterRow[]));
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <PageHeader backHref="/recipe" backLabel="レシピ一覧に戻る" title="申請者名簿" />

      {sp.error && <div className="mb-4"><Banner variant="error">{sp.error}</Banner></div>}
      {sp.success && <div className="mb-4"><Banner variant="success">保存しました。</Banner></div>}

      {!selectedCompanyId ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <form className="space-y-3">
            <label htmlFor="company_id" className="mb-1.5 block text-xs font-medium text-slate-600">
              会社を選択してください
            </label>
            <select id="company_id" name="company_id" required defaultValue="" className={INPUT_CLASS}>
              <option value="" disabled>選択してください</option>
              {companyOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <SubmitButton className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-900">
              次へ
            </SubmitButton>
          </form>
        </div>
      ) : (
        <>
          <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-900">申請者を追加</h2>
            </div>
            <form action={createSubmitter} className="flex flex-wrap items-end gap-3 px-5 py-4">
              <input type="hidden" name="company_id" value={selectedCompanyId} />
              <div className="min-w-[200px] flex-1">
                <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-slate-600">氏名</label>
                <input id="name" name="name" type="text" required maxLength={100} className={INPUT_CLASS} />
              </div>
              <SubmitButton className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-900" pendingText="登録中...">
                追加
              </SubmitButton>
            </form>
          </div>

          {rows.length === 0 ? (
            <EmptyState message="申請者がまだ登録されていません。" />
          ) : (
            <ul className="space-y-2">
              {rows.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <span
                    className={`inline-flex shrink-0 items-center rounded-md px-2 py-1 text-xs font-bold ${
                      s.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {s.status === "active" ? "有効" : "無効"}
                  </span>
                  <form action={renameSubmitter} className="flex min-w-[160px] flex-1 items-center gap-2">
                    <input type="hidden" name="submitter_id" value={s.id} />
                    <input type="hidden" name="company_id" value={selectedCompanyId} />
                    <input name="name" type="text" defaultValue={s.name} maxLength={100} className={INPUT_CLASS} />
                    <SubmitButton className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50">
                      保存
                    </SubmitButton>
                  </form>
                  <form action={toggleSubmitterStatus}>
                    <input type="hidden" name="submitter_id" value={s.id} />
                    <input type="hidden" name="company_id" value={selectedCompanyId} />
                    <input type="hidden" name="next_status" value={s.status === "active" ? "inactive" : "active"} />
                    <SubmitButton
                      className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold shadow-sm ${
                        s.status === "active"
                          ? "border border-red-300 bg-white text-red-700 hover:bg-red-50"
                          : "border border-green-300 bg-white text-green-700 hover:bg-green-50"
                      }`}
                    >
                      {s.status === "active" ? "無効にする" : "有効にする"}
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
