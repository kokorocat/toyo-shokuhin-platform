// HR-00(ダッシュボード)+ HR-10(全体メニュー)を統合した人事労務管理システムの入口画面。
// 今回のMVPスコープは社員・雇用管理(hr_persons/hr_employments/hr_employee_addresses/
// hr_assignments)の一覧・詳細参照のみのため、サマリーもその範囲に即した内容に絞る
// (仕様書HR-00が想定する未処理件数・期限アラート・ジョブカン連携状況等は未実装)。
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { isHrAdminRole } from "./guard";

// hr_employmentsに会社名を紐付けるための最小限の行型。
// employee_id → public.employees.id → company_id → public.companies.id という
// 既存共通マスターへの参照チェーン(仕様書「複製せず既存マスターを参照する」原則)を
// 1回の埋め込みクエリで辿る。
type EmploymentBreakdownRow = {
  employment_category: string | null;
  employees: {
    company_id: string;
    companies: { name: string } | null;
  } | null;
};

type CompanyBreakdown = { companyId: string; name: string; count: number };
type CategoryBreakdown = { label: string; count: number };

const MODULES: { title: string; description: string; href?: string }[] = [
  { title: "社員・雇用管理", description: "人物・雇用履歴・住所・所属異動の一覧/詳細", href: "/hr/employees" },
  { title: "契約書・帳票", description: "雇用契約書・労働条件通知書の作成/管理" },
  { title: "雇用保険", description: "資格取得・喪失手続きの管理" },
  { title: "社会保険", description: "健康保険・厚生年金の手続き管理" },
  { title: "健康診断", description: "受診管理・所見フォロー" },
  { title: "外国人管理", description: "在留資格・就労資格の管理" },
  { title: "障害者管理", description: "障害者雇用状況の管理" },
  { title: "有給台帳", description: "有給休暇の付与・取得管理" },
  { title: "労災・安全衛生", description: "労働災害・安全衛生の管理" },
  { title: "住民税", description: "特別徴収の管理" },
  { title: "定年・再雇用", description: "定年・再雇用手続きの管理" },
  { title: "36協定・官庁届出", description: "時間外労働協定・各種届出の管理" },
  { title: "退職金", description: "退職金の計算・支給管理" },
  { title: "封筒・発送", description: "給与明細等の封入・発送管理" },
  { title: "CSV取込・ジョブカン連携", description: "勤怠データ連携・CSV一括取込" },
  { title: "マスター管理", description: "各種コード・マスターデータの管理" },
  { title: "ユーザー・権限管理", description: "利用者アカウント・権限の管理" },
];

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-2xl font-bold text-slate-900">{value.toLocaleString("ja-JP")}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
      {note && <p className="mt-0.5 text-[11px] text-slate-400">{note}</p>}
    </div>
  );
}

function categoryBadgeClass(label: string): string {
  // 正社員系区分のみ強調し、それ以外(パート・アルバイト/未設定等)はニュートラル表示とする。
  return label.includes("正社員") ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500";
}

function ModuleCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href?: string;
}) {
  if (href) {
    return (
      <Link
        href={href}
        className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
      >
        <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-800">{title}</p>
        <p className="mt-1 text-xs text-slate-400">{description}</p>
      </Link>
    );
  }
  return (
    <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-4 opacity-70">
      <span className="absolute right-3 top-3 inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
        未実装
      </span>
      <p className="pr-14 text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-1 pr-14 text-xs text-slate-400">{description}</p>
    </div>
  );
}

export default async function HrTopPage() {
  const ctx = await getPortalContext();

  if (!isHrAdminRole(ctx?.roleCode ?? null)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">
          この画面を表示する権限がありません。人事労務管理の管理者権限を持つアカウントで再度ログインしてください。
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  // 総数(正確なカウント)と、会社別/雇用区分別内訳の元データを並列取得する。
  // RLSにより呼び出し元がアクセス可能な会社の行にすでに絞り込まれているため、
  // 画面側で追加の会社スコープ条件は付与しない。
  const [{ count: totalCount }, { data: breakdownData }] = await Promise.all([
    supabase.from("hr_employments").select("id", { count: "exact", head: true }),
    supabase
      .from("hr_employments")
      // PostgRESTの既定行数上限による内訳の暗黙的な取りこぼしを防ぐため明示的に上限を指定する
      // (totalCountは別途exact countで正確に取得済みのため、この内訳側の上限だけが問題になる)。
      .select("employment_category, employees(company_id, companies(name))")
      .limit(10000),
  ]);

  const breakdownRows = (breakdownData ?? []) as unknown as EmploymentBreakdownRow[];

  const companyCounts = new Map<string, CompanyBreakdown>();
  const categoryCounts = new Map<string, number>();

  for (const row of breakdownRows) {
    const companyId = row.employees?.company_id;
    if (companyId) {
      const existing = companyCounts.get(companyId);
      companyCounts.set(companyId, {
        companyId,
        name: row.employees?.companies?.name ?? "(会社名不明)",
        count: (existing?.count ?? 0) + 1,
      });
    }

    const category = row.employment_category?.trim() || "未設定";
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
  }

  const companyBreakdown = Array.from(companyCounts.values()).sort((a, b) => b.count - a.count);
  const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const hasEmployments = (totalCount ?? 0) > 0;

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6">
      <PageHeader
        backHref="/"
        backLabel="ポータルTOPに戻る"
        title="人事労務管理"
        subtitle="社員・雇用管理MVP — その他モジュールは今後実装予定です"
      />

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">概要</h2>

      {!hasEmployments ? (
        <div className="mb-8">
          <EmptyState message="管理対象の雇用履歴データがありません。表示できるデータが登録されると、ここに概要が表示されます。" />
        </div>
      ) : (
        <div className="mb-8 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              label="管理対象社員数(雇用履歴)"
              value={totalCount ?? 0}
              note="※ 人物ではなく雇用履歴の件数。再入社時は同一人物に履歴が追加されます"
            />
            <StatCard label="対象会社数" value={companyBreakdown.length} />
            <StatCard label="雇用区分数" value={categoryCounts.size} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-bold text-slate-900">会社別内訳</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">
                      <th className="whitespace-nowrap px-5 py-2.5">会社名</th>
                      <th className="whitespace-nowrap px-5 py-2.5 text-right">件数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {companyBreakdown.map((c) => (
                      <tr key={c.companyId}>
                        <td className="whitespace-nowrap px-5 py-2.5 text-slate-700">{c.name}</td>
                        <td className="whitespace-nowrap px-5 py-2.5 text-right font-medium text-slate-900">
                          {c.count.toLocaleString("ja-JP")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-bold text-slate-900">雇用区分別内訳</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">
                      <th className="whitespace-nowrap px-5 py-2.5">雇用区分</th>
                      <th className="whitespace-nowrap px-5 py-2.5 text-right">件数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categoryBreakdown.map((c) => (
                      <tr key={c.label}>
                        <td className="whitespace-nowrap px-5 py-2.5">
                          <span
                            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${categoryBadgeClass(c.label)}`}
                          >
                            {c.label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-2.5 text-right font-medium text-slate-900">
                          {c.count.toLocaleString("ja-JP")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        業務モジュール
      </h2>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <ModuleCard key={m.title} title={m.title} description={m.description} href={m.href} />
        ))}
      </section>
    </div>
  );
}
