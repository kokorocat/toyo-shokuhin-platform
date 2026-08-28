import { PageHeader } from "@/components/PageHeader";

export default function ManualsPage() {
  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6">
      <PageHeader
        backHref="/"
        backLabel="店舗ポータルTOPに戻る"
        title="マニュアル一覧"
      />

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">マニュアル一覧・PDFビューア</p>
            <p className="mt-0.5 text-xs text-slate-400">KP-30 / KP-31</p>
          </div>
          <span className="ml-auto inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-500">
            準備中
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-14 text-center">
        <svg className="h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 12.677a2.25 2.25 0 0 0-.1.661Z" />
        </svg>
        <p className="text-sm font-medium text-slate-400">
          この機能は現在準備中です。今後のアップデートで利用可能になります。
        </p>
      </div>
    </div>
  );
}
