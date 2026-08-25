export default function NoticesLoading() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4 py-6">
      <div className="flex flex-col items-center gap-3">
        <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-700" />
        <p className="text-sm text-slate-500">読み込み中...</p>
      </div>
    </div>
  );
}
