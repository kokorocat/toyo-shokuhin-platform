export default function HaccpLoading() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4 py-6">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700" />
        読み込み中...
      </div>
    </div>
  );
}
