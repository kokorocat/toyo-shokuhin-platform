// OM-50(請求) — 店舗を選択し、その店舗の未請求期間の確認・請求書発行・発行済み一覧を行う。
// 会社→店舗のみの簡易カスケード(HACCPのブロック/エリア階層までは今回は再現しない)。
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isOrderingAdminRole } from "@/app/ordering/admin/guard";
import { getHalfMonthPeriod } from "@/lib/haccp/admin-dashboard";
import { PageHeader } from "@/components/PageHeader";
import { Banner } from "@/components/Banner";
import { EmptyState } from "@/components/EmptyState";
import { SubmitButton } from "@/components/SubmitButton";
import { AccessDenied } from "@/components/AccessDenied";
import { todayInTokyo } from "@/lib/date";
import { issueInvoice } from "./actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

function yen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export default async function OrderingBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ company_id?: string; store_id?: string; error?: string; success?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getPortalContext();

  if (!isOrderingAdminRole(ctx?.roleCode ?? null)) {
    return <AccessDenied message="この画面を表示する権限がありません。管理者権限を持つアカウントで再ログインしてください。" />;
  }

  const supabase = await createClient();
  const { data: companies } = await supabase.from("companies").select("id, name").eq("status", "active").order("name");
  const companyOptions = companies ?? [];
  const companyId = sp.company_id || (companyOptions.length === 1 ? companyOptions[0].id : "");

  let storeOptions: { id: string; name: string; store_code: string }[] = [];
  if (companyId) {
    const { data: stores } = await supabase
      .from("stores")
      .select("id, name, store_code")
      .eq("company_id", companyId)
      .eq("status", "active")
      .order("store_code");
    storeOptions = stores ?? [];
  }
  const storeId = sp.store_id || "";

  const today = todayInTokyo();
  const currentPeriod = getHalfMonthPeriod(today);

  let unbilledTotal = 0;
  let pastInvoices: {
    id: string;
    invoice_number: string;
    period_start: string;
    period_end: string;
    total_amount: number;
    status: string;
    issued_at: string;
  }[] = [];

  if (storeId) {
    const { data: unbilledOrders } = await supabase
      .from("orders")
      .select("total_amount")
      .eq("store_id", storeId)
      .is("invoice_id", null)
      .neq("status", "cancelled")
      .gte("created_at", currentPeriod.start)
      .lte("created_at", `${currentPeriod.end} 23:59:59`);
    unbilledTotal = (unbilledOrders ?? []).reduce((sum, o) => sum + o.total_amount, 0);

    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, invoice_number, period_start, period_end, total_amount, status, issued_at")
      .eq("store_id", storeId)
      .order("issued_at", { ascending: false })
      .limit(30);
    pastInvoices = invoices ?? [];
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-6">
      <PageHeader backHref="/ordering/admin" backLabel="受発注管理TOPに戻る" title="請求書発行" />

      {sp.success && <div className="mb-4"><Banner variant="success">請求書を発行しました。</Banner></div>}
      {sp.error && <div className="mb-4"><Banner variant="error">{sp.error}</Banner></div>}

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <form className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="company_id" className="mb-1.5 block text-xs font-medium text-slate-600">会社</label>
            <select id="company_id" name="company_id" defaultValue={companyId} className={INPUT_CLASS}>
              <option value="">選択してください</option>
              {companyOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="store_id" className="mb-1.5 block text-xs font-medium text-slate-600">店舗</label>
            <select id="store_id" name="store_id" defaultValue={storeId} className={INPUT_CLASS} disabled={!companyId}>
              <option value="">選択してください</option>
              {storeOptions.map((s) => <option key={s.id} value={s.id}>{s.store_code} {s.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <SubmitButton className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-900">
              表示する
            </SubmitButton>
          </div>
        </form>
      </div>

      {storeId && (
        <>
          <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-900">
                今期（{currentPeriod.start} 〜 {currentPeriod.end}）の未請求金額
              </h2>
            </div>
            <div className="px-5 py-5">
              <p className="mb-4 text-2xl font-bold tabular-nums text-slate-900">{yen(unbilledTotal)}</p>
              <form action={issueInvoice} className="space-y-3">
                <input type="hidden" name="company_id" value={companyId} />
                <input type="hidden" name="store_id" value={storeId} />
                <input type="hidden" name="period_type" value="half_month" />
                <input type="hidden" name="period_start" value={currentPeriod.start} />
                <input type="hidden" name="period_end" value={currentPeriod.end} />
                <SubmitButton
                  className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                  pendingText="発行中..."
                >
                  この期間の請求書を発行する
                </SubmitButton>
                <p className="text-xs text-slate-400">
                  既にこの期間の請求書が発行済みの場合は、再発行として旧請求書を無効化し新しい請求書を発行します。
                </p>
              </form>
            </div>
          </div>

          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">発行済み請求書</h2>
          {pastInvoices.length === 0 ? (
            <EmptyState message="発行済みの請求書がありません。" />
          ) : (
            <ul className="space-y-2">
              {pastInvoices.map((inv) => (
                <li key={inv.id}>
                  <Link
                    href={`/ordering/admin/billing/${inv.id}`}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 shadow-sm transition-colors hover:border-blue-300 ${
                      inv.status === "superseded" ? "border-slate-200 bg-slate-50 opacity-60" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{inv.invoice_number}</p>
                      <p className="text-xs text-slate-400">
                        {inv.period_start} 〜 {inv.period_end}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {inv.status === "superseded" && (
                        <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">無効</span>
                      )}
                      <span className="text-sm font-bold tabular-nums text-slate-900">{yen(inv.total_amount)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
