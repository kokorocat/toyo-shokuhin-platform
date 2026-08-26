// 会社の編集。稼働状態の切り替えはこの画面では扱わず、会社一覧(toggleCompanyStatus)側の
// 責務とする(商品一覧/編集画面と同じ責務分担 — src/app/ordering/admin/products/ 参照)。
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isSuperAdminRole } from "@/app/master/guard";
import { updateCompany } from "@/app/master/companies/actions";
import { PageHeader } from "@/components/PageHeader";
import { Banner } from "@/components/Banner";
import { SubmitButton } from "@/components/SubmitButton";
import { AccessDenied } from "@/components/AccessDenied";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: "稼働中", className: "bg-green-100 text-green-700" },
  inactive: { label: "停止中", className: "bg-slate-100 text-slate-500" },
};

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const LABEL_CLASS = "mb-1.5 block text-xs font-medium text-slate-600";

export default async function EditCompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { companyId } = await params;
  const sp = await searchParams;
  const ctx = await getPortalContext();

  if (!isSuperAdminRole(ctx?.roleCode ?? null)) {
    return <AccessDenied message="この画面を表示する権限がありません。全権限管理者のアカウントで再ログインしてください。" />;
  }

  const supabase = await createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id, company_code, name, status")
    .eq("id", companyId)
    .maybeSingle();

  if (!company) notFound();

  const statusBadge = STATUS_BADGE[company.status] ?? STATUS_BADGE.inactive;

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <PageHeader backHref="/master/companies" backLabel="会社一覧に戻る" title={`会社を編集: ${company.name}`} />

      <div className="mb-4 flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${statusBadge.className}`}
        >
          {statusBadge.label}
        </span>
        <p className="text-xs text-slate-400">※稼働状態の切り替えは会社一覧画面から行ってください。</p>
      </div>

      {sp.error && (
        <div className="mb-4">
          <Banner variant="error">{sp.error}</Banner>
        </div>
      )}

      <form action={updateCompany} className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">会社情報</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 px-5 py-5">
          <input type="hidden" name="company_id" value={company.id} />

          <div>
            <label htmlFor="company_code" className={LABEL_CLASS}>
              会社コード <span className="text-red-600">*</span>
            </label>
            <input
              id="company_code"
              name="company_code"
              type="text"
              required
              maxLength={50}
              defaultValue={company.company_code}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label htmlFor="name" className={LABEL_CLASS}>
              会社名 <span className="text-red-600">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={200}
              defaultValue={company.name}
              className={INPUT_CLASS}
            />
          </div>

          <div className="flex items-center gap-3 border-t border-slate-100 pt-5">
            <SubmitButton
              className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 active:bg-blue-950"
              pendingText="更新中..."
            >
              更新する
            </SubmitButton>
          </div>
        </div>
      </form>
    </div>
  );
}
