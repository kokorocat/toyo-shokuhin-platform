export default function ManualsLoading() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-6">
      <div className="flex flex-col items-center gap-4">
        <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-800" />
        <p className="text-sm font-medium text-slate-400">読み込み中...</p>
      </div>
    </div>
  );
}
