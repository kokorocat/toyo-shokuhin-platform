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
  normal: "bg-slate-100 text-slate-500",
};

const IMPORTANCE_BORDER: Record<string, string> = {
  urgent: "border-l-red-500",
  important: "border-l-amber-400",
  normal: "border-l-slate-200",
};

const IMPORTANCE_TABS = [
  { label: "すべて", value: "" },
  { label: "緊急", value: "urgent" },
  { label: "重要", value: "important" },
  { label: "通常", value: "normal" },
] as const;

export default async function NoticesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const importanceFilter = typeof sp.importance === "string" ? sp.importance : "";

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

  const allNotices = notices ?? [];
  const filtered = importanceFilter
    ? allNotices.filter((n) => n.importance === importanceFilter)
    : allNotices;

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6">
      <PageHeader
        backHref="/"
        backLabel="店舗ポータルTOPに戻る"
        title="お知らせ一覧"
      />

      {/* Importance filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {IMPORTANCE_TABS.map((tab) => {
          const isActive = importanceFilter === tab.value;
          const count = tab.value
            ? allNotices.filter((n) => n.importance === tab.value).length
            : allNotices.length;
          return (
            <Link
              key={tab.value}
              href={tab.value ? `/notices?importance=${tab.value}` : "/notices"}
              className={
                isActive
                  ? "rounded-full bg-slate-800 px-4 py-2 text-xs font-bold text-white"
                  : "rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              }
            >
              {tab.label}
              <span className="ml-1.5 tabular-nums">{count}</span>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
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
          {filtered.map((n) => {
            const unread = !readIds.has(n.id);
            return (
              <li key={n.id}>
                <Link
                  href={`/notices/${n.id}`}
                  className={`block overflow-hidden rounded-xl border border-l-4 shadow-sm transition-all hover:shadow-md ${
                    IMPORTANCE_BORDER[n.importance] ?? "border-l-slate-200"
                  } ${
                    n.importance === "urgent"
                      ? "border-red-200 bg-red-50/30"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                          IMPORTANCE_STYLES[n.importance] ?? IMPORTANCE_STYLES.normal
                        }`}
                      >
                        {n.importance === "urgent" && (
                          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                          </svg>
                        )}
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
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
