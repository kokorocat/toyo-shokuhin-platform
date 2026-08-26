// 会社一覧。新規作成・稼働状態の切り替えを行う起点画面。全権限管理者専用
// (会社そのものの追加・停止は影響範囲が大きいため、company_adminには開放しない)。
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isSuperAdminRole } from "@/app/master/guard";
import { toggleCompanyStatus } from "./actions";
import { Banner } from "@/components/Banner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { SubmitButton } from "@/components/SubmitButton";
import { AccessDenied } from "@/components/AccessDenied";

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  const value = Array.isArray(v) ? v[0] : v;
  return value && value.length > 0 ? value : undefined;
}

type CompanyRow = {
  id: string;
  company_code: string;
  name: string;
  status: string;
};

export default async function MasterCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const ctx = await getPortalContext();

  if (!isSuperAdminRole(ctx?.roleCode ?? null)) {
    return <AccessDenied message="この画面を表示する権限がありません。全権限管理者のアカウントで再ログインしてください。" />;
  }

  const errorMessage = first(sp.error);
  const successMessage = first(sp.success);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id, company_code, name, status")
    .order("company_code");

  const companies = (data ?? []) as CompanyRow[];

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6">
      <PageHeader
        backHref="/master"
        backLabel="マスター管理に戻る"
        title="会社一覧"
        subtitle="会社の新規作成・稼働状況の切り替え"
      />

      {successMessage && (
        <div className="mb-4">
          <Banner variant="success">保存しました。</Banner>
        </div>
      )}
      {errorMessage && (
        <div className="mb-4">
          <Banner variant="error">{errorMessage}</Banner>
        </div>
      )}
      {error && (
        <div className="mb-4">
          <Banner variant="error">会社の取得に失敗しました: {error.message}</Banner>
        </div>
      )}

      <div className="mb-4 flex items-center justify-end">
        <Link
          href="/master/companies/new"
          className="rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 active:bg-blue-950"
        >
          ＋ 新規会社を追加
        </Link>
      </div>

      {companies.length === 0 ? (
        <EmptyState message="登録されている会社がありません。「＋ 新規会社を追加」から会社を登録してください。" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">
                <th className="whitespace-nowrap px-4 py-3">会社コード</th>
                <th className="whitespace-nowrap px-4 py-3">会社名</th>
                <th className="whitespace-nowrap px-4 py-3">状態</th>
                <th className="whitespace-nowrap px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map((company, idx) => {
                const isActive = company.status === "active";
                const nextStatus = isActive ? "inactive" : "active";
                return (
                  <tr key={company.id} className={`transition-colors hover:bg-blue-50/50 ${idx % 2 === 1 ? "bg-slate-50/50" : ""}`}>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{company.company_code}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/master/companies/${company.id}`}
                        className="font-medium text-blue-700 hover:text-blue-900 hover:underline"
                      >
                        {company.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${
                          isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {isActive ? "稼働中" : "停止中"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <form action={toggleCompanyStatus}>
                        <input type="hidden" name="company_id" value={company.id} />
                        <input type="hidden" name="next_status" value={nextStatus} />
                        <SubmitButton
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
                            isActive
                              ? "border-red-200 bg-white text-red-700 hover:bg-red-50"
                              : "border-green-200 bg-white text-green-700 hover:bg-green-50"
                          }`}
                          pendingText="処理中..."
                        >
                          {isActive ? "停止する" : "再稼働する"}
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
