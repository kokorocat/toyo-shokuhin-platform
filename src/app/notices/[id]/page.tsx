import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";

const IMPORTANCE_LABELS: Record<string, string> = {
  urgent: "緊急",
  important: "重要",
  normal: "通常",
};

const IMPORTANCE_STYLES: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  important: "bg-amber-100 text-amber-700",
  normal: "bg-slate-100 text-slate-500",
};

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: notice } = await supabase
    .from("portal_notices")
    .select("id, title, body, importance, external_url, display_start_at")
    .eq("id", id)
    .maybeSingle();

  if (!notice) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase
      .from("notice_reads")
      .upsert({ notice_id: notice.id, user_id: user.id }, { onConflict: "notice_id,user_id" });
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6">
      <PageHeader
        backHref="/notices"
        backLabel="お知らせ一覧に戻る"
        title={notice.title}
      />

      <div
        className={`overflow-hidden rounded-xl border border-l-4 shadow-sm ${
          notice.importance === "urgent"
            ? "border-red-200 border-l-red-500 bg-red-50/30"
            : notice.importance === "important"
              ? "border-slate-200 border-l-amber-400 bg-white"
              : "border-slate-200 border-l-slate-300 bg-white"
        }`}
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${IMPORTANCE_STYLES[notice.importance] ?? IMPORTANCE_STYLES.normal}`}>
              {notice.importance === "urgent" && (
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
              )}
              {IMPORTANCE_LABELS[notice.importance] ?? notice.importance}
            </span>
            <span className="text-xs text-slate-400">
              {new Date(notice.display_start_at).toLocaleDateString("ja-JP")}
            </span>
          </div>
        </div>
        <div className="px-5 py-5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {notice.body}
          </p>
          {notice.external_url && (
            <a
              href={notice.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              関連リンクを開く
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
