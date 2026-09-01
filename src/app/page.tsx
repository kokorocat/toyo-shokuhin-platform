import Link from "next/link";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { signOut } from "@/app/login/actions";
import { isHaccpAdminRole } from "@/app/haccp/admin/guard";
import { isHrAdminRole } from "@/app/hr/guard";
import { isOrderingAdminRole } from "@/app/ordering/admin/guard";
import { isMasterAdminRole } from "@/app/master/guard";

const NO_STORE_ROLE_LABELS: Record<string, { badge: string; heading: string }> = {
  super_admin: { badge: "全権限管理者", heading: "全社・全エリア管理権限" },
  company_admin: { badge: "会社管理者", heading: "会社全体の管理権限" },
  area_admin: { badge: "エリア管理者", heading: "エリア内の管理権限" },
  system_maintenance: { badge: "システム保守", heading: "システム保守アカウント" },
};

export default async function PortalHomePage() {
  const ctx = await getPortalContext();

  if (!ctx) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="text-center">
          <p className="text-sm text-slate-500">
            セッションを確認できませんでした。再度ログインしてください。
          </p>
        </div>
      </div>
    );
  }

  const haccpSys = ctx.systems.find((s) => s.code === "haccp");
  const haccpHref = ctx.store ? "/haccp" : isHaccpAdminRole(ctx.roleCode) ? "/haccp/admin" : null;
  const haccpDisabled = !haccpSys || haccpSys.status !== "active" || !haccpHref;

  const orderingSys = ctx.systems.find((s) => s.code === "ordering");
  const orderingHref = ctx.store ? "/ordering" : isOrderingAdminRole(ctx.roleCode) ? "/ordering/admin" : null;
  const orderingDisabled = !orderingSys || orderingSys.status !== "active" || !orderingHref;

  const recipeSys = ctx.systems.find((s) => s.code === "recipe");
  const recipeDisabled = !recipeSys || recipeSys.status !== "active";

  const hrSys = ctx.systems.find((s) => s.code === "hr");
  const hrHref = isHrAdminRole(ctx.roleCode) ? "/hr" : null;
  const hrDisabled = !hrSys || hrSys.status !== "active" || !hrHref;

  const masterSys = ctx.systems.find((s) => s.code === "store_master");
  const masterHref = isMasterAdminRole(ctx.roleCode) ? "/master" : null;
  const masterDisabled = !masterSys || masterSys.status !== "active" || !masterHref;

  const noticesHref = !ctx.store && isMasterAdminRole(ctx.roleCode) ? "/notices/admin" : "/notices";

  return (
    <div className="min-h-screen">
      {/* GAS-style gradient header band */}
      <header className="bg-gradient-to-r from-teal-700 via-teal-600 to-green-600 px-4 py-4 text-white shadow-md sm:px-6">
        <div className="mx-auto flex max-w-5xl items-start justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              東洋食品｜広域システム
            </h1>
            {ctx.store ? (
              <p className="mt-0.5 text-sm text-white/80">
                {ctx.company?.name ?? ""}{ctx.area ? ` ／ ${ctx.area.name}` : ""} ／ {ctx.store.name}（{ctx.store.storeCode}）
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-white/80">
                {NO_STORE_ROLE_LABELS[ctx.roleCode ?? ""]?.badge ?? "管理者"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-white/70 sm:block">{ctx.displayName}</span>
            <form action={signOut}>
              <button className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white">
                ログアウト
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Context info */}
        <h2 className="mb-4 text-lg font-bold text-slate-800">
          {ctx.store ? `${ctx.store.name} メニュー` : (NO_STORE_ROLE_LABELS[ctx.roleCode ?? ""]?.heading ?? "管理者メニュー")}
        </h2>

        {/* Notices / Manuals — GAS-style teal gradient card */}
        <Link
          href={noticesHref}
          className="group relative mb-4 flex items-center justify-between overflow-hidden rounded-xl bg-gradient-to-r from-slate-700 to-slate-600 px-5 py-4 text-white shadow-md transition-shadow hover:shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
            </div>
            <div>
              <p className="font-bold">お知らせ／マニュアル管理</p>
              <p className="text-sm text-white/70">お知らせ配信とPDFマニュアルをまとめて登録・編集・公開</p>
            </div>
          </div>
          {ctx.unreadNoticeCount > 0 && (
            <span className="mr-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
              {ctx.unreadNoticeCount}
            </span>
          )}
          <svg className="h-5 w-5 shrink-0 text-white/50 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </Link>

        {/* System cards — GAS-style vibrant gradient cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* HACCP */}
          {haccpDisabled ? (
            <div className="flex cursor-not-allowed items-center gap-3 rounded-xl bg-slate-200 p-5 opacity-50">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/60 text-slate-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
              </div>
              <p className="font-bold text-slate-500">HACCP管理</p>
            </div>
          ) : (
            <Link
              href={haccpHref!}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 p-5 text-white shadow-md transition-all hover:shadow-lg hover:brightness-105"
            >
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
              <div className="relative">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 shadow-sm">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
                </div>
                <p className="text-lg font-bold">HACCP管理</p>
                <p className="mt-1 text-sm text-white/70">{ctx.store ? "店舗側の衛生チェック入力" : "管理者用画面へ進む"}</p>
              </div>
            </Link>
          )}

          {/* Ordering */}
          {orderingDisabled ? (
            <div className="flex cursor-not-allowed items-center gap-3 rounded-xl bg-slate-200 p-5 opacity-50">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/60 text-slate-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></svg>
              </div>
              <p className="font-bold text-slate-500">販促物受発注</p>
            </div>
          ) : (
            <Link
              href={orderingHref!}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white shadow-md transition-all hover:shadow-lg hover:brightness-105"
            >
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
              <div className="relative">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 shadow-sm">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></svg>
                </div>
                <p className="text-lg font-bold">販促物受発注</p>
                <p className="mt-1 text-sm text-white/70">{ctx.store ? "商品を注文する" : "管理者用画面へ進む"}</p>
              </div>
            </Link>
          )}

          {/* Recipe */}
          {recipeDisabled ? (
            <div className="flex cursor-not-allowed items-center gap-3 rounded-xl bg-slate-200 p-5 opacity-50">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/60 text-slate-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>
              </div>
              <p className="font-bold text-slate-500">レシピ閲覧</p>
            </div>
          ) : (
            <Link
              href="/recipe"
              className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 p-5 text-white shadow-md transition-all hover:shadow-lg hover:brightness-105"
            >
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
              <div className="relative">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 shadow-sm">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>
                </div>
                <p className="text-lg font-bold">レシピ閲覧</p>
                <p className="mt-1 text-sm text-white/70">レシピ閲覧システムへ進む</p>
              </div>
            </Link>
          )}
        </div>

        <h3 className="mt-8 mb-3 border-t border-slate-200 pt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">
          ポータル追加メニュー（GAS版TOPには無い現行機能）
        </h3>
        {/* Secondary links */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* HR */}
          {!hrDisabled && (
            <Link
              href={hrHref!}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800">人事労務管理</p>
              </div>
              <svg className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </Link>
          )}

          {/* Master */}
          {!masterDisabled && (
            <Link
              href={masterHref!}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" /></svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800">店舗・従業員マスター</p>
              </div>
              <svg className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </Link>
          )}

          {/* Manuals */}
          <Link
            href="/manuals"
            className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800">マニュアル</p>
            </div>
            <svg className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </Link>
        </div>

        <p className="mt-8 text-xs text-slate-500">
          店舗利用は、各店舗に配布している固定URLからアクセスしてください。例：/exec?storeId=…
        </p>
      </main>
    </div>
  );
}
