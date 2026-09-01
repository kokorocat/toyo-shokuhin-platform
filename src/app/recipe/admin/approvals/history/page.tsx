// 承認履歴(承認者視点、全権限管理者専用)。承認済みレシピアップロード由来
// (application_idがnull)のレシピはこの画面には出さない(申請フローを経ていないため)。
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isRecipeApprovalRole } from "@/app/recipe/admin/guard";
import { approveRecipe } from "@/app/recipe/admin/approvals/actions";
import { groupByApplication, type FlatRecipeRow } from "@/lib/recipe/applications";
import { Banner } from "@/components/Banner";
import { SubmitButton } from "@/components/SubmitButton";
import { AccessDenied } from "@/components/AccessDenied";
import { RecipeHeader, RecipeTabs } from "@/app/recipe/RecipeShell";

function matchesBucket(item: { status: string; rejection_note: string | null }, bucket: string): boolean {
  if (bucket === "rejected") return item.status === "rejected";
  if (bucket === "approved") return item.status === "approved";
  if (bucket === "published") return item.status === "published";
  return item.status !== "draft";
}

const HISTORY_SELECT =
  "id, recipe_code, name, category, status, rejection_note, created_at, updated_at, application_id, company_id, companies!recipes_company_id_fkey(name), recipe_applications(id, created_at, recipe_submitters(name))";

export default async function RecipeApprovalHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;
  const ctx = await getPortalContext();

  if (!ctx || !isRecipeApprovalRole(ctx.roleCode ?? null)) {
    return <AccessDenied />;
  }

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("recipes")
    .select(HISTORY_SELECT)
    .not("application_id", "is", null)
    .order("created_at", { ascending: false });

  // 先にフィルタしてからグルーピングすると、バッチ内の他の行がフィルタで落ちた場合に
  // 判定済み件数・合計件数がバッチ本来の構成と食い違う。必ず全行でグルーピングしてから、
  // バケットに該当する行を含むバッチだけを表示する(history/page.tsxと同じ修正)。
  const flatRows = (rows ?? []) as unknown as FlatRecipeRow[];
  const applications = groupByApplication(flatRows);

  return (
    <div className="min-h-screen bg-slate-50">
      <RecipeHeader ctx={ctx} />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <RecipeTabs roleCode={ctx.roleCode ?? null} activeHref="/recipe/admin/approvals/history" />

        {success && <Banner variant="success" className="mb-4">処理が完了しました。</Banner>}
        {error && <Banner variant="error" className="mb-4">{error}</Banner>}

        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { title: "差し戻し", key: "rejected", items: applications.filter((a) => a.items.some((i) => i.status === "rejected")) },
            { title: "承認後公開前", key: "approved", items: applications.filter((a) => a.items.some((i) => i.status === "approved")) },
            { title: "承認済み・公開済み", key: "published", items: applications.filter((a) => a.items.some((i) => i.status === "published")) },
          ].map((col) => (
            <section key={col.key} className="rounded-lg border border-slate-200 bg-white p-3">
              <h2 className="mb-2 text-sm font-bold text-slate-800">{col.title}</h2>
              {col.items.length === 0 ? (
                <p className="text-xs text-slate-400">該当なし</p>
              ) : (
                <ul className="space-y-2">
                  {col.items.map((app) => (
                    <li key={app.applicationId ?? app.items[0].id} className="rounded-lg border border-slate-100 p-2 text-xs">
                      <p className="font-bold">{app.companyName}</p>
                      {app.items.filter((i) => matchesBucket(i, col.key)).map((item) => (
                        <div key={item.id} className="mt-1 flex flex-wrap items-center gap-2">
                          <Link href={`/recipe/${item.id}`} className="text-blue-700 underline">{item.name}</Link>
                          {item.status === "approved" && (
                            <form action={approveRecipe}>
                              <input type="hidden" name="recipe_id" value={item.id} />
                              <input type="hidden" name="redirect_to" value="/recipe/admin/approvals/history" />
                              <SubmitButton
                                className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white"
                                pendingText="処理中..."
                              >
                                公開する
                              </SubmitButton>
                            </form>
                          )}
                        </div>
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
