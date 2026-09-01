import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";

export default async function ManualsPage() {
  const supabase = await createClient();

  const { data: manuals } = await supabase
    .from("manuals")
    .select("id, title, category, updated_at")
    .eq("status", "ready")
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false });

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <PageHeader backHref="/" backLabel="ポータルTOPに戻る" title="マニュアル一覧" />

      {!manuals || manuals.length === 0 ? (
        <EmptyState message="現在閲覧できるマニュアルはありません。" />
      ) : (
        <ul className="space-y-2">
          {manuals.map((m) => (
            <li key={m.id}>
              <a
                href={`/manuals/${m.id}`}
                className="block rounded-lg border border-slate-200 border-l-4 border-l-teal-600 bg-white px-4 py-3"
              >
                <p className="text-sm font-bold text-slate-800">{m.title}</p>
                {m.category && <p className="text-xs text-slate-400">{m.category}</p>}
                <p className="mt-1 text-xs text-slate-500">{new Date(m.updated_at).toLocaleDateString("ja-JP")}</p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
