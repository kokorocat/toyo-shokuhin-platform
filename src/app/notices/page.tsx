import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

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

export default async function NoticesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: notices } = await supabase
    .from("portal_notices")
    .select("id, title, importance, display_start_at")
    .order("display_start_at", { ascending: false });

  const { data: reads } = user
    ? await supabase.from("notice_reads").select("notice_id").eq("user_id", user.id)
    : { data: [] as { notice_id: string }[] };
  const readIds = new Set((reads ?? []).map((r) => r.notice_id));

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <PageHeader
        backHref="/"
        backLabel="店舗ポータルTOPに戻る"
        title="お知らせ一覧"
      />

      {(!notices || notices.length === 0) ? (
        <EmptyState
          message="現在表示できるお知らせはありません。"
          icon={
            <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
          }
        />
      ) : (
        <ul className="space-y-2">
          {notices.map((n) => {
            const unread = !readIds.has(n.id);
            return (
              <li key={n.id}>
                <Link
                  href={`/notices/${n.id}`}
                  className={`block rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${
                    n.importance === "urgent"
                      ? "border-red-200 bg-red-50 hover:border-red-300"
                      : "border-slate-200 bg-white hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${IMPORTANCE_STYLES[n.importance] ?? IMPORTANCE_STYLES.normal}`}>
                      {IMPORTANCE_LABELS[n.importance] ?? n.importance}
                    </span>
                    {unread && (
                      <span className="inline-flex items-center rounded-md bg-red-600 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
                        未読
                      </span>
                    )}
                    <span className="ml-auto text-xs text-slate-400">
                      {new Date(n.display_start_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-800">{n.title}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
