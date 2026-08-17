import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
    // 既読登録(重複はunique制約で無視)
    await supabase
      .from("notice_reads")
      .upsert({ notice_id: notice.id, user_id: user.id }, { onConflict: "notice_id,user_id" });
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <div className="mb-4">
        <Link href="/notices" className="text-xs text-blue-700 underline">
          ← お知らせ一覧に戻る
        </Link>
      </div>
      <p className="text-xs text-slate-400">
        {new Date(notice.display_start_at).toLocaleDateString("ja-JP")}
      </p>
      <h1 className="mb-4 text-lg font-bold text-slate-900">{notice.title}</h1>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{notice.body}</p>
      {notice.external_url && (
        <a
          href={notice.external_url}
          className="mt-4 inline-block text-sm text-blue-700 underline"
        >
          関連リンクを開く
        </a>
      )}
    </div>
  );
}
