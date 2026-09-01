// 申請履歴(申請者視点)。承認済みレシピアップロード(/recipe/admin/upload)由来のレシピは
// application_idを持たないため、この画面には出さない(それらは「申請」を経ていないため)。
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isRecipeAdminRole } from "@/app/recipe/admin/guard";
import { groupByApplication, type FlatRecipeRow } from "@/lib/recipe/applications";
import { AccessDenied } from "@/components/AccessDenied";
import { RecipeHeader, RecipeTabs } from "@/app/recipe/RecipeShell";

const STATUS_LABELS: Record<string, string> = {
  draft: "承認待ち",
  approved: "承認済み(未公開)",
  published: "公開済み",
  rejected: "差し戻し",
};

function matchesBucket(item: { status: string; rejection_note: string | null }, bucket: string): boolean {
  if (bucket === "pending") return item.status === "draft";
  if (bucket === "rejected") return item.status === "rejected";
  if (bucket === "resolved") return item.status === "approved" || item.status === "published";
  return true;
}

const HISTORY_SELECT =
  "id, recipe_code, name, category, status, rejection_note, created_at, updated_at, application_id, company_id, companies!recipes_company_id_fkey(name), recipe_applications(id, created_at, recipe_submitters(name))";

export default async function RecipeHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await searchParams;
  const ctx = await getPortalContext();

  if (!isRecipeAdminRole(ctx?.roleCode ?? null)) {
    return <AccessDenied message="権限がありません。管理者アカウントで再度ログインしてください。" />;
  }

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("recipes")
    .select(HISTORY_SELECT)
    .not("application_id", "is", null)
    .order("created_at", { ascending: false });

  // 先にフィルタしてからグルーピングすると、バッチ内の他の行がフィルタで落ちた場合に
  // 判定済み件数・合計件数がバッチ本来の構成と食い違う(例: 2件中1件が未判定でもう1件が
  // 承認済みのバッチが、承認済みで絞り込むと「1/1件」の完了バッチに見えてしまう)。
  // 必ず全行でグルーピングしてから、バケットに該当する行を含むバッチだけを表示する。
  const flatRows = (rows ?? []) as unknown as FlatRecipeRow[];
  const applications = groupByApplication(flatRows);

  return (
    <div className="min-h-screen bg-slate-50">
      <RecipeHeader ctx={ctx} />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <RecipeTabs roleCode={ctx?.roleCode ?? null} activeHref="/recipe/admin/history" />

        <h1 className="mb-4 text-lg font-bold text-slate-900">申請履歴</h1>

        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { title: "未処理・承認待ち", key: "pending", items: applications.filter((a) => a.items.some((i) => i.status === "draft")) },
            { title: "差し戻し履歴", key: "rejected", items: applications.filter((a) => a.items.some((i) => i.status === "rejected")) },
            { title: "承認済み", key: "resolved", items: applications.filter((a) => a.items.some((i) => i.status === "approved" || i.status === "published")) },
          ].map((col) => (
            <section key={col.key} className="rounded-lg border border-slate-200 bg-white p-3">
              <h2 className="mb-2 text-sm font-bold text-slate-800">{col.title}</h2>
              {col.items.length === 0 ? (
                <p className="text-xs text-slate-400">該当なし</p>
              ) : (
                <ul className="space-y-2">
                  {col.items.map((app) => (
                    <li key={app.applicationId ?? app.items[0].id} className="rounded-lg border border-slate-100 p-2 text-xs">
                      <p className="font-bold">{app.submitterName ?? "(名簿未設定)"}</p>
                      {app.items.filter((i) => matchesBucket(i, col.key)).map((item) => (
                        <p key={item.id} className="mt-1">
                          <Link href={`/recipe/${item.id}`} className="text-blue-700 underline">{item.name}</Link>
                          <span className="ml-1 text-slate-500">{STATUS_LABELS[item.status]}</span>
                        </p>
                      ))}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
