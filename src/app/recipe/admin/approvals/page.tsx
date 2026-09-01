// RV-50 承認待ち・承認履歴。
// 2026-08-27にクライアントから確定した3段階判定(承認して公開/承認/差し戻し)・複数ファイル
// 一括申請のバッチ表示に対応。バッチのグルーピングはsrc/lib/recipe/applications.tsを使用する。
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isRecipeApprovalRole } from "@/app/recipe/admin/guard";
import { approveRecipe, approveRecipeWithoutPublishing, rejectRecipe } from "@/app/recipe/admin/approvals/actions";
import { groupByApplication, isJudged, type FlatRecipeRow } from "@/lib/recipe/applications";
import { Banner } from "@/components/Banner";
import { EmptyState } from "@/components/EmptyState";
import { SubmitButton } from "@/components/SubmitButton";
import { AccessDenied } from "@/components/AccessDenied";
import { RecipeHeader, RecipeTabs } from "@/app/recipe/RecipeShell";

type SearchParams = { error?: string; success?: string };

const PENDING_SELECT =
  "id, recipe_code, name, category, status, rejection_note, created_at, updated_at, application_id, company_id, companies!recipes_company_id_fkey(name), recipe_applications(id, created_at, recipe_submitters(name))";

export default async function RecipeApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { error, success } = await searchParams;
  const ctx = await getPortalContext();

  if (!ctx || !isRecipeApprovalRole(ctx.roleCode ?? null)) {
    return <AccessDenied />;
  }

  const supabase = await createClient();

  // 未判定(status='draft')の行だけで絞り込むと、バッチ内の他の行が既に判定済みの場合に
  // バッチの本来の構成(判定済み件数・合計件数)が分からなくなる(1件だけ承認した4件バッチが
  // 「3件のバッチ」に見えてしまう)。そのため、直近の申請(全ステータス、作成日時降順で一定件数)を
  // 取得し、バッチ単位でグルーピングした後に「1件でも未判定の行が残っているバッチ」を優先表示する。
  // 全件判定済みのバッチも、直近作成分であればそのまま折りたたみ表示で残す(判定直後に
  // 「判定済みX/X件」が確認できるようにするため)。
  const { data: recent } = await supabase
    .from("recipes")
    .select(PENDING_SELECT)
      // 承認済みレシピアップロード(/recipe/admin/upload)由来の行はapplication_idを持たず
      // 申請フローを経ていないため、この一覧(承認待ち一覧=申請バッチ単位の判定画面)には
      // 含めない。含めてしまうと、公開済みの一括アップロード行がここに紛れ込んで表示が
      // 煩雑になるだけでなく、limit(200)の枠を消費して直近の本当の未判定申請が
      // 一覧から溢れてしまう(history/page.tsxの絞り込みと同じ理由)。
      .not("application_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);

  const recentRows = (recent ?? []) as unknown as FlatRecipeRow[];
  const pendingApplications = groupByApplication(recentRows).sort((a, b) => {
    const aDone = a.items.every(isJudged);
    const bDone = b.items.every(isJudged);
    if (aDone !== bDone) return aDone ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
  const totalPending = recentRows.filter((r) => !isJudged(r)).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <RecipeHeader ctx={ctx} />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <RecipeTabs roleCode={ctx.roleCode ?? null} activeHref="/recipe/admin/approvals" />

        {error && (
          <Banner variant="error" className="mb-5">
            {error}
          </Banner>
        )}
        {success && (
          <Banner variant="success" className="mb-5">
            処理が完了しました。
          </Banner>
        )}

        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">承認待ち一覧</h2>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
              {totalPending}件
            </span>
          </div>
          {pendingApplications.length === 0 ? (
            <EmptyState message="承認待ちのレシピはありません。" />
          ) : (
            <div className="space-y-2">
              {pendingApplications.flatMap((app) =>
                app.items.map((item) => {
                  // Cursorによるフラットリスト化で、判定済み(approved/published/rejected)の項目にも
                  // 無条件で3つの判定ボタンが表示され続けてしまっていた(承認済み/公開済みのバッジが
                  // 消えていたため見分けが付かず、誤って再判定してしまう危険があった)。判定済みは
                  // バッジ表示のみに戻し、未判定(status='draft')の項目だけに判定ボタンを出す。
                  const judged = item.status !== "draft";
                  return (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-400">{item.recipe_code} / {app.companyName} / {app.submitterName ?? "(名簿未設定)"}</p>
                        <p className="text-sm font-bold text-slate-900">{item.name}</p>
                      </div>
                      {judged ? (
                        <span
                          className={`inline-flex shrink-0 items-center rounded-md px-2.5 py-1 text-xs font-bold ${
                            item.status === "published"
                              ? "bg-green-100 text-green-700"
                              : item.status === "approved"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.status === "published" ? "公開済み" : item.status === "approved" ? "承認済み（未公開）" : "差し戻し済み"}
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={approveRecipe}>
                            <input type="hidden" name="recipe_id" value={item.id} />
                            <SubmitButton className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white" pendingText="処理中...">承認して公開</SubmitButton>
                          </form>
                          <form action={approveRecipeWithoutPublishing}>
                            <input type="hidden" name="recipe_id" value={item.id} />
                            <SubmitButton className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700" pendingText="処理中...">承認（未公開のまま）</SubmitButton>
                          </form>
                          <form action={rejectRecipe} className="flex items-center gap-1">
                            <input type="hidden" name="recipe_id" value={item.id} />
                            <input name="reason" required placeholder="差し戻し理由" className="rounded-lg border border-slate-300 px-2 py-1 text-xs" />
                            <SubmitButton className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white" pendingText="処理中...">差し戻す</SubmitButton>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>

        <p className="mb-6 text-sm">
          <Link href="/recipe/admin/approvals/history" className="text-blue-700 underline">承認履歴を見る</Link>
        </p>
      </div>
    </div>
  );
}
