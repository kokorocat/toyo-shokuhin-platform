// 店舗・従業員マスター管理ダッシュボード。会社・店舗・従業員・ユーザー権限の各管理画面への入口。
// 集計はすべて独立クエリのためPromise.allで並列化する(このコードベースの規約 —
// src/app/ordering/admin/page.tsx 参照)。
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { PageHeader } from "@/components/PageHeader";
import { isMasterAdminRole, isSuperAdminRole } from "./guard";

const SLATE = "bg-slate-100 text-slate-500";
const GREEN = "bg-green-100 text-green-700";

function StatCard({ label, value, badge }: { label: string; value: string; badge: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${badge}`}>
        {label}
      </span>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function AdminNavCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50"
    >
      <div>
        <p className="text-base font-bold text-slate-900">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      <svg
        className="h-5 w-5 shrink-0 text-slate-400 transition-colors group-hover:text-blue-700"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
      </svg>
    </Link>
  );
}

function DisabledNavCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex cursor-not-allowed items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-5 py-5 opacity-50">
      <div>
        <p className="text-base font-bold text-slate-500">{title}</p>
        <p className="mt-1 text-xs text-slate-400">{description}</p>
      </div>
    </div>
  );
}

export default async function MasterAdminDashboardPage() {
  const ctx = await getPortalContext();

  if (!isMasterAdminRole(ctx?.roleCode ?? null)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">
          権限がありません。管理者アカウントで再度ログインしてください。
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  const [companiesCount, storesCount, employeesCount, inactiveStoresCount] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("stores").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("stores").select("id", { count: "exact", head: true }).neq("status", "active"),
  ]);

  const isSuperAdmin = isSuperAdminRole(ctx?.roleCode ?? null);

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6">
      <PageHeader
        backHref="/"
        backLabel="ポータルTOPに戻る"
        title="店舗・従業員マスター管理"
        subtitle="会社・店舗・従業員・ユーザー権限の管理"
      />

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">概況</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 px-5 py-5 sm:grid-cols-4">
          <StatCard label="稼働中の会社" value={`${companiesCount.count ?? 0}件`} badge={GREEN} />
          <StatCard label="稼働中の店舗" value={`${storesCount.count ?? 0}件`} badge={GREEN} />
          <StatCard label="稼働中の従業員" value={`${employeesCount.count ?? 0}件`} badge={GREEN} />
          <StatCard label="非稼働の店舗" value={`${inactiveStoresCount.count ?? 0}件`} badge={SLATE} />
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {isSuperAdmin ? (
          <AdminNavCard
            href="/master/companies"
            title="会社管理"
            description="会社の新規作成・稼働状況の切り替えを行います"
          />
        ) : (
          <DisabledNavCard title="会社管理" description="全権限管理者のみ利用できます" />
        )}
        <AdminNavCard
          href="/master/stores"
          title="店舗管理"
          description="店舗の新規作成・編集、ブロック・エリアの管理を行います"
        />
        <AdminNavCard
          href="/master/employees"
          title="従業員管理"
          description="従業員の新規登録・編集、店舗への配属を行います"
        />
        <AdminNavCard
          href="/master/users"
          title="ユーザー・権限管理"
          description="アカウントの発行、ロール・アクセス範囲の付与/取り消しを行います"
        />
      </div>
    </div>
  );
}
