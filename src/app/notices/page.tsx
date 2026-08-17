import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const IMPORTANCE_LABELS: Record<string, string> = {
  urgent: "緊急",
  important: "重要",
  normal: "通常",
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
      <div className="mb-4">
        <Link href="/" className="text-xs text-blue-700 underline">
          ← 店舗ポータルTOPに戻る
        </Link>
      </div>
      <h1 className="mb-4 text-lg font-bold text-slate-900">お知らせ一覧</h1>

      {(!notices || notices.length === 0) && (
        <p className="text-sm text-slate-500">現在表示できるお知らせはありません。</p>
      )}

      <ul className="space-y-2">
        {notices?.map((n) => {
          const unread = !readIds.has(n.id);
          return (
            <li key={n.id}>
              <Link
                href={`/notices/${n.id}`}
                className={`block rounded-lg border p-4 shadow-sm ${
                  n.importance === "urgent"
                    ? "border-red-300 bg-red-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {IMPORTANCE_LABELS[n.importance] ?? n.importance}
                  </span>
                  {unread && (
                    <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                      未読
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {new Date(n.display_start_at).toLocaleDateString("ja-JP")}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-800">{n.title}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
