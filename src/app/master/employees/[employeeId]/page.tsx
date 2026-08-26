// 従業員の編集 + 配属履歴 + 店舗への配属フォーム。在籍状態の切り替えは一覧側の責務とする。
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isMasterAdminRole } from "@/app/master/guard";
import { updateEmployee, assignEmployeeToStore } from "@/app/master/employees/actions";
import { PageHeader } from "@/components/PageHeader";
import { Banner } from "@/components/Banner";
import { SubmitButton } from "@/components/SubmitButton";
import { AccessDenied } from "@/components/AccessDenied";
import { EmptyState } from "@/components/EmptyState";
import { todayInTokyo } from "@/lib/date";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: "在籍", className: "bg-green-100 text-green-700" },
  leave: { label: "休職", className: "bg-amber-100 text-amber-700" },
  retired: { label: "退職", className: "bg-slate-100 text-slate-500" },
};

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const LABEL_CLASS = "mb-1.5 block text-xs font-medium text-slate-600";

type CompanyOption = { id: string; name: string };
type StoreOption = { id: string; name: string; store_code: string };
type AssignmentRow = { id: string; started_on: string; ended_on: string | null; reason: string | null; stores: { name: string } | { name: string }[] | null };

function oneOf<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function EditEmployeePage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { employeeId } = await params;
  const sp = await searchParams;
  const ctx = await getPortalContext();

  if (!isMasterAdminRole(ctx?.roleCode ?? null)) {
    return <AccessDenied message="この画面を表示する権限がありません。管理者権限を持つアカウントで再ログインしてください。" />;
  }

  const supabase = await createClient();

  const { data: employee } = await supabase
    .from("employees")
    .select("id, company_id, employee_code, full_name, employment_type, status, hired_on")
    .eq("id", employeeId)
    .maybeSingle();

  if (!employee) notFound();

  const [{ data: companies }, { data: stores }, { data: assignments }] = await Promise.all([
    supabase.from("companies").select("id, name").eq("status", "active").order("name"),
    supabase.from("stores").select("id, name, store_code").eq("company_id", employee.company_id).eq("status", "active").order("store_code"),
    supabase
      .from("employee_assignments")
      .select("id, started_on, ended_on, reason, stores(name)")
      .eq("employee_id", employeeId)
      .order("started_on", { ascending: false }),
  ]);

  const companyOptions = (companies ?? []) as CompanyOption[];
  const storeOptions = (stores ?? []) as StoreOption[];
  const assignmentRows = (assignments ?? []) as AssignmentRow[];
  const statusBadge = STATUS_BADGE[employee.status] ?? STATUS_BADGE.retired;

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <PageHeader backHref="/master/employees" backLabel="従業員一覧に戻る" title={`従業員を編集: ${employee.full_name}`} />

      <div className="mb-4 flex items-center gap-2">
        <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${statusBadge.className}`}>{statusBadge.label}</span>
        <p className="text-xs text-slate-400">※在籍状態の切り替えは従業員一覧画面から行ってください。</p>
      </div>

      {sp.success && <div className="mb-4"><Banner variant="success">保存しました。</Banner></div>}
      {sp.error && <div className="mb-4"><Banner variant="error">{sp.error}</Banner></div>}

      <form action={updateEmployee} className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">従業員情報</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">
          <input type="hidden" name="employee_id" value={employee.id} />

          <div>
            <label htmlFor="company_id" className={LABEL_CLASS}>会社 <span className="text-red-600">*</span></label>
            <select id="company_id" name="company_id" required defaultValue={employee.company_id} className={INPUT_CLASS}>
              {companyOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="employee_code" className={LABEL_CLASS}>社員コード <span className="text-red-600">*</span></label>
            <input id="employee_code" name="employee_code" type="text" required maxLength={50} defaultValue={employee.employee_code} className={INPUT_CLASS} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="full_name" className={LABEL_CLASS}>氏名 <span className="text-red-600">*</span></label>
            <input id="full_name" name="full_name" type="text" required maxLength={100} defaultValue={employee.full_name} className={INPUT_CLASS} />
          </div>
          <div>
            <label htmlFor="employment_type" className={LABEL_CLASS}>雇用区分</label>
            <input id="employment_type" name="employment_type" type="text" maxLength={50} defaultValue={employee.employment_type ?? ""} className={INPUT_CLASS} />
          </div>
          <div>
            <label htmlFor="hired_on" className={LABEL_CLASS}>入社日</label>
            <input id="hired_on" name="hired_on" type="date" defaultValue={employee.hired_on ?? ""} className={INPUT_CLASS} />
          </div>

          <div className="flex items-center gap-3 border-t border-slate-100 pt-5 sm:col-span-2">
            <SubmitButton className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 active:bg-blue-950" pendingText="更新中...">更新する</SubmitButton>
          </div>
        </div>
      </form>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">店舗への配属</h2>
        </div>
        <form action={assignEmployeeToStore} className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">
          <input type="hidden" name="employee_id" value={employee.id} />
          <div>
            <label htmlFor="store_id" className={LABEL_CLASS}>配属店舗 <span className="text-red-600">*</span></label>
            <select id="store_id" name="store_id" required defaultValue="" className={INPUT_CLASS}>
              <option value="" disabled>選択してください</option>
              {storeOptions.map((s) => <option key={s.id} value={s.id}>{s.store_code} {s.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="started_on" className={LABEL_CLASS}>配属開始日 <span className="text-red-600">*</span></label>
            <input id="started_on" name="started_on" type="date" required defaultValue={todayInTokyo()} className={INPUT_CLASS} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="reason" className={LABEL_CLASS}>異動理由・備考</label>
            <input id="reason" name="reason" type="text" maxLength={200} className={INPUT_CLASS} />
          </div>
          <div className="sm:col-span-2">
            <SubmitButton className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 shadow-sm transition-colors hover:bg-blue-100" pendingText="登録中...">配属する</SubmitButton>
          </div>
        </form>
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">※既に有効な配属がある場合、配属開始日の前日で自動的に終了させます(履歴として保持し上書きしません)。</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">配属履歴</h2>
        </div>
        <div className="p-5">
          {assignmentRows.length === 0 ? (
            <EmptyState message="配属履歴がありません。" />
          ) : (
            <ul className="space-y-2">
              {assignmentRows.map((a) => {
                const store = oneOf(a.stores);
                return (
                  <li key={a.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-slate-800">{store?.name ?? "-"}</span>
                      <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${a.ended_on ? "bg-slate-100 text-slate-500" : "bg-green-100 text-green-700"}`}>
                        {a.ended_on ? "終了" : "配属中"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{a.started_on} 〜 {a.ended_on ?? "現在"}</p>
                    {a.reason && <p className="mt-1 text-xs text-slate-400">{a.reason}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
