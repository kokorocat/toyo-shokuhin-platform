import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60 * 30;

export default async function ManualViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: manual } = await supabase
    .from("manuals")
    .select("id, title, current_version_id, manual_versions!manuals_current_version_fkey(original_file_path)")
    .eq("id", id)
    .eq("status", "ready")
    .eq("is_deleted", false)
    .maybeSingle();

  if (!manual) notFound();

  const version = manual.manual_versions as unknown as { original_file_path: string } | null;
  let fileUrl: string | null = null;
  if (version?.original_file_path) {
    const { data: signed } = await supabase.storage
      .from("manual-files")
      .createSignedUrl(version.original_file_path, SIGNED_URL_TTL_SECONDS);
    fileUrl = signed?.signedUrl ?? null;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-6">
      <div className="mb-4">
        <Link href="/manuals" className="text-sm text-blue-600 hover:underline">← マニュアル一覧に戻る</Link>
        <h1 className="mt-2 text-lg font-bold text-slate-800">{manual.title}</h1>
      </div>
      {fileUrl ? (
        <div className="mt-4 flex-1 overflow-hidden rounded-xl border border-slate-200 shadow-sm" style={{ minHeight: "75vh" }}>
          <iframe src={fileUrl} title={manual.title} className="h-full min-h-[75vh] w-full" />
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-500">ファイルを表示できませんでした。</p>
      )}
    </div>
  );
}
