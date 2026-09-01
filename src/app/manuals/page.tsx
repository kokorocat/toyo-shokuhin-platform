import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isMasterAdminRole } from "@/app/master/guard";
import { EmptyState } from "@/components/EmptyState";

export default async function ManualsPage() {
  const ctx = await getPortalContext();
  const supabase = await createClient();

  const { data: manuals } = await supabase
    .from("manuals")
    .select("id, title, category, updated_at")
    .eq("status", "ready")
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false });

  return (
    <div className="min-h-screen">
      <header className="bg-slate-800 px-4 py-4 text-white shadow-md">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-lg font-bold">マニュアル一覧</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/" className="text-sm text-blue-600 hover:underline">← ポータルTOPに戻る</Link>

        {ctx && isMasterAdminRole(ctx.roleCode ?? null) && (
          <div className="mb-4 mt-4 text-right">
            <Link href="/manuals/admin" className="rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">
              マニュアルを管理する →
            </Link>
          </div>
        )}

        {!manuals || manuals.length === 0 ? (
        <EmptyState message="現在閲覧できるマニュアルはありません。" />
      ) : (
        <ul className="space-y-2">
          {manuals.map((m) => (
            <li key={m.id}>
              <Link
                href={`/manuals/${m.id}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800">{m.title}</p>
                  {m.category && <p className="text-xs text-slate-400">{m.category}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  );
}
