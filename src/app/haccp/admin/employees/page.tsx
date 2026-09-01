import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isHaccpAdminRole } from "@/app/haccp/admin/guard";
import { EmptyState } from "@/components/EmptyState";
import { HaccpAdminChrome, HaccpAdminTabs, HaccpKpiRow } from "../HaccpAdminChrome";
import { getScopedStores } from "@/lib/haccp/admin-dashboard";

type SearchParams = { q?: string; status?: string; limit?: string };

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20";
const LABEL_CLASS = "mb-1 block text-xs font-medium text-slate-600";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  active: { label: "在籍", className: "font-bold text-green-700" },
  leave: { label: "休職", className: "font-bold text-amber-700" },
  retired: { label: "退職", className: "font-bold text-slate-500" },
};

type EmployeeRow = {
  id: string;
  employee_code: string;
  full_name: string;
  status: string;
  hired_on: string | null;
  companies: { name: string } | { name: string }[] | null;
  employee_assignments:
    | {
        ended_on: string | null;
        stores: { name: string } | { name: string }[] | null;
      }[]
    | null;
};

function oneOf<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function HaccpAdminEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const ctx = await getPortalContext();

  if (!isHaccpAdminRole(ctx?.roleCode ?? null)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">権限がありません。管理者アカウントで再度ログインしてください。</p>
      </div>
    );
  }

  const q = (params.q ?? "").trim();
  const statusFilter = params.status ?? "all";
  const limitRaw = Number(params.limit);
  const displayLimit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : 50;

  const supabase = await createClient();
  const [{ data: employeesRaw }, stores, { count: employeeCount }, { data: authUser }] = await Promise.all([
    supabase
      .from("employees")
      .select("id, employee_code, full_name, status, hired_on, companies(name), employee_assignments(ended_on, stores(name))")
      .order("employee_code")
      .limit(500),
    getScopedStores(supabase, {}),
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.auth.getUser(),
  ]);

  const employees = ((employeesRaw ?? []) as EmployeeRow[]).filter((row) => {
    if (statusFilter !== "all" && row.status !== statusFilter) return false;
    if (!q) return true;
    const companyName = oneOf(row.companies)?.name ?? "";
    const storeName =
      (row.employee_assignments ?? [])
        .filter((a) => !a.ended_on)
        .map((a) => oneOf(a.stores)?.name ?? "")
        .join(" ") ?? "";
    return (
      row.employee_code.includes(q) ||
      row.full_name.includes(q) ||
      companyName.includes(q) ||
      storeName.includes(q)
    );
  });

  return (
    <HaccpAdminChrome
      title="HACCP管理者ダッシュボード"
      subtitle="店舗・従業員の登録／状態変更、HACCP回答状況の確認"
      activePath="/haccp/admin/employees"
    >
      <HaccpKpiRow
        storeCount={stores.length}
        employeeCount={employeeCount ?? "-"}
        needsCheck={0}
        loginLabel={authUser.user?.email ?? ctx?.displayName ?? "-"}
      />
      <HaccpAdminTabs activePath="/haccp/admin/employees" />

      <h2 className="mt-6 text-lg font-bold text-teal-800">従業員管理</h2>
      <div className="mt-3 rounded-lg border-l-4 border-teal-600 bg-teal-50 px-4 py-3 text-sm text-teal-900">
        退職者は完全削除せず「退職」ステータスに変更し、過去の衛生記録を残します。
      </div>
      <div className="mt-3">
        <Link href="/master/employees/new" className="inline-block rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white">
          ＋ 新規従業員追加
        </Link>
        {/* 要確認: 保存処理は /master/employees 側。ここは導線のみ。 */}
      </div>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-2">
        <div className="min-w-[16rem] flex-1">
          <label htmlFor="q" className={LABEL_CLASS}>従業員検索</label>
          <input id="q" name="q" type="text" defaultValue={q} placeholder="社員コード・氏名・店舗名で検索" className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="status" className={LABEL_CLASS}>状態</label>
          <select id="status" name="status" defaultValue={statusFilter} className={INPUT_CLASS}>
            <option value="all">すべて</option>
            <option value="active">在籍</option>
            <option value="leave">休職</option>
            <option value="retired">退職</option>
          </select>
        </div>
        <div>
          <label htmlFor="limit" className={LABEL_CLASS}>表示件数</label>
          <select id="limit" name="limit" defaultValue={String(displayLimit)} className={INPUT_CLASS}>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
        <button type="submit" className="rounded-lg border border-teal-600 px-4 py-2 text-sm font-bold text-teal-700">
          再表示
        </button>
      </form>

      {employees.length === 0 ? (
        <div className="mt-4">
          <EmptyState message="該当する従業員がありません。" />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-teal-100 bg-white">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="bg-teal-50 text-xs font-bold text-teal-800">
                <th className="px-3 py-2">社員コード</th>
                <th className="px-3 py-2">氏名</th>
                <th className="px-3 py-2">会社</th>
                <th className="px-3 py-2">店舗</th>
                <th className="px-3 py-2">状態</th>
                <th className="px-3 py-2">入社日</th>
                <th className="px-3 py-2">備考</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {employees.slice(0, displayLimit).map((row) => {
                const storeName =
                  (row.employee_assignments ?? [])
                    .filter((a) => !a.ended_on)
                    .map((a) => oneOf(a.stores)?.name)
                    .filter(Boolean)
                    .join("、") || "-";
                const st = STATUS_LABEL[row.status] ?? { label: row.status, className: "text-slate-600" };
                return (
                  <tr key={row.id} className="border-t border-teal-50">
                    <td className="px-3 py-2">{row.employee_code}</td>
                    <td className="px-3 py-2 font-medium">{row.full_name}</td>
                    <td className="px-3 py-2">{oneOf(row.companies)?.name ?? "-"}</td>
                    <td className="px-3 py-2">{storeName}</td>
                    <td className={`px-3 py-2 ${st.className}`}>{st.label}</td>
                    <td className="px-3 py-2">{row.hired_on ?? "-"}</td>
                    <td className="px-3 py-2">-</td>
                    <td className="px-3 py-2">
                      <Link href={`/master/employees/${row.id}`} className="mr-1 rounded-md bg-teal-600 px-2 py-1 text-xs font-bold text-white">
                        編集
                      </Link>
                      <span className="mr-1 rounded-md bg-orange-500 px-2 py-1 text-xs font-bold text-white">異動</span>
                      <span className="rounded-md bg-red-600 px-2 py-1 text-xs font-bold text-white">退職</span>
                      {/* 要確認: 異動・退職の保存処理は未接続。既存マスター画面の配属・状態切替を利用する想定。 */}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </HaccpAdminChrome>
  );
}
