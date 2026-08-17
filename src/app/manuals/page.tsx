import Link from "next/link";

export default function ManualsPage() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <div className="mb-4">
        <Link href="/" className="text-xs text-blue-700 underline">
          ← 店舗ポータルTOPに戻る
        </Link>
      </div>
      <h1 className="mb-4 text-lg font-bold text-slate-900">マニュアル一覧</h1>
      <p className="text-sm text-slate-500">
        マニュアル一覧・PDFビューア(KP-30/KP-31)は準備中です。
      </p>
    </div>
  );
}
