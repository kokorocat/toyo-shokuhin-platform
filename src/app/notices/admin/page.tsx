// KA-20 お知らせ管理。作成・公開/非公開の切り替えのみ(編集・添付・エリア/店舗単位の
// 絞り込みは今回は対象外、対象範囲は全社(super_adminのみ)/自社のいずれか)。
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isMasterAdminRole, isSuperAdminRole } from "@/app/master/guard";
import Link from "next/link";
import { Banner } from "@/components/Banner";
import { SubmitButton } from "@/components/SubmitButton";
import { AccessDenied } from "@/components/AccessDenied";
import { EmptyState } from "@/components/EmptyState";
import { todayInTokyo } from "@/lib/date";
import { createNotice, setNoticeStatus } from "./actions";

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const LABEL_CLASS = "mb-1.5 block text-xs font-medium text-slate-600";

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  scheduled: "公開予定",
  published: "公開中",
  ended: "終了",
  unpublished: "非公開",
};
const STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-500",
  scheduled: "bg-amber-100 text-amber-700",
  published: "bg-green-100 text-green-700",
  ended: "bg-slate-100 text-slate-500",
  unpublished: "bg-red-100 text-red-700",
};

export default async function NoticesAdminPage({
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
  const [{ data: companies }, { data: notices }] = await Promise.all([
    supabase.from("companies").select("id, name").eq("status", "active").order("name"),
    supabase
      .from("portal_notices")
      .select("id, title, importance, status, created_at, notice_scopes(scope_type, companies(name))")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const companyOptions = companies ?? [];

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-r from-teal-700 via-teal-600 to-green-600 px-4 py-4 text-white shadow-md">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-lg font-bold">お知らせ管理</h1>
          <p className="text-sm text-white/70">お知らせの作成・公開・管理</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <Link href="/" className="text-sm text-blue-600 hover:underline">← ポータルTOPに戻る</Link>

        {sp.success && <div className="mb-4 mt-4"><Banner variant="success">処理が完了しました。</Banner></div>}
        {sp.error && <div className="mb-4 mt-4"><Banner variant="error">{sp.error}</Banner></div>}

        <div className="mb-8 mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">新規お知らせ作成</h2>
          </div>
        <form action={createNotice} className="space-y-4 px-5 py-5">
          <div>
            <label htmlFor="title" className={LABEL_CLASS}>タイトル <span className="text-red-600">*</span></label>
            <input id="title" name="title" type="text" required maxLength={200} className={INPUT_CLASS} />
          </div>
          <div>
            <label htmlFor="body" className={LABEL_CLASS}>本文 <span className="text-red-600">*</span></label>
            <textarea id="body" name="body" required rows={5} className={INPUT_CLASS} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="importance" className={LABEL_CLASS}>重要度</label>
              <select id="importance" name="importance" defaultValue="normal" className={INPUT_CLASS}>
                <option value="normal">通常</option>
                <option value="important">重要</option>
                <option value="urgent">緊急</option>
              </select>
            </div>
            <div>
              <label htmlFor="external_url" className={LABEL_CLASS}>関連リンク（任意）</label>
              <input id="external_url" name="external_url" type="url" className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="display_start_at" className={LABEL_CLASS}>掲載開始日時</label>
              <input id="display_start_at" name="display_start_at" type="datetime-local" defaultValue={`${todayInTokyo()}T00:00`} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="display_end_at" className={LABEL_CLASS}>掲載終了日時（任意）</label>
              <input id="display_end_at" name="display_end_at" type="datetime-local" className={INPUT_CLASS} />
            </div>
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
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="publish_now" className="h-4 w-4 rounded border-slate-300 text-blue-600" />
            すぐに公開する（未選択の場合は下書き保存）
          </label>
          <SubmitButton
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            pendingText="登録中..."
          >
            登録する
          </SubmitButton>
        </form>
      </div>

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        お知らせ一覧（{(notices ?? []).length}件）
      </h2>
      {!notices || notices.length === 0 ? (
        <EmptyState message="お知らせがまだありません。" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 bg-teal-700 px-4 py-2.5 text-xs font-bold text-white">
            <span>タイトル</span>
            <span>対象</span>
            <span>状態</span>
            <span>操作</span>
          </div>
          {notices.map((n) => {
            const scope = Array.isArray(n.notice_scopes) ? n.notice_scopes[0] : n.notice_scopes;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const companyName = (scope?.companies as any)?.name as string | undefined;
            return (
              <div key={n.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-t border-slate-100 px-4 py-2.5">
                <span className="truncate text-sm font-medium text-slate-800">{n.title}</span>
                <span className="text-xs text-slate-500">
                  {scope?.scope_type === "all" ? "全社" : companyName ?? "-"}
                </span>
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${STATUS_BADGE[n.status] ?? "bg-slate-100 text-slate-500"}`}>
                  {STATUS_LABELS[n.status] ?? n.status}
                </span>
                <div className="flex gap-2">
                  {n.status !== "published" && (
                    <form action={setNoticeStatus}>
                      <input type="hidden" name="notice_id" value={n.id} />
                      <input type="hidden" name="next_status" value="published" />
                      <SubmitButton className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-600">
                        公開する
                      </SubmitButton>
                    </form>
                  )}
                  {n.status === "published" && (
                    <form action={setNoticeStatus}>
                      <input type="hidden" name="notice_id" value={n.id} />
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
