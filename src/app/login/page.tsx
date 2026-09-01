import { signIn } from "./actions";
import { Banner } from "@/components/Banner";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white px-8 py-10 shadow-lg sm:px-10">
          <h1 className="text-2xl font-bold text-slate-800">
            東洋食品 広域ポータル
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            メールアドレスとパスワードでログインしてください。
          </p>

          {params.error && (
            <div className="mt-5">
              <Banner variant="error">{params.error}</Banner>
            </div>
          )}

          <form action={signIn} className="mt-6 space-y-5">
            <input type="hidden" name="redirectTo" value={params.redirectTo ?? "/"} />
            <div className="flex rounded-lg border border-slate-200 p-1">
              <span className="flex-1 rounded-md bg-blue-700 py-1.5 text-center text-xs font-bold text-white">取引先ログイン</span>
              <span className="flex-1 rounded-md py-1.5 text-center text-xs font-medium text-slate-600">管理者ログイン</span>
            </div>
            {/* 要確認: タブ切替の実処理。参照画像のシステム名は「販促物受発注システム」。ログインID表記をメールアドレスから変えるかも要確認。 */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-bold text-slate-700">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="username"
                placeholder="example@toyo-foods.co.jp"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-bold text-slate-700">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="パスワードを入力"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="remember_id" className="h-4 w-4" />
                ログインIDを記憶する
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="remember_password" className="h-4 w-4" />
                パスワードも記憶する
              </label>
              <p className="text-[11px] text-slate-400">共有端末ではパスワードの記憶を使わないでください。</p>
              <div>
                <label htmlFor="keep_hours" className="mb-1 block font-medium">ログイン保持期間</label>
                <select id="keep_hours" name="keep_hours" defaultValue="3" className="rounded-lg border border-slate-300 px-3 py-1.5">
                  <option value="3">3時間</option>
                  <option value="8">8時間</option>
                  <option value="24">24時間</option>
                </select>
              </div>
              {/* 要確認: 記憶・保持期間の実処理 */}
            </div>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2"
            >
              ログイン
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          東洋食品 ／ 昭和食品 ／ 大阪惣菜
        </p>
      </div>
    </div>
  );
}
