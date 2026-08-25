import Link from "next/link";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { signOut } from "@/app/login/actions";
import { isHaccpAdminRole } from "@/app/haccp/admin/guard";
import { isHrAdminRole } from "@/app/hr/guard";
import { isOrderingAdminRole } from "@/app/ordering/admin/guard";

const SYSTEM_LABELS: Record<string, string> = {
  ordering: "販促物受発注",
  recipe: "レシピ閲覧",
};

const SYSTEM_ICONS: Record<string, React.ReactNode> = {
  ordering: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
    </svg>
  ),
  recipe: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  hr: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  ),
};

const NO_STORE_ROLE_LABELS: Record<string, { badge: string; heading: string }> = {
  super_admin: { badge: "全権限管理者アカウント", heading: "店舗スコープなし(全社・全エリア管理権限)" },
  company_admin: { badge: "会社管理者アカウント", heading: "店舗スコープなし(会社全体の管理権限)" },
  area_admin: { badge: "エリア管理者アカウント", heading: "店舗スコープなし(エリア内の管理権限)" },
  system_maintenance: { badge: "システム保守アカウント", heading: "店舗スコープなし" },
};

export default async function PortalHomePage() {
  const ctx = await getPortalContext();

  if (!ctx) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">
          セッションを確認できませんでした。再度ログインしてください。
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-6">
      {/* Header */}
      <header className="mb-8 rounded-xl bg-gradient-to-r from-blue-800 to-blue-900 px-5 py-5 text-white shadow-lg sm:px-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            {ctx.store ? (
              <>
                <p className="text-xs text-blue-200">
                  {ctx.company?.name ?? "会社未設定"}
                  {ctx.area ? ` ／ ${ctx.area.name}` : ""}
                </p>
                <h1 className="mt-0.5 truncate text-lg font-bold tracking-tight">
                  {ctx.store.name}（{ctx.store.storeCode}）
                </h1>
              </>
            ) : (
              <>
                <p className="text-xs text-blue-200">
                  {NO_STORE_ROLE_LABELS[ctx.roleCode ?? ""]?.badge ?? "管理者アカウント"}
                </p>
                <h1 className="mt-0.5 text-lg font-bold tracking-tight">
                  {NO_STORE_ROLE_LABELS[ctx.roleCode ?? ""]?.heading ?? "店舗スコープなし"}
                </h1>
              </>
            )}
            <p className="mt-1.5 text-sm text-blue-200">{ctx.displayName} さん</p>
          </div>
          <form action={signOut}>
            <button className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20">
              ログアウト
            </button>
          </form>
        </div>
      </header>

      {/* Quick links */}
      <section className="mb-6 grid grid-cols-2 gap-3">
        <Link
          href="/notices"
          className="group relative flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-100">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-800">お知らせ</p>
          {ctx.unreadNoticeCount > 0 && (
            <span className="absolute right-3 top-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold tabular-nums text-white shadow-sm">
              {ctx.unreadNoticeCount}
            </span>
          )}
        </Link>
        <Link
          href="/manuals"
          className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-blue-50 group-hover:text-blue-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-800">マニュアル</p>
        </Link>
      </section>

      {/* System cards */}
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        業務システム
      </h2>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(() => {
          const haccpSys = ctx.systems.find((s) => s.code === "haccp");
          const haccpHref = ctx.store ? "/haccp" : isHaccpAdminRole(ctx.roleCode) ? "/haccp/admin" : null;
          const haccpDisabled = !haccpSys || haccpSys.status !== "active" || !haccpHref;
          const haccpReason = !haccpSys
            ? "未設定"
            : haccpSys.status !== "active"
              ? "停止中"
              : !haccpHref
                ? "店舗スコープが必要です"
                : "";

          return haccpDisabled ? (
            <div className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 opacity-50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">HACCP管理</p>
                <p className="text-xs text-slate-400">{haccpReason}</p>
              </div>
            </div>
          ) : (
            <Link
              href={haccpHref}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-green-300 hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700 transition-colors group-hover:bg-green-100">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-800">HACCP管理</p>
            </Link>
          );
        })()}
        {(() => {
          const orderingSys = ctx.systems.find((s) => s.code === "ordering");
          const orderingHref = ctx.store ? "/ordering" : isOrderingAdminRole(ctx.roleCode) ? "/ordering/admin" : null;
          const orderingDisabled = !orderingSys || orderingSys.status !== "active" || !orderingHref;
          const orderingReason = !orderingSys
            ? "未設定"
            : orderingSys.status !== "active"
              ? "停止中"
              : !orderingHref
                ? "店舗スコープが必要です"
                : "";

          return orderingDisabled ? (
            <div className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 opacity-50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-400">
                {SYSTEM_ICONS.ordering}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">{SYSTEM_LABELS.ordering}</p>
                <p className="text-xs text-slate-400">{orderingReason}</p>
              </div>
            </div>
          ) : (
            <Link
              href={orderingHref}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-100">
                {SYSTEM_ICONS.ordering}
              </div>
              <p className="text-sm font-semibold text-slate-800">{SYSTEM_LABELS.ordering}</p>
            </Link>
          );
        })()}
        {(() => {
          const recipeSys = ctx.systems.find((s) => s.code === "recipe");
          const recipeDisabled = !recipeSys || recipeSys.status !== "active";
          const recipeReason = !recipeSys ? "未設定" : recipeSys.status !== "active" ? "停止中" : "";

          return recipeDisabled ? (
            <div className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 opacity-50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-400">
                {SYSTEM_ICONS.recipe}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">{SYSTEM_LABELS.recipe}</p>
                <p className="text-xs text-slate-400">{recipeReason}</p>
              </div>
            </div>
          ) : (
            <Link
              href="/recipe"
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-100">
                {SYSTEM_ICONS.recipe}
              </div>
              <p className="text-sm font-semibold text-slate-800">{SYSTEM_LABELS.recipe}</p>
            </Link>
          );
        })()}
        {(() => {
          const hrSys = ctx.systems.find((s) => s.code === "hr");
          const hrHref = isHrAdminRole(ctx.roleCode) ? "/hr" : null;
          const hrDisabled = !hrSys || hrSys.status !== "active" || !hrHref;
          const hrReason = !hrSys
            ? "未設定"
            : hrSys.status !== "active"
              ? "停止中"
              : !hrHref
                ? "会社管理者以上の権限が必要です"
                : "";

          return hrDisabled ? (
            <div className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 opacity-50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-400">
                {SYSTEM_ICONS.hr}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">人事労務管理</p>
                <p className="text-xs text-slate-400">{hrReason}</p>
              </div>
            </div>
          ) : (
            <Link
              href={hrHref}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-100">
                {SYSTEM_ICONS.hr}
              </div>
              <p className="text-sm font-semibold text-slate-800">人事労務管理</p>
            </Link>
          );
        })()}
      </section>
    </div>
  );
}
