// レシピ申請(recipe_applications)配下のrecipesをバッチ単位にグルーピングするための共有ロジック。
// 承認画面(承認待ち)・申請履歴・承認履歴の3画面がこの同じ関数を使う。

export type ApplicationRecipeItem = {
  id: string;
  recipe_code: string;
  name: string;
  category: string | null;
  status: string;
  rejection_note: string | null;
  created_at: string;
  updated_at: string;
};

type Nested<T> = T | T[] | null;

function oneOf<T>(v: Nested<T>): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export type FlatRecipeRow = ApplicationRecipeItem & {
  application_id: string | null;
  company_id: string;
  companies: Nested<{ name: string }>;
  recipe_applications: Nested<{
    id: string;
    created_at: string;
    recipe_submitters: Nested<{ name: string }>;
  }>;
};

export type ApplicationGroup = {
  applicationId: string | null;
  companyName: string;
  submitterName: string | null;
  createdAt: string;
  items: ApplicationRecipeItem[];
};

// 差し戻し済み(status='draft' かつ rejection_note有り)は「判定済み」として扱う
// (承認待ち一覧のstatus='draft'絞り込みには含まれるが、既に一度判定されているため)。
export function isJudged(item: Pick<ApplicationRecipeItem, "status" | "rejection_note">): boolean {
  return !(item.status === "draft" && !item.rejection_note);
}

export function groupByApplication(rows: FlatRecipeRow[]): ApplicationGroup[] {
  const groups = new Map<string, ApplicationGroup>();

  for (const row of rows) {
    const application = oneOf(row.recipe_applications);
    // application_idがnull(申請バッチ導入前の既存データ、または承認済みレシピアップロード由来)は
    // レシピ1件ごとに単独バッチとして扱う(id自体をグルーピングキーにする)。
    const key = row.application_id ?? `singleton:${row.id}`;
    const company = oneOf(row.companies);
    const submitter = application ? oneOf(application.recipe_submitters) : null;

    if (!groups.has(key)) {
      groups.set(key, {
        applicationId: row.application_id,
        companyName: company?.name ?? "-",
        submitterName: submitter?.name ?? null,
        createdAt: application?.created_at ?? row.created_at,
        items: [],
      });
    }
    groups.get(key)!.items.push({
      id: row.id,
      recipe_code: row.recipe_code,
      name: row.name,
      category: row.category,
      status: row.status,
      rejection_note: row.rejection_note,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }

  return [...groups.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
