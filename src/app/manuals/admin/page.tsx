// KA-30 マニュアル管理。PDFをそのままStorageへ保存し、アプリ内では埋め込み表示する
// (仕様書が想定するページ画像化・processing_jobsパイプラインは今回は対象外。
// ブラウザ標準のPDF表示で代替する)。
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isMasterAdminRole, isSuperAdminRole } from "@/app/master/guard";
import Link from "next/link";
import { Banner } from "@/components/Banner";
import { SubmitButton } from "@/components/SubmitButton";
import { AccessDenied } from "@/components/AccessDenied";
import { EmptyState } from "@/components/EmptyState";
import { uploadManual, unpublishManual } from "./actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const LABEL_CLASS = "mb-1.5 block text-xs font-medium text-slate-600";

const STATUS_LABELS: Record<string, string> = {
  processing: "処理中",
  ready: "公開中",
  error: "エラー",
  unpublished: "非公開",
};
const STATUS_BADGE: Record<string, string> = {
  processing: "bg-amber-100 text-amber-700",
  ready: "bg-green-100 text-green-700",
  error: "bg-red-100 text-red-700",
  unpublished: "bg-slate-100 text-slate-500",
};

export default async function ManualsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getPortalContext();

  if (!isMasterAdminRole(ctx?.roleCode ?? null)) {
    return <AccessDenied message="この画面を表示する権限がありません。管理者権限を持つアカウントで再ログインしてください。" />;
  }
  const isSuper = isSuperAdminRole(ctx?.roleCode ?? null);

  const supabase = await createClient();
  const [{ data: companies }, { data: manuals }] = await Promise.all([
    supabase.from("companies").select("id, name").eq("status", "active").order("name"),
    supabase
      .from("manuals")
      .select("id, title, category, status, created_at, manual_scopes(scope_type, companies(name))")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const companyOptions = companies ?? [];

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-r from-teal-700 via-teal-600 to-green-600 px-4 py-4 text-white shadow-md">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-lg font-bold">マニュアル管理</h1>
          <p className="text-sm text-white/70">マニュアルの登録・公開・管理</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <Link href="/manuals" className="text-sm text-blue-600 hover:underline">← マニュアル一覧に戻る</Link>

        {sp.success && <div className="mb-4 mt-4"><Banner variant="success">処理が完了しました。</Banner></div>}
        {sp.error && <div className="mb-4 mt-4"><Banner variant="error">{sp.error}</Banner></div>}

        <div className="mb-8 mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">新規マニュアル登録</h2>
        </div>
        <form action={uploadManual} encType="multipart/form-data" className="space-y-4 px-5 py-5">
          <div>
            <label htmlFor="title" className={LABEL_CLASS}>タイトル <span className="text-red-600">*</span></label>
            <input id="title" name="title" type="text" required maxLength={200} className={INPUT_CLASS} />
          </div>
          <div>
            <label htmlFor="category" className={LABEL_CLASS}>カテゴリ（任意）</label>
            <input id="category" name="category" type="text" placeholder="HACCP、受発注 など" className={INPUT_CLASS} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="scope_type" className={LABEL_CLASS}>公開対象</label>
              <select id="scope_type" name="scope_type" defaultValue="company" className={INPUT_CLASS}>
                <option value="company">特定の会社</option>
                {isSuper && <option value="all">全社</option>}
              </select>
            </div>
            <div>
              <label htmlFor="company_id" className={LABEL_CLASS}>会社（「特定の会社」選択時）</label>
              <select id="company_id" name="company_id" defaultValue="" className={INPUT_CLASS}>
                <option value="">選択してください</option>
                {companyOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="file" className={LABEL_CLASS}>PDFファイル <span className="text-red-600">*</span></label>
            <input
              id="file"
              name="file"
              type="file"
              accept="application/pdf"
              required
              className={`${INPUT_CLASS} file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700`}
            />
          </div>
          <SubmitButton
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            pendingText="アップロード中..."
          >
            登録する
          </SubmitButton>
        </form>
      </div>

        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          マニュアル一覧（{(manuals ?? []).length}件）
        </h2>
        {!manuals || manuals.length === 0 ? (
          <EmptyState message="マニュアルがまだありません。" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 bg-teal-700 px-4 py-2.5 text-xs font-bold text-white">
              <span>タイトル</span>
              <span>対象</span>
              <span>状態</span>
              <span>操作</span>
            </div>
            {manuals.map((m) => {
              const scope = Array.isArray(m.manual_scopes) ? m.manual_scopes[0] : m.manual_scopes;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const companyName = (scope?.companies as any)?.name as string | undefined;
              return (
                <div key={m.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-t border-slate-100 px-4 py-2.5">
                  <div className="min-w-0">
                    <span className="truncate text-sm font-medium text-slate-800">{m.title}</span>
                    {m.category && <span className="ml-2 text-xs text-slate-400">（{m.category}）</span>}
                  </div>
                  <span className="text-xs text-slate-500">
                    {scope?.scope_type === "all" ? "全社" : companyName ?? "-"}
                  </span>
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${STATUS_BADGE[m.status] ?? "bg-slate-100 text-slate-500"}`}>
                    {STATUS_LABELS[m.status] ?? m.status}
                  </span>
                  <div className="flex gap-2">
                    {m.status !== "ready" ? (
                      <form action={unpublishManual}>
                        <input type="hidden" name="manual_id" value={m.id} />
                        <input type="hidden" name="next_status" value="ready" />
                        <SubmitButton className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-600">
                          公開する
                        </SubmitButton>
                      </form>
                    ) : (
                      <form action={unpublishManual}>
                        <input type="hidden" name="manual_id" value={m.id} />
                        <input type="hidden" name="next_status" value="unpublished" />
                        <SubmitButton className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-red-600">
                          非公開にする
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
