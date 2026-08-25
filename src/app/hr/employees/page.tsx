// HR-EMP-10 社員一覧(仕様書1.1「本番化の基本原則」: 「社員」という表示上の単位と、
// 人物(hr_persons)・入社履歴(hr_employments)を分離する構造/3社分離の徹底/履歴管理)。
// hr_employmentsを主軸に、人物(hr_persons)・共通マスター社員(employees)・会社(companies)を
// 結合し、1雇用履歴=1行として一覧表示する。再入社等で同一人物に複数の雇用履歴がある場合は
// 人物レコードを複製せずそれぞれ別の雇用履歴行として表示されるため、この一覧はそのまま
// 「人物 / 雇用履歴」分離構造の一覧表示になる。
// 会社・社員マスターは複製せず既存の共通マスター(public.employees/public.companies)を参照する
// (仕様書「広域ポータル・店舗従業員マスターの上に構築する」原則)。
// RLSで3社分離・スコープ外データの除外は保証済み(private.user_company_ids() / is_hr_admin())。
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isHrAdminRole } from "../guard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

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

const SELECT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const LABEL_CLASS = "mb-1.5 block text-xs font-medium text-slate-600";
const BADGE_CLASS = "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold";
const GREEN = "bg-green-100 text-green-700";
const SLATE = "bg-slate-100 text-slate-500";

type CompanyOption = { id: string; name: string };

type EmploymentListRow = {
  id: string;
  hired_on: string;
  retired_on: string | null;
  employment_category: string | null;
  hr_persons: { id: string; full_name: string } | null;
  employees: {
    id: string;
    employee_code: string;
    company_id: string;
    companies: { id: string; name: string } | null;
  } | null;
};

