import Link from "next/link";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { signOut } from "@/app/login/actions";

const SYSTEM_LABELS: Record<string, string> = {
  haccp: "HACCP管理",
  ordering: "販促物受発注",
  recipe: "レシピ閲覧",
};

// 店舗スコープを持たないロール向けのラベル(company_admin/area_adminは会社・エリア単位のスコープを
// 別途持つが、いずれも特定の店舗には紐付かないため、店舗紐付け前提のヘッダー表示を分岐する)
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
      <div className="p-8 text-sm text-slate-500">
        セッションを確認できませんでした。再度ログインしてください。
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-6">
      <header className="mb-6 flex items-start justify-between">
        <div>
          {ctx.store ? (
            <>
              <p className="text-xs text-slate-500">
                {ctx.company?.name ?? "会社未設定"}
                {ctx.area ? ` ／ ${ctx.area.name}` : ""}
              </p>
              <h1 className="text-lg font-bold text-slate-900">
                {ctx.store.name}（{ctx.store.storeCode}）
              </h1>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                {NO_STORE_ROLE_LABELS[ctx.roleCode ?? ""]?.badge ?? "管理者アカウント"}
              </p>
              <h1 className="text-lg font-bold text-slate-900">
                {NO_STORE_ROLE_LABELS[ctx.roleCode ?? ""]?.heading ?? "店舗スコープなし"}
              </h1>
            </>
          )}
          <p className="mt-1 text-xs text-slate-400">{ctx.displayName} さん</p>
        </div>
        <form action={signOut}>
          <button className="text-xs text-slate-500 underline">ログアウト</button>
        </form>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3">
        <Link
          href="/notices"
          className="relative rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300"
        >
          <p className="text-sm font-semibold text-slate-800">お知らせ</p>
          {ctx.unreadNoticeCount > 0 && (
            <span className="absolute right-3 top-3 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
              {ctx.unreadNoticeCount}
            </span>
          )}
        </Link>
        <Link
          href="/manuals"
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300"
        >
          <p className="text-sm font-semibold text-slate-800">マニュアル</p>
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Object.entries(SYSTEM_LABELS).map(([code, label]) => {
          const sys = ctx.systems.find((s) => s.code === code);
          const disabled = !sys || sys.status !== "active" || !sys.base_url;
          const reason = !sys
            ? "未設定"
            : sys.status !== "active"
              ? "停止中"
              : !sys.base_url
                ? "URL未設定"
                : "";

          return disabled ? (
            <div
              key={code}
              className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 p-4 text-center opacity-60"
            >
              <p className="text-sm font-semibold text-slate-500">{label}</p>
              <p className="mt-1 text-xs text-slate-400">{reason}</p>
            </div>
          ) : (
            <a
              key={code}
              href={sys!.base_url!}
              className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm hover:border-blue-300"
            >
              <p className="text-sm font-semibold text-slate-800">{label}</p>
            </a>
          );
        })}
      </section>
    </div>
  );
}
