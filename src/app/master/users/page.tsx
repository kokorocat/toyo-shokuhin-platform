// /master/users: ユーザーへのロール・スコープ付与/取消。既存の検証済みRPC
// (grant_user_access_scope / revoke_user_access_scope, 20260826000003)をUIから呼び出す。
// アカウント自体の新規作成(auth.users行)はSupabaseダッシュボードでの事前作成が必要
// (SUPABASE_SERVICE_ROLE_KEY未設定のため、アプリ内での新規作成は別途対応が必要な既知の制約)。
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { createClient } from "@/lib/supabase/server";
import { isMasterAdminRole, isSuperAdminRole } from "@/app/master/guard";
import { Banner } from "@/components/Banner";
import { SubmitButton } from "@/components/SubmitButton";
import { AccessDenied } from "@/components/AccessDenied";
import { EmptyState } from "@/components/EmptyState";
import { todayInTokyo } from "@/lib/date";
import { grantScope, revokeScope } from "./actions";

const ROLE_LABELS: Record<string, string> = {
  store_user: "店舗利用者",
  store_manager: "店舗責任者",
  area_admin: "エリア管理者",
  company_admin: "会社管理者",
  super_admin: "全権限管理者",
  system_maintenance: "システム保守",
  auditor: "監査担当（閲覧のみ）",
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  store_user: "bg-slate-100 text-slate-600",
  store_manager: "bg-blue-100 text-blue-700",
  area_admin: "bg-amber-100 text-amber-700",
  company_admin: "bg-green-100 text-green-700",
  super_admin: "bg-red-100 text-red-700",
  system_maintenance: "bg-slate-800 text-white",
  auditor: "bg-purple-100 text-purple-700",
};

const ROLE_DOT_CLASS: Record<string, string> = {
  store_user: "bg-slate-400",
  store_manager: "bg-blue-500",
  area_admin: "bg-amber-500",
  company_admin: "bg-green-500",
  super_admin: "bg-red-500",
  system_maintenance: "bg-slate-800",
  auditor: "bg-purple-500",
};

const NON_SUPER_GRANTABLE_ROLES = ["store_user", "store_manager", "area_admin"];
const ALL_ROLES = ["store_user", "store_manager", "area_admin", "company_admin", "auditor", "super_admin", "system_maintenance"];

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const LABEL_CLASS = "mb-1.5 block text-xs font-semibold text-slate-600";

type CompanyOption = { id: string; name: string };
type AreaOption = { id: string; name: string; company_id: string };
type StoreOption = { id: string; name: string; store_code: string; company_id: string };

type ScopeRow = {
  id: string;
  started_on: string;
  ended_on: string | null;
  roles: { code: string } | { code: string }[] | null;
  companies: { name: string } | { name: string }[] | null;
  areas: { name: string } | { name: string }[] | null;
  stores: { name: string; store_code: string } | { name: string; store_code: string }[] | null;
  user_profiles: { id: string; display_name: string } | { id: string; display_name: string }[] | null;
};

