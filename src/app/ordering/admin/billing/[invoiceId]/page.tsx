import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isOrderingAdminRole } from "@/app/ordering/admin/guard";
import { Banner } from "@/components/Banner";
import { SubmitButton } from "@/components/SubmitButton";
import { AccessDenied } from "@/components/AccessDenied";
import { issueInvoice } from "../actions";

function yen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { invoiceId } = await params;
  const sp = await searchParams;
  const ctx = await getPortalContext();

  if (!isOrderingAdminRole(ctx?.roleCode ?? null)) {
    return <AccessDenied message="この画面を表示する権限がありません。管理者権限を持つアカウントで再ログインしてください。" />;
  }

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, invoice_number, company_id, store_id, period_type, period_start, period_end, subtotal, tax_amount, total_amount, status, superseded_by, issued_at, stores(name, store_code)")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!invoice) notFound();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, created_at, total_amount")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: true });

  const store = invoice.stores as unknown as { name: string; store_code: string } | null;

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <Link href="/ordering/admin/billing" className="text-sm text-blue-600 hover:underline">← 請求書一覧に戻る</Link>
      <h1 className="mt-2 mb-6 text-lg font-bold text-slate-800">{invoice.invoice_number}</h1>

      {sp.success && <div className="mb-4"><Banner variant="success">再発行しました。</Banner></div>}
      {sp.error && <div className="mb-4"><Banner variant="error">{sp.error}</Banner></div>}

      {invoice.status === "superseded" && (
        <div className="mb-4">
          <Banner variant="warning">この請求書は再発行により無効化されています。</Banner>
        </div>
      )}

      <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">
            {store?.store_code} {store?.name}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            対象期間: {invoice.period_start} 〜 {invoice.period_end} ・発行日: {new Date(invoice.issued_at).toLocaleDateString("ja-JP")}
          </p>
        </div>
        <div className="space-y-2 px-5 py-5 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">小計</span><span className="tabular-nums">{yen(invoice.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">消費税</span><span className="tabular-nums">{yen(invoice.tax_amount)}</span></div>
          <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold"><span>合計</span><span className="tabular-nums">{yen(invoice.total_amount)}</span></div>
        </div>
      </div>

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">対象注文（{(orders ?? []).length}件）</h2>
      <ul className="mb-6 space-y-2">
        {(orders ?? []).map((o) => (
          <li key={o.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div>
              <p className="text-sm font-medium text-slate-800">{o.order_number}</p>
              <p className="text-xs text-slate-400">{new Date(o.created_at).toLocaleDateString("ja-JP")}</p>
            </div>
            <span className="text-sm font-medium tabular-nums text-slate-700">{yen(o.total_amount)}</span>
          </li>
        ))}
      </ul>

      {invoice.status === "issued" && (
        <form action={issueInvoice}>
          <input type="hidden" name="company_id" value={invoice.company_id} />
          <input type="hidden" name="store_id" value={invoice.store_id} />
          <input type="hidden" name="period_type" value={invoice.period_type} />
          <input type="hidden" name="period_start" value={invoice.period_start} />
          <input type="hidden" name="period_end" value={invoice.period_end} />
          <SubmitButton
            className="w-full rounded-full border border-red-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50"
            pendingText="再発行中..."
          >
            この期間の請求書を再発行する
          </SubmitButton>
        </form>
      )}

      {invoice.superseded_by && (
        <p className="mt-3 text-center text-sm">
          <Link href={`/ordering/admin/billing/${invoice.superseded_by}`} className="text-blue-600 hover:underline">
            再発行後の請求書を見る →
          </Link>
        </p>
      )}
    </div>
  );
}