type Filters = {
  companyId?: string;
  name?: string;
  employmentCategory?: string;
  status?: string; // "active"(在籍) | "retired"(退職) | undefined(すべて)
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchCompanyOptions(supabase: any): Promise<CompanyOption[]> {
  const { data } = await supabase
    .from("companies")
    .select("id, name")
    .eq("status", "active")
    .order("name");
  return data ?? [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchEmployments(supabase: any, filters: Filters): Promise<EmploymentListRow[]> {
  // hr_employmentsから見てhr_persons/employeesはどちらも必須(NOT NULL)の親であり、各雇用履歴に
  // 必ず1件ずつ対応するため、!innerで結合しても該当行が失われることはない。!innerを付けることで
  // 埋め込みテーブルの列(氏名・会社)を条件に雇用履歴側の行を絞り込めるようになる
  // (PostgRESTの仕様上、埋め込み先の列で親行をフィルタするには!innerが必須)。
  let query = supabase
    .from("hr_employments")
    .select(
      "id, hired_on, retired_on, employment_category, hr_persons!inner(id, full_name), employees!inner(id, employee_code, company_id, companies(id, name))"
    );

  if (filters.companyId) query = query.eq("employees.company_id", filters.companyId);
  if (filters.name) query = query.ilike("hr_persons.full_name", `%${filters.name}%`);
  if (filters.employmentCategory) {
    query = query.ilike("employment_category", `%${filters.employmentCategory}%`);
  }
  if (filters.status === "active") query = query.is("retired_on", null);
  if (filters.status === "retired") query = query.not("retired_on", "is", null);

  query = query.order("hired_on", { ascending: false });

  const { data, error } = await query;
  if (error) {
    // RLSスコープ外の絞り込み等でエラーになっても画面をクラッシュさせず空一覧として扱う。
    console.error("[hr/employees] fetchEmployments failed:", error);
    return [];
  }
  return (data ?? []) as EmploymentListRow[];
}

function categoryBadge(category: string | null): { label: string; className: string } {
  if (!category) return { label: "未設定", className: SLATE };
  return { label: category, className: category.includes("正社員") ? GREEN : SLATE };
}

function statusBadge(retiredOn: string | null): { label: string; className: string } {
  return retiredOn ? { label: "退職", className: SLATE } : { label: "在籍", className: GREEN };
}

export default async function HrEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const ctx = await getPortalContext();

  if (!isHrAdminRole(ctx?.roleCode ?? null)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">
          権限がありません。管理者アカウントで再度ログインしてください。
        </p>
      </div>
    );
  }

  const filters: Filters = {
    companyId: first(sp.companyId),
    name: first(sp.name),
    employmentCategory: first(sp.employmentCategory),
    status: first(sp.status),
  };

  const supabase = await createClient();

  const [employments, companyOptions] = await Promise.all([
    fetchEmployments(supabase, filters),
    fetchCompanyOptions(supabase),
  ]);

  const totalCount = employments.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const rawPageNum = Number(first(sp.page));
  const page =
    Number.isFinite(rawPageNum) && rawPageNum >= 1 ? Math.min(Math.floor(rawPageNum), totalPages) : 1;
  const pageRows = employments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ページングリンクで引き継ぐ現在の検索条件。
  const currentParams: Record<string, string | undefined> = {
    companyId: filters.companyId,
    name: filters.name,
    employmentCategory: filters.employmentCategory,
    status: filters.status,
  };

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6">
      <PageHeader
        backHref="/"
        backLabel="ポータルTOPに戻る"
        title="社員一覧"
        subtitle="登録されている社員の雇用履歴の一覧です。氏名をクリックすると詳細を確認できます。"
      />

      {/* 絞り込みフォーム(GETリクエストでこの画面へ自己遷移) */}
      <form
        method="get"
        action="/hr/employees"
        className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">絞り込み条件</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="companyId" className={LABEL_CLASS}>
              会社
            </label>
            <select id="companyId" name="companyId" defaultValue={filters.companyId ?? ""} className={SELECT_CLASS}>
              <option value="">すべて</option>
              {companyOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="name" className={LABEL_CLASS}>
              氏名
            </label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={filters.name ?? ""}
              placeholder="部分一致"
              className={SELECT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="employmentCategory" className={LABEL_CLASS}>
              雇用区分
            </label>
            <input
              id="employmentCategory"
              name="employmentCategory"
              type="text"
              defaultValue={filters.employmentCategory ?? ""}
              placeholder="部分一致(例: 正社員)"
              className={SELECT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="status" className={LABEL_CLASS}>
              在籍状態
            </label>
            <select id="status" name="status" defaultValue={filters.status ?? ""} className={SELECT_CLASS}>
              <option value="">すべて</option>
              <option value="active">在籍</option>
              <option value="retired">退職</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 active:bg-blue-950"
            >
              絞り込む
            </button>
            <Link
              href="/hr/employees"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
            >
              クリア
            </Link>
          </div>
        </div>
      </form>

      {totalCount === 0 ? (
        <EmptyState message="該当する社員がいません。" />
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              該当社員 {totalCount}件中 {(page - 1) * PAGE_SIZE + 1}〜
              {Math.min(page * PAGE_SIZE, totalCount)}件を表示
            </p>
            <p className="text-xs text-slate-400">
              {page} / {totalPages} ページ
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">
                  <th className="whitespace-nowrap px-4 py-3">社員番号</th>
                  <th className="whitespace-nowrap px-4 py-3">氏名</th>
                  <th className="whitespace-nowrap px-4 py-3">会社</th>
                  <th className="whitespace-nowrap px-4 py-3">雇用区分</th>
                  <th className="whitespace-nowrap px-4 py-3">入社日</th>
                  <th className="whitespace-nowrap px-4 py-3">状態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.map((row, idx) => {
                  const cat = categoryBadge(row.employment_category);
                  const st = statusBadge(row.retired_on);
                  const person = row.hr_persons;
                  const employee = row.employees;
                  return (
                    <tr key={row.id} className={`transition-colors hover:bg-blue-50/50 ${idx % 2 === 1 ? "bg-slate-50/50" : ""}`}>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {employee?.employee_code ?? "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {person ? (
                          <Link
                            href={`/hr/employees/${person.id}`}
                            className="font-medium text-blue-700 hover:text-blue-900 hover:underline"
                          >
                            {person.full_name}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {employee?.companies?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`${BADGE_CLASS} ${cat.className}`}>{cat.label}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.hired_on}</td>
                      <td className="px-4 py-3">
                        <span className={`${BADGE_CLASS} ${st.className}`}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav className="mt-5 flex flex-wrap items-center justify-center gap-1.5" aria-label="ページ">
              <Link
                href={`/hr/employees${buildQuery({ ...currentParams, page: String(Math.max(1, page - 1)) })}`}
                aria-disabled={page === 1}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
                  page === 1
                    ? "pointer-events-none border-slate-200 bg-slate-50 text-slate-300"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                前へ
              </Link>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/hr/employees${buildQuery({ ...currentParams, page: String(p) })}`}
                  aria-current={p === page ? "page" : undefined}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
                    p === page
                      ? "border-blue-800 bg-blue-800 text-white"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </Link>
              ))}
              <Link
                href={`/hr/employees${buildQuery({ ...currentParams, page: String(Math.min(totalPages, page + 1)) })}`}
                aria-disabled={page === totalPages}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
                  page === totalPages
                    ? "pointer-events-none border-slate-200 bg-slate-50 text-slate-300"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                次へ
              </Link>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
