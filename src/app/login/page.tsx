import { signIn } from "./actions";
import { Banner } from "@/components/Banner";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-900 to-blue-800 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 shadow-lg ring-1 ring-white/20 backdrop-blur-sm">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            東洋食品グループ
          </h1>
          <p className="mt-1 text-sm text-blue-200">
            広域ポータル — 店舗・管理者共通ログイン
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white p-6 shadow-2xl sm:p-8">
          {params.error && (
            <div className="mb-5">
              <Banner variant="error">{params.error}</Banner>
            </div>
          )}

          <form action={signIn} className="space-y-5">
            <input type="hidden" name="redirectTo" value={params.redirectTo ?? "/"} />
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="username"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-800 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 active:bg-blue-950"
            >
              ログイン
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-blue-300/60">
          東洋食品 / 昭和食品 / 大阪惣菜
        </p>
      </div>
    </div>
  );
}
