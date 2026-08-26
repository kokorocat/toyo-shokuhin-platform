// 従業員一覧。新規登録・編集・在籍状態の切り替えを行う起点画面。会社管理者(自社限定・RLSで
// 担保)・全権限管理者が利用可能。employeesテーブル(共通マスター)を直接扱う——
// hr_employments(雇用履歴)を軸にするHRモジュールとは異なる、素のマスターデータ一覧。
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isMasterAdminRole } from "@/app/master/guard";
import { toggleEmployeeStatus } from "./actions";
import { Banner } from "@/components/Banner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { SubmitButton } from "@/components/SubmitButton";
import { AccessDenied } from "@/components/AccessDenied";

const PAGE_SIZE = 50;

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  const value = Array.isArray(v) ? v[0] : v;
  return value && value.length > 0 ? value : undefined;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) sp.set(key, value);
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: "在籍", className: "bg-green-100 text-green-700" },
  leave: { label: "休職", className: "bg-amber-100 text-amber-700" },
  retired: { label: "退職", className: "bg-slate-100 text-slate-500" },
};

type CompanyOption = { id: string; name: string };
type EmployeeRow = {
  id: string;
  employee_code: string;
  full_name: string;
  employment_type: string | null;
  status: string;
  hired_on: string | null;
  companies: { name: string } | { name: string }[] | null;
};

function oneOf<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function MasterEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const ctx = await getPortalContext();

  if (!isMasterAdminRole(ctx?.roleCode ?? null)) {
    return <AccessDenied message="この画面を表示する権限がありません。管理者権限を持つアカウントで再ログインしてください。" />;
  }

  const errorMessage = first(sp.error);
  const successMessage = first(sp.success);
  const filters = { companyId: first(sp.companyId), name: first(sp.name), status: first(sp.status) };

  const supabase = await createClient();

  const [{ data: companies }, employeesResult] = await Promise.all([
    supabase.from("companies").select("id, name").eq("status", "active").order("name"),
    (async () => {
      let query = supabase
        .from("employees")
        .select("id, employee_code, full_name, employment_type, status, hired_on, companies(name)")
        .order("employee_code");
      if (filters.companyId) query = query.eq("company_id", filters.companyId);
      if (filters.name) query = query.ilike("full_name", `%${filters.name}%`);
      if (filters.status) query = query.eq("status", filters.status);
      return query;
    })(),
  ]);

  const companyOptions = (companies ?? []) as CompanyOption[];
  const { data, error } = employeesResult;
  const employees = (data ?? []) as EmployeeRow[];

  const totalCount = employees.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const rawPageNum = Number(first(sp.page));
  const page = Number.isFinite(rawPageNum) && rawPageNum >= 1 ? Math.min(Math.floor(rawPageNum), totalPages) : 1;
  const pageRows = employees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const currentParams = { companyId: filters.companyId, name: filters.name, status: filters.status };

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6">
      <PageHeader backHref="/master" backLabel="マスター管理に戻る" title="従業員一覧" subtitle="従業員の新規登録・編集・在籍状態の切り替え、店舗への配属" />

      {successMessage && <div className="mb-4"><Banner variant="success">保存しました。</Banner></div>}
      {errorMessage && <div className="mb-4"><Banner variant="error">{errorMessage}</Banner></div>}
      {error && <div className="mb-4"><Banner variant="error">従業員の取得に失敗しました: {error.message}</Banner></div>}

      <form method="get" action="/master/employees" className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">絞り込み条件</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="companyId" className="mb-1.5 block text-xs font-medium text-slate-600">会社</label>
            <select id="companyId" name="companyId" defaultValue={filters.companyId ?? ""} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="">すべて</option>
              {companyOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-slate-600">氏名</label>
            <input id="name" name="name" type="text" defaultValue={filters.name ?? ""} placeholder="部分一致" className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div>
            <label htmlFor="status" className="mb-1.5 block text-xs font-medium text-slate-600">在籍状態</label>
            <select id="status" name="status" defaultValue={filters.status ?? ""} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="">すべて</option>
              <option value="active">在籍</option>
              <option value="leave">休職</option>
              <option value="retired">退職</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 active:bg-blue-950">絞り込む</button>
            <Link href="/master/employees" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50">クリア</Link>
          </div>
        </div>
      </form>

      <div className="mb-4 flex items-center justify-end">
        <Link href="/master/employees/new" className="rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 active:bg-blue-950">
          ＋ 新規従業員を登録
        </Link>
      </div>

      {totalCount === 0 ? (
        <EmptyState message="登録されている従業員がいません。「＋ 新規従業員を登録」から登録してください。" />
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">該当従業員 {totalCount}件中 {(page - 1) * PAGE_SIZE + 1}〜{Math.min(page * PAGE_SIZE, totalCount)}件を表示</p>
            <p className="text-xs text-slate-400">{page} / {totalPages} ページ</p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">
                  <th className="whitespace-nowrap px-4 py-3">社員コード</th>
                  <th className="whitespace-nowrap px-4 py-3">氏名</th>
                  <th className="whitespace-nowrap px-4 py-3">会社</th>
                  <th className="whitespace-nowrap px-4 py-3">雇用区分</th>
                  <th className="whitespace-nowrap px-4 py-3">入社日</th>
                  <th className="whitespace-nowrap px-4 py-3">状態</th>
                  <th className="whitespace-nowrap px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.map((employee, idx) => {
                  const badge = STATUS_BADGE[employee.status] ?? STATUS_BADGE.retired;
                  const isActive = employee.status === "active";
                  const nextStatus = isActive ? "retired" : "active";
                  const company = oneOf(employee.companies);
                  return (
                    <tr key={employee.id} className={`transition-colors hover:bg-blue-50/50 ${idx % 2 === 1 ? "bg-slate-50/50" : ""}`}>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{employee.employee_code}</td>
                      <td className="px-4 py-3">
                        <Link href={`/master/employees/${employee.id}`} className="font-medium text-blue-700 hover:text-blue-900 hover:underline">{employee.full_name}</Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{company?.name ?? "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{employee.employment_type ?? "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{employee.hired_on ?? "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${badge.className}`}>{badge.label}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <form action={toggleEmployeeStatus}>
                          <input type="hidden" name="employee_id" value={employee.id} />
                          <input type="hidden" name="next_status" value={nextStatus} />
                          <SubmitButton
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${isActive ? "border-red-200 bg-white text-red-700 hover:bg-red-50" : "border-green-200 bg-white text-green-700 hover:bg-green-50"}`}
                            pendingText="処理中..."
                          >
                            {isActive ? "退職にする" : "在籍にする"}
                          </SubmitButton>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <nav className="mt-5 flex flex-wrap items-center justify-center gap-1.5" aria-label="ページ">
              <Link href={`/master/employees${buildQuery({ ...currentParams, page: String(Math.max(1, page - 1)) })}`} aria-disabled={page === 1} className={`rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${page === 1 ? "pointer-events-none border-slate-200 bg-slate-50 text-slate-300" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}>前へ</Link>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link key={p} href={`/master/employees${buildQuery({ ...currentParams, page: String(p) })}`} aria-current={p === page ? "page" : undefined} className={`rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${p === page ? "border-blue-800 bg-blue-800 text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}>{p}</Link>
              ))}
              <Link href={`/master/employees${buildQuery({ ...currentParams, page: String(Math.min(totalPages, page + 1)) })}`} aria-disabled={page === totalPages} className={`rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${page === totalPages ? "pointer-events-none border-slate-200 bg-slate-50 text-slate-300" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}>次へ</Link>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