function oneOf<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function MasterUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getPortalContext();

  if (!isMasterAdminRole(ctx?.roleCode ?? null)) {
    return <AccessDenied message="この画面を表示する権限がありません。管理者権限を持つアカウントで再ログインしてください。" />;
  }

  const isSuper = isSuperAdminRole(ctx?.roleCode ?? null);
  const grantableRoles = isSuper ? ALL_ROLES : NON_SUPER_GRANTABLE_ROLES;

  const supabase = await createClient();

  const [{ data: companies }, { data: areas }, { data: stores }, { data: scopeRows }] = await Promise.all([
    supabase.from("companies").select("id, name").eq("status", "active").order("name"),
    supabase.from("areas").select("id, name, company_id").eq("status", "active").order("name"),
    supabase.from("stores").select("id, name, store_code, company_id").eq("status", "active").order("store_code"),
    supabase
      .from("user_access_scopes")
      .select(
        "id, started_on, ended_on, roles(code), companies(name), areas(name), stores(name, store_code), user_profiles(id, display_name)"
      )
      .order("started_on", { ascending: false }),
  ]);

  const companyOptions = (companies ?? []) as CompanyOption[];
  const areaOptions = (areas ?? []) as AreaOption[];
  const storeOptions = (stores ?? []) as StoreOption[];
  const rows = (scopeRows ?? []) as ScopeRow[];

  const byUser = new Map<string, { displayName: string; scopes: ScopeRow[] }>();
  for (const row of rows) {
    const profile = oneOf(row.user_profiles);
    if (!profile) continue;
    if (!byUser.has(profile.id)) {
      byUser.set(profile.id, { displayName: profile.display_name, scopes: [] });
    }
    byUser.get(profile.id)!.scopes.push(row);
  }
  const userGroups = [...byUser.entries()].sort((a, b) => a[1].displayName.localeCompare(b[1].displayName, "ja"));

  return (
    <div className="min-h-screen">
      <header className="bg-slate-800 px-4 py-4 text-white shadow-md">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-lg font-bold">ユーザー・権限管理</h1>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6 pb-10">
      <div className="mb-4">
        <a href="/master" className="text-sm text-blue-600 hover:underline">← マスター管理TOPに戻る</a>
      </div>

      {sp.success && <div className="mb-6"><Banner variant="success">処理が完了しました。</Banner></div>}
      {sp.error && <div className="mb-6"><Banner variant="error">{sp.error}</Banner></div>}

      {/* Grant form */}
      <div className="mb-10 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">ロールを付与</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              対象アカウントはあらかじめSupabaseダッシュボードで作成してください。
            </p>
          </div>
        </div>
        <form action={grantScope} className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className={LABEL_CLASS}>
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input id="email" name="email" type="email" required placeholder="user@example.co.jp" className={INPUT_CLASS} />
          </div>
          <div>
            <label htmlFor="display_name" className={LABEL_CLASS}>表示名（初回付与時のみ・任意）</label>
            <input id="display_name" name="display_name" type="text" maxLength={100} className={INPUT_CLASS} />
          </div>
          <div>
            <label htmlFor="role_code" className={LABEL_CLASS}>
              ロール <span className="text-red-500">*</span>
            </label>
            <select id="role_code" name="role_code" required defaultValue="" className={INPUT_CLASS}>
              <option value="" disabled>選択してください</option>
              {grantableRoles.map((code) => (
                <option key={code} value={code}>{ROLE_LABELS[code]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="started_on" className={LABEL_CLASS}>開始日</label>
            <input id="started_on" name="started_on" type="date" defaultValue={todayInTokyo()} className={INPUT_CLASS} />
          </div>
          <div className="sm:col-span-2">
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">
                ロールに応じて、いずれか1つだけ選択してください。
                会社管理者・監査担当→会社 / エリア管理者→エリア / 店舗利用者・店舗責任者→店舗 / 全権限管理者→選択不要
              </p>
            </div>
          </div>
          <div>
            <label htmlFor="company_id" className={LABEL_CLASS}>会社</label>
            <select id="company_id" name="company_id" defaultValue="" className={INPUT_CLASS}>
              <option value="">選択しない</option>
              {companyOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="area_id" className={LABEL_CLASS}>エリア</label>
            <select id="area_id" name="area_id" defaultValue="" className={INPUT_CLASS}>
              <option value="">選択しない</option>
              {areaOptions.map((a) => {
                const company = companyOptions.find((c) => c.id === a.company_id);
                return (
                  <option key={a.id} value={a.id}>
                    {company ? `${company.name} — ${a.name}` : a.name}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="store_id" className={LABEL_CLASS}>店舗</label>
            <select id="store_id" name="store_id" defaultValue="" className={INPUT_CLASS}>
              <option value="">選択しない</option>
              {storeOptions.map((s) => {
                const company = companyOptions.find((c) => c.id === s.company_id);
                return (
                  <option key={s.id} value={s.id}>
                    {company ? `${company.name} — ` : ""}{s.store_code} {s.name}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="sm:col-span-2">
            <SubmitButton
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2"
              pendingText="付与中..."
            >
              付与する
            </SubmitButton>
          </div>
        </form>
      </div>

      {/* User list */}
      <div className="mb-4 flex items-center gap-2">
        <h2 className="shrink-0 text-xs font-semibold uppercase tracking-widest text-slate-400">
          ユーザー一覧
        </h2>
        <div className="h-px flex-1 bg-slate-200" />
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold tabular-nums text-slate-500">
          {userGroups.length}名
        </span>
      </div>

      {userGroups.length === 0 ? (
        <EmptyState message="表示できるユーザーがいません。" />
      ) : (
        <ul className="space-y-3">
          {userGroups.map(([userId, group]) => (
            <li key={userId} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                  {group.displayName.charAt(0)}
                </div>
                <p className="text-sm font-bold text-slate-900">{group.displayName}</p>
                <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-500">
                  {group.scopes.length}件
                </span>
              </div>
              <ul className="divide-y divide-slate-100">
                {group.scopes.map((scope, idx) => {
                  const role = oneOf(scope.roles);
                  const company = oneOf(scope.companies);
                  const area = oneOf(scope.areas);
                  const store = oneOf(scope.stores);
                  const isActive = !scope.ended_on || scope.ended_on >= todayInTokyo();
                  const scopeLabel = company?.name ?? area?.name ?? (store ? `${store.store_code} ${store.name}` : "全社・全エリア");
                  return (
                    <li key={scope.id} className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 ${!isActive ? "bg-slate-50 opacity-50" : idx % 2 === 1 ? "bg-slate-50/60" : ""}`}>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className={`inline-flex h-2 w-2 rounded-full ${ROLE_DOT_CLASS[role?.code ?? ""] ?? "bg-slate-400"}`} />
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${ROLE_BADGE_CLASS[role?.code ?? ""] ?? "bg-slate-100 text-slate-600"}`}>
                          {role ? ROLE_LABELS[role.code] ?? role.code : "-"}
                        </span>
                        <span className="text-slate-600">{scopeLabel}</span>
                        <span className="text-xs text-slate-400">
                          {scope.started_on} 〜 {scope.ended_on ?? "現在"}
                        </span>
                      </div>
                      {isActive ? (
                        <form action={revokeScope}>
                          <input type="hidden" name="scope_id" value={scope.id} />
                          <SubmitButton
                            className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-red-600"
                            pendingText="取消中..."
                          >
                            取り消す
                          </SubmitButton>
                        </form>
                      ) : (
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-400">終了済み</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  );
}
