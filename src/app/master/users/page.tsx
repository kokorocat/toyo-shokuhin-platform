// /master/users: ユーザーへのロール・スコープ付与/取消。既存の検証済みRPC
// (grant_user_access_scope / revoke_user_access_scope, 20260826000003)をUIから呼び出す。
// アカウント自体の新規作成(auth.users行)はSupabaseダッシュボードでの事前作成が必要
// (SUPABASE_SERVICE_ROLE_KEY未設定のため、アプリ内での新規作成は別途対応が必要な既知の制約)。
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { createClient } from "@/lib/supabase/server";
import { isMasterAdminRole, isSuperAdminRole } from "@/app/master/guard";
import { PageHeader } from "@/components/PageHeader";
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
  system_maintenance: "bg-slate-200 text-slate-700",
  auditor: "bg-purple-100 text-purple-700",
};

// company_admin(super_admin以外)が付与できるのはこの3つのみ
// (grant_user_access_scope RPC自身の権限上限チェックと同じ境界)。auditorはcompany_adminと同じ
// company_idのみのスコープ形状だが、権限上限チェックでsuper_admin限定にしているためここには含めない。
const NON_SUPER_GRANTABLE_ROLES = ["store_user", "store_manager", "area_admin"];
const ALL_ROLES = ["store_user", "store_manager", "area_admin", "company_admin", "auditor", "super_admin", "system_maintenance"];

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const LABEL_CLASS = "mb-1.5 block text-xs font-medium text-slate-600";

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

  // ユーザーごとにグルーピング(表示・取消操作の単位)
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
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-6">
      <PageHeader backHref="/master" backLabel="マスター管理TOPに戻る" title="ユーザー・権限管理" />

      {sp.success && <div className="mb-4"><Banner variant="success">処理が完了しました。</Banner></div>}
      {sp.error && <div className="mb-4"><Banner variant="error">{sp.error}</Banner></div>}

      <div className="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">ロールを付与</h2>
          <p className="mt-1 text-xs text-slate-500">
            対象アカウントはあらかじめSupabaseダッシュボードで作成しておいてください。
          </p>
        </div>
        <form action={grantScope} className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className={LABEL_CLASS}>メールアドレス <span className="text-red-600">*</span></label>
            <input id="email" name="email" type="email" required className={INPUT_CLASS} />
          </div>
          <div>
            <label htmlFor="display_name" className={LABEL_CLASS}>表示名（初回付与時のみ・任意）</label>
            <input id="display_name" name="display_name" type="text" maxLength={100} className={INPUT_CLASS} />
          </div>
          <div>
            <label htmlFor="role_code" className={LABEL_CLASS}>ロール <span className="text-red-600">*</span></label>
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
            <p className="mb-2 text-xs font-medium text-slate-500">
              ロールに応じて、いずれか1つだけ選択してください(会社管理者・監査担当→会社 / エリア管理者→エリア / 店舗利用者・店舗責任者→店舗 / 全権限管理者→いずれも選択不要)
            </p>
          </div>
          <div>
            <label htmlFor="company_id" className={LABEL_CLASS}>会社（会社管理者・監査担当用）</label>
            <select id="company_id" name="company_id" defaultValue="" className={INPUT_CLASS}>
              <option value="">選択しない</option>
              {companyOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="area_id" className={LABEL_CLASS}>エリア（エリア管理者用）</label>
            <select id="area_id" name="area_id" defaultValue="" className={INPUT_CLASS}>
              <option value="">選択しない</option>
              {areaOptions.map((a) => {
                const company = companyOptions.find((c) => c.id === a.company_id);
                return (
                  <option key={a.id} value={a.id}>
                    {company ? `${company.name} - ${a.name}` : a.name}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="store_id" className={LABEL_CLASS}>店舗（店舗利用者・店舗責任者用）</label>
            <select id="store_id" name="store_id" defaultValue="" className={INPUT_CLASS}>
              <option value="">選択しない</option>
              {storeOptions.map((s) => {
                const company = companyOptions.find((c) => c.id === s.company_id);
                return (
                  <option key={s.id} value={s.id}>
                    {company ? `${company.name} - ` : ""}{s.store_code} {s.name}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="sm:col-span-2">
            <SubmitButton
              className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 active:bg-blue-950"
              pendingText="付与中..."
            >
              付与する
            </SubmitButton>
          </div>
        </form>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          ユーザー一覧（{userGroups.length}名）
        </h2>
        {userGroups.length === 0 ? (
          <EmptyState message="表示できるユーザーがいません。" />
        ) : (
          <ul className="space-y-3">
            {userGroups.map(([userId, group]) => (
              <li key={userId} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-3">
                  <p className="text-sm font-bold text-slate-900">{group.displayName}</p>
                </div>
                <ul className="divide-y divide-slate-100">
                  {group.scopes.map((scope) => {
                    const role = oneOf(scope.roles);
                    const company = oneOf(scope.companies);
                    const area = oneOf(scope.areas);
                    const store = oneOf(scope.stores);
                    const isActive = !scope.ended_on || scope.ended_on >= todayInTokyo();
                    const scopeLabel = company?.name ?? area?.name ?? (store ? `${store.store_code} ${store.name}` : "全社・全エリア");
                    return (
                      <li key={scope.id} className={`flex flex-wrap items-center justify-between gap-2 px-5 py-3 ${!isActive ? "opacity-50" : ""}`}>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${ROLE_BADGE_CLASS[role?.code ?? ""] ?? "bg-slate-100 text-slate-600"}`}>
                            {role ? ROLE_LABELS[role.code] ?? role.code : "-"}
                          </span>
                          <span className="text-slate-500">{scopeLabel}</span>
                          <span className="text-xs text-slate-400">
                            {scope.started_on} 〜 {scope.ended_on ?? "現在"}
                          </span>
                        </div>
                        {isActive ? (
                          <form action={revokeScope}>
                            <input type="hidden" name="scope_id" value={scope.id} />
                            <SubmitButton
                              className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-50"
                              pendingText="取消中..."
                            >
                              取り消す
                            </SubmitButton>
                          </form>
                        ) : (
                          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">終了済み</span>
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
