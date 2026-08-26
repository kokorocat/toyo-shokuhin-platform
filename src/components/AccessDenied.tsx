export function AccessDenied({
  message = "この画面を表示する権限がありません。管理者権限を持つアカウントで再ログインしてください。",
}: {
  message?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
