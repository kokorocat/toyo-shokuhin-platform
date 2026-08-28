// ログイン不要のHACCP店舗側入力トップ。トークンはpublic.kiosk_get_store()で検証する
// (RLSはauth.uid()前提のため未ログイン状態では機能せず、検証はすべてRPC内で完結させる)。
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function KioskTopPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("kiosk_get_store", { p_token: token });

  if (error) {
    console.error("[haccp/kiosk] kiosk_get_store failed", error);
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center">
        <p className="text-base text-slate-500">
          一時的なエラーが発生しました。しばらくしてから再度お試しください。
        </p>
      </div>
    );
  }

  const store = data?.[0];
  if (!store) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-50">
      {/* Blue gradient header matching GAS HACCP style */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-4 text-white shadow-md">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-lg font-bold">HACCP管理（{store.store_name}）</h1>
          <p className="text-sm text-white/80">ログイン不要 — 下記から入力してください</p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="space-y-4">
          <Link
            href={`/haccp/kiosk/${token}/keypoint`}
            className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md active:scale-[0.99]"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-slate-800">重要ポイント・温度・ラベル</p>
              <p className="mt-0.5 text-sm text-slate-500">本日の重要管理点・温度・ラベルを記録します</p>
            </div>
            <svg className="h-5 w-5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </Link>
          <Link
            href={`/haccp/kiosk/${token}/employee`}
            className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm transition-all hover:border-green-300 hover:shadow-md active:scale-[0.99]"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-600">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-slate-800">従業員衛生チェック</p>
              <p className="mt-0.5 text-sm text-slate-500">出勤したご自身の体調・身だしなみを記録します</p>
            </div>
            <svg className="h-5 w-5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </Link>
          <Link
            href={`/haccp/kiosk/${token}/inspection`}
            className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm transition-all hover:border-orange-300 hover:shadow-md active:scale-[0.99]"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-slate-800">食品衛生自主点検（月次）</p>
              <p className="mt-0.5 text-sm text-slate-500">今月の自主点検を記録します</p>
            </div>
            <svg className="h-5 w-5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </Link>
        </div>
      </main>
    </div>
  );
}
