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
  normal: "bg-slate-100 text-slate-600",
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
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <PageHeader
        backHref="/notices"
        backLabel="お知らせ一覧に戻る"
        title={notice.title}
      />

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${IMPORTANCE_STYLES[notice.importance] ?? IMPORTANCE_STYLES.normal}`}>
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
