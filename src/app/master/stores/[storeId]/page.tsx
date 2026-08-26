// 店舗の編集。稼働状態の切り替えはこの画面では扱わず、店舗一覧(toggleStoreStatus)側の
// 責務とする(商品一覧/編集画面と同じ責務分担)。
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isMasterAdminRole } from "@/app/master/guard";
import { updateStore } from "@/app/master/stores/actions";
import { PageHeader } from "@/components/PageHeader";
import { Banner } from "@/components/Banner";
import { SubmitButton } from "@/components/SubmitButton";
import { AccessDenied } from "@/components/AccessDenied";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: "稼働中", className: "bg-green-100 text-green-700" },
  preparing: { label: "準備中", className: "bg-amber-100 text-amber-700" },
  suspended: { label: "休止中", className: "bg-slate-100 text-slate-500" },
  closed: { label: "閉店", className: "bg-red-100 text-red-700" },
};

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const LABEL_CLASS = "mb-1.5 block text-xs font-medium text-slate-600";

type CompanyOption = { id: string; name: string };
type AreaOption = { id: string; name: string; companies: { name: string } | { name: string }[] | null };

export default async function EditStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ storeId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { storeId } = await params;
  const sp = await searchParams;
  const ctx = await getPortalContext();

  if (!isMasterAdminRole(ctx?.roleCode ?? null)) {
    return <AccessDenied message="この画面を表示する権限がありません。管理者権限を持つアカウントで再ログインしてください。" />;
  }

  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id, company_id, area_id, store_code, name, status, manager_name, manager_contact, opened_on")
    .eq("id", storeId)
    .maybeSingle();

  if (!store) notFound();

  const [{ data: companies }, { data: areas }] = await Promise.all([
    supabase.from("companies").select("id, name").eq("status", "active").order("name"),
    supabase.from("areas").select("id, name, companies(name)").eq("status", "active").order("name"),
  ]);

  const companyOptions = (companies ?? []) as CompanyOption[];
  const areaOptions = (areas ?? []) as AreaOption[];
  const statusBadge = STATUS_BADGE[store.status] ?? STATUS_BADGE.suspended;

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <PageHeader backHref="/master/stores" backLabel="店舗一覧に戻る" title={`店舗を編集: ${store.name}`} />

      <div className="mb-4 flex items-center gap-2">
        <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${statusBadge.className}`}>{statusBadge.label}</span>
        <p className="text-xs text-slate-400">※稼働状態の切り替えは店舗一覧画面から行ってください。</p>
      </div>

      {sp.error && <div className="mb-4"><Banner variant="error">{sp.error}</Banner></div>}

      <form action={updateStore} className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">店舗情報</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">
          <input type="hidden" name="store_id" value={store.id} />

          <div>
            <label htmlFor="company_id" className={LABEL_CLASS}>会社 <span className="text-red-600">*</span></label>
            <select id="company_id" name="company_id" required defaultValue={store.company_id} className={INPUT_CLASS}>
              {companyOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="area_id" className={LABEL_CLASS}>エリア</label>
            <select id="area_id" name="area_id" defaultValue={store.area_id ?? ""} className={INPUT_CLASS}>
              <option value="">未選択</option>
              {areaOptions.map((a) => {
                const company = Array.isArray(a.companies) ? a.companies[0] : a.companies;
                return <option key={a.id} value={a.id}>{company ? `${company.name} - ${a.name}` : a.name}</option>;
              })}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="store_code" className={LABEL_CLASS}>店舗コード <span className="text-red-600">*</span></label>
            <input id="store_code" name="store_code" type="text" required maxLength={50} defaultValue={store.store_code} className={INPUT_CLASS} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="name" className={LABEL_CLASS}>店舗名 <span className="text-red-600">*</span></label>
            <input id="name" name="name" type="text" required maxLength={200} defaultValue={store.name} className={INPUT_CLASS} />
          </div>
          <div>
            <label htmlFor="manager_name" className={LABEL_CLASS}>店長名</label>
            <input id="manager_name" name="manager_name" type="text" maxLength={100} defaultValue={store.manager_name ?? ""} className={INPUT_CLASS} />
          </div>
          <div>
            <label htmlFor="manager_contact" className={LABEL_CLASS}>連絡先</label>
            <input id="manager_contact" name="manager_contact" type="text" maxLength={100} defaultValue={store.manager_contact ?? ""} className={INPUT_CLASS} />
          </div>
          <div>
            <label htmlFor="opened_on" className={LABEL_CLASS}>稼働開始日</label>
            <input id="opened_on" name="opened_on" type="date" defaultValue={store.opened_on ?? ""} className={INPUT_CLASS} />
          </div>

          <div className="flex items-center gap-3 border-t border-slate-100 pt-5 sm:col-span-2">
            <SubmitButton className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 active:bg-blue-950" pendingText="更新中...">更新する</SubmitButton>
          </div>
        </div>
      </form>
    </div>
  );
}
