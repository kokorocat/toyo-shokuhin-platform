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
        <p className="text-sm text-slate-500">
          一時的なエラーが発生しました。しばらくしてから再度お試しください。
        </p>
      </div>
    );
  }

  const store = data?.[0];
  if (!store) notFound();

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <div className="mb-8 text-center">
        <p className="text-sm font-medium text-slate-500">{store.store_name}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          衛生チェック入力
        </h1>
        <p className="mt-2 text-sm text-slate-500">ログインは不要です。下記から選んでください。</p>
      </div>

      <div className="space-y-4">
        <Link
          href={`/haccp/kiosk/${token}/keypoint`}
          className="block rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-blue-400 hover:shadow-md active:scale-[0.99]"
        >
          <p className="text-lg font-bold text-slate-900">重要ポイント・温度・ラベル</p>
          <p className="mt-1 text-sm text-slate-500">本日の重要管理点・温度・ラベルを記録します</p>
        </Link>
        <Link
          href={`/haccp/kiosk/${token}/employee`}
          className="block rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-blue-400 hover:shadow-md active:scale-[0.99]"
        >
          <p className="text-lg font-bold text-slate-900">従業員衛生チェック</p>
          <p className="mt-1 text-sm text-slate-500">出勤したご自身の体調・身だしなみを記録します</p>
        </Link>
        <Link
          href={`/haccp/kiosk/${token}/inspection`}
          className="block rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-blue-400 hover:shadow-md active:scale-[0.99]"
        >
          <p className="text-lg font-bold text-slate-900">食品衛生自主点検（月次）</p>
          <p className="mt-1 text-sm text-slate-500">今月の自主点検を記録します</p>
        </Link>
      </div>
    </div>
  );
}
