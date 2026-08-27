// 申請履歴(申請者視点)。承認済みレシピアップロード(/recipe/admin/upload)由来のレシピは
// application_idを持たないため、この画面には出さない(それらは「申請」を経ていないため)。
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isRecipeAdminRole } from "@/app/recipe/admin/guard";
import { groupByApplication, isJudged, type FlatRecipeRow } from "@/lib/recipe/applications";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { AccessDenied } from "@/components/AccessDenied";

const STATUS_LABELS: Record<string, string> = {
  draft: "承認待ち",
  approved: "承認済み(未公開)",
  published: "公開済み",
};

const BUCKETS = [
  { key: "", label: "すべて" },
  { key: "pending", label: "承認待ち" },
  { key: "rejected", label: "差し戻し" },
  { key: "resolved", label: "承認済み・公開済み" },
];

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ja-JP");
}

function matchesBucket(item: { status: string; rejection_note: string | null }, bucket: string): boolean {
  if (bucket === "pending") return item.status === "draft" && !item.rejection_note;
  if (bucket === "rejected") return item.status === "draft" && Boolean(item.rejection_note);
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
  const { status } = await searchParams;
  const bucket = status ?? "";
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
  const applications = groupByApplication(flatRows).filter((app) =>
    app.items.some((item) => matchesBucket(item, bucket))
  );

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-6">
      <PageHeader backHref="/recipe/admin/submit" backLabel="新規レシピ申請に戻る" title="申請履歴" />

      <nav className="mb-6 flex flex-wrap gap-2">
        {BUCKETS.map((b) => (
          <Link
            key={b.key}
            href={b.key ? `/recipe/admin/history?status=${b.key}` : "/recipe/admin/history"}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors ${
              bucket === b.key
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
            }`}
          >
            {b.label}
          </Link>
        ))}
      </nav>

      {applications.length === 0 ? (
        <EmptyState message="該当する申請がありません。" />
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const judgedCount = app.items.filter(isJudged).length;
            const total = app.items.length;
            return (
              <details key={app.applicationId ?? app.items[0].id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      申請者: {app.submitterName ?? "(名簿未設定)"}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>申請日: {formatDate(app.createdAt)}</span>
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {judgedCount}/{total}件
                      </span>
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-md px-2.5 py-1 text-xs font-bold ${
                      judgedCount === total ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {judgedCount === total ? "判定完了" : "判定中"}
                  </span>
                </summary>
                <div className="divide-y divide-slate-100 border-t border-slate-100">
                  {app.items.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-400">{item.recipe_code}</p>
                        <Link href={`/recipe/${item.id}`} className="text-sm font-medium text-slate-900 hover:text-blue-700">
                          {item.name}
                        </Link>
                        {item.rejection_note && (
                          <p className="mt-1 whitespace-pre-wrap text-xs text-red-700">差し戻し理由: {item.rejection_note}</p>
                        )}
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-md px-2.5 py-1 text-xs font-bold ${
                          item.status === "published"
                            ? "bg-green-100 text-green-700"
                            : item.status === "approved"
                              ? "bg-blue-100 text-blue-700"
                              : item.rejection_note
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.rejection_note && item.status === "draft" ? "差し戻し" : STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
