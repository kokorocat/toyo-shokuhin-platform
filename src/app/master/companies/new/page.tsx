// 会社の新規追加。実際の登録処理はcreateCompany(actions.ts)に一本化されており、
// このページはフォームの表示のみを担当する。
import Link from "next/link";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isSuperAdminRole } from "@/app/master/guard";
import { createCompany } from "@/app/master/companies/actions";
import { PageHeader } from "@/components/PageHeader";
import { Banner } from "@/components/Banner";
import { SubmitButton } from "@/components/SubmitButton";
import { AccessDenied } from "@/components/AccessDenied";

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const LABEL_CLASS = "mb-1.5 block text-xs font-medium text-slate-600";

export default async function NewCompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getPortalContext();

  if (!isSuperAdminRole(ctx?.roleCode ?? null)) {
    return <AccessDenied message="この画面を表示する権限がありません。全権限管理者のアカウントで再ログインしてください。" />;
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <PageHeader backHref="/master/companies" backLabel="会社一覧に戻る" title="会社を追加" />

      {sp.error && (
        <Banner variant="error" className="mb-6">
          {sp.error}
        </Banner>
      )}

      <form action={createCompany} className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">会社情報</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 px-5 py-5">
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
              placeholder="例: toyo"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label htmlFor="name" className={LABEL_CLASS}>
              会社名 <span className="text-red-600">*</span>
            </label>
            <input id="name" name="name" type="text" required maxLength={200} className={INPUT_CLASS} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4">
          <Link
            href="/master/companies"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            キャンセル
          </Link>
          <SubmitButton
            className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 active:bg-blue-950"
            pendingText="登録中..."
          >
            登録する
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
