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
      .select("id, title, body, importance, status, created_at, display_start_at, notice_scopes(scope_type, companies(name))")
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
        <h2 className="mt-4 text-lg font-bold text-slate-800">管理者ポータル</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs"><p className="text-slate-500">表示名</p><p className="font-bold">{ctx?.displayName ?? "-"}</p></div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs"><p className="text-slate-500">権限</p><p className="font-bold">{ctx?.roleCode ?? "-"}</p></div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs"><p className="text-slate-500">会社ID</p><p className="font-bold">{ctx?.company?.id ?? "-"}</p></div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs"><p className="text-slate-500">エリアID</p><p className="font-bold">{ctx?.area?.id ?? "-"}</p></div>
        </div>
        <nav className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white">お知らせアップロード</span>
          <a href="#notice-list" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700">お知らせ一覧</a>
          <Link href="/manuals/admin" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700">マニュアルアップロード</Link>
          <Link href="/manuals/admin#list" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700">マニュアル一覧</Link>
        </nav>

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
          <div>
            <label htmlFor="attachment" className={LABEL_CLASS}>添付資料</label>
            <input id="attachment" name="attachment" type="file" className={INPUT_CLASS} />
            {/* 要確認: 添付の保存処理 */}
          </div>
          <details className="rounded-lg border border-slate-200 p-3">
            <summary className="cursor-pointer text-xs font-medium text-slate-500">補助項目（重要度・公開対象）</summary>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </details>
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

      <h2 id="notice-list" className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        お知らせ一覧（{(notices ?? []).length}件）
      </h2>
      {!notices || notices.length === 0 ? (
        <EmptyState message="お知らせがまだありません。" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="bg-teal-700 text-xs font-bold text-white">
                <th className="px-3 py-2">タイトル</th>
                <th className="px-3 py-2">本文</th>
                <th className="px-3 py-2">対象</th>
                <th className="px-3 py-2">添付</th>
                <th className="px-3 py-2">公開日</th>
                <th className="px-3 py-2">状態</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
          {notices.map((n) => {
            const scope = Array.isArray(n.notice_scopes) ? n.notice_scopes[0] : n.notice_scopes;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const companyName = (scope?.companies as any)?.name as string | undefined;
            return (
              <tr key={n.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">{n.title}</td>
                <td className="max-w-[12rem] truncate px-3 py-2 text-xs text-slate-600">{n.body}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{scope?.scope_type === "all" ? "全社" : companyName ?? "-"}</td>
                <td className="px-3 py-2 text-xs text-slate-400">-</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs">{n.display_start_at?.slice(0, 10) ?? "-"}</td>
                <td className="px-3 py-2">
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${STATUS_BADGE[n.status] ?? "bg-slate-100 text-slate-500"}`}>
                  {STATUS_LABELS[n.status] ?? n.status}
                </span>
                </td>
                <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  <span className="rounded-md bg-slate-800 px-2 py-1 text-xs font-bold text-white">編集</span>
                  <span className="rounded-md bg-red-600 px-2 py-1 text-xs font-bold text-white">削除</span>
                  {/* 要確認: 編集・削除の実処理 */}
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
                </td>
              </tr>
            );
          })}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
