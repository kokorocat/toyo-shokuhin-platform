import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

export default function ManualsPage() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <PageHeader
        backHref="/"
        backLabel="店舗ポータルTOPに戻る"
        title="マニュアル一覧"
      />

      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600">マニュアル一覧・PDFビューア</p>
          <p className="mt-1 text-xs text-slate-400">（KP-30 / KP-31）は現在準備中です</p>
        </div>
      </div>
    </div>
  );
}
