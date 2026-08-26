// 店舗の新規追加。実際の登録処理はcreateStore(actions.ts)に一本化されており、
// このページはフォームの表示のみを担当する。
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isMasterAdminRole } from "@/app/master/guard";
import { createStore } from "@/app/master/stores/actions";
import { PageHeader } from "@/components/PageHeader";
import { Banner } from "@/components/Banner";
import { SubmitButton } from "@/components/SubmitButton";
import { AccessDenied } from "@/components/AccessDenied";

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const LABEL_CLASS = "mb-1.5 block text-xs font-medium text-slate-600";

type CompanyOption = { id: string; name: string };
type AreaOption = { id: string; name: string; companies: { name: string } | { name: string }[] | null };

export default async function NewStorePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getPortalContext();

  if (!isMasterAdminRole(ctx?.roleCode ?? null)) {
    return <AccessDenied message="この画面を表示する権限がありません。管理者権限を持つアカウントで再ログインしてください。" />;
  }

  const supabase = await createClient();

  // RLSにより、company_adminには自社分のみ、super_adminには全件が返る(companies_select/areas_select)。
  const [{ data: companies }, { data: areas }] = await Promise.all([
    supabase.from("companies").select("id, name").eq("status", "active").order("name"),
    supabase.from("areas").select("id, name, companies(name)").eq("status", "active").order("name"),
  ]);

  const companyOptions = (companies ?? []) as CompanyOption[];
  const areaOptions = (areas ?? []) as AreaOption[];

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <PageHeader backHref="/master/stores" backLabel="店舗一覧に戻る" title="店舗を追加" />

      {sp.error && <Banner variant="error" className="mb-6">{sp.error}</Banner>}

      <form action={createStore} className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">店舗情報</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">
          <div>
            <label htmlFor="company_id" className={LABEL_CLASS}>会社 <span className="text-red-600">*</span></label>
            <select id="company_id" name="company_id" required defaultValue="" className={INPUT_CLASS}>
              <option value="" disabled>選択してください</option>
              {companyOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="area_id" className={LABEL_CLASS}>エリア</label>
            <select id="area_id" name="area_id" defaultValue="" className={INPUT_CLASS}>
              <option value="">未選択</option>
              {areaOptions.map((a) => {
                const company = Array.isArray(a.companies) ? a.companies[0] : a.companies;
                return <option key={a.id} value={a.id}>{company ? `${company.name} - ${a.name}` : a.name}</option>;
              })}
            </select>
            <p className="mt-1 text-xs text-slate-400">※会社と異なる会社のエリアを選ぶと保存時にエラーになります。</p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="store_code" className={LABEL_CLASS}>店舗コード <span className="text-red-600">*</span></label>
            <input id="store_code" name="store_code" type="text" required maxLength={50} className={INPUT_CLASS} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="name" className={LABEL_CLASS}>店舗名 <span className="text-red-600">*</span></label>
            <input id="name" name="name" type="text" required maxLength={200} className={INPUT_CLASS} />
          </div>
          <div>
            <label htmlFor="manager_name" className={LABEL_CLASS}>店長名</label>
            <input id="manager_name" name="manager_name" type="text" maxLength={100} className={INPUT_CLASS} />
          </div>
          <div>
            <label htmlFor="manager_contact" className={LABEL_CLASS}>連絡先</label>
            <input id="manager_contact" name="manager_contact" type="text" maxLength={100} className={INPUT_CLASS} />
          </div>
          <div>
            <label htmlFor="opened_on" className={LABEL_CLASS}>稼働開始日</label>
            <input id="opened_on" name="opened_on" type="date" className={INPUT_CLASS} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4">
          <Link href="/master/stores" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50">キャンセル</Link>
          <SubmitButton className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 active:bg-blue-950" pendingText="登録中...">登録する</SubmitButton>
        </div>
      </form>
    </div>
  );
}
