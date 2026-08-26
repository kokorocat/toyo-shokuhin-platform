// 従業員の新規登録。実際の登録処理はcreateEmployee(actions.ts)に一本化されており、
// このページはフォームの表示のみを担当する。店舗への配属は登録後、編集画面から行う。
import Link from "next/link";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isMasterAdminRole } from "@/app/master/guard";
import { createClient } from "@/lib/supabase/server";
import { createEmployee } from "@/app/master/employees/actions";
import { PageHeader } from "@/components/PageHeader";
import { Banner } from "@/components/Banner";
import { SubmitButton } from "@/components/SubmitButton";
import { AccessDenied } from "@/components/AccessDenied";

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const LABEL_CLASS = "mb-1.5 block text-xs font-medium text-slate-600";

type CompanyOption = { id: string; name: string };

export default async function NewEmployeePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getPortalContext();

  if (!isMasterAdminRole(ctx?.roleCode ?? null)) {
    return <AccessDenied message="この画面を表示する権限がありません。管理者権限を持つアカウントで再ログインしてください。" />;
  }

  const supabase = await createClient();
  const { data: companies } = await supabase.from("companies").select("id, name").eq("status", "active").order("name");
  const companyOptions = (companies ?? []) as CompanyOption[];

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <PageHeader backHref="/master/employees" backLabel="従業員一覧に戻る" title="従業員を登録" />

      {sp.error && <Banner variant="error" className="mb-6">{sp.error}</Banner>}

      <form action={createEmployee} className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">従業員情報</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">
          <div>
            <label htmlFor="company_id" className={LABEL_CLASS}>会社 <span className="text-red-600">*</span></label>
            <select id="company_id" name="company_id" required defaultValue="" className={INPUT_CLASS}>
              <option value="" disabled>選択してください</option>
              {companyOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="employee_code" className={LABEL_CLASS}>社員コード <span className="text-red-600">*</span></label>
            <input id="employee_code" name="employee_code" type="text" required maxLength={50} className={INPUT_CLASS} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="full_name" className={LABEL_CLASS}>氏名 <span className="text-red-600">*</span></label>
            <input id="full_name" name="full_name" type="text" required maxLength={100} className={INPUT_CLASS} />
          </div>
          <div>
            <label htmlFor="employment_type" className={LABEL_CLASS}>雇用区分</label>
            <input id="employment_type" name="employment_type" type="text" maxLength={50} placeholder="例: 正社員" className={INPUT_CLASS} />
          </div>
          <div>
            <label htmlFor="hired_on" className={LABEL_CLASS}>入社日</label>
            <input id="hired_on" name="hired_on" type="date" className={INPUT_CLASS} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4">
          <Link href="/master/employees" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50">キャンセル</Link>
          <SubmitButton className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 active:bg-blue-950" pendingText="登録中...">登録する</SubmitButton>
        </div>
      </form>
    </div>
  );
}
