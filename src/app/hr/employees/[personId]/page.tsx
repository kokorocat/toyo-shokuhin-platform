// HR-EMP-20 社員詳細(仕様書1.1「『社員』という表示上の単位と、人物・入社履歴・雇用契約を分離する」
// 構造をそのまま画面に反映する読み取り専用画面。新規登録・再入社の入力フォーム(HR-EMP-30)は
// 本MVPの対象外。住所・所属/異動は仕様書5.1「履歴管理」により発効日付きの履歴として保持されており、
// 上書きしないため、最新有効な情報を優先表示しつつ過去の行も履歴として別途表示する。
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isHrAdminRole } from "@/app/hr/guard";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

const GREEN = "bg-green-100 text-green-700";
const SLATE = "bg-slate-100 text-slate-500";
const AMBER = "bg-amber-100 text-amber-700";

// --- データ形状(埋め込みselectの型はローカルに明示し、any経由でキャストする。
//     他画面(src/app/haccp/admin/stores/[storeId]/page.tsx)と同様の方針) ---

type PersonRow = {
  id: string;
  full_name: string;
  full_name_kana: string | null;
  birth_date: string | null;
  gender_code: string | null;
};

type EmploymentRow = {
  id: string;
  hired_on: string;
  retired_on: string | null;
  retirement_reason: string | null;
  employment_category: string | null;
  salary_category: string | null;
  is_rehire: boolean;
  employees: {
    employee_code: string;
    companies: { name: string } | null;
  } | null;
};

type AddressRow = {
  id: string;
  effective_from: string;
  effective_to: string | null;
  postal_code: string | null;
  address: string | null;
  phone: string | null;
  emergency_contact: string | null;
};

type AssignmentRow = {
  id: string;
  employment_id: string;
  department: string | null;
  position: string | null;
  effective_from: string;
  effective_to: string | null;
  change_type: string | null;
  stores: { name: string } | null;
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${className}`}>
      {label}
    </span>
  );
}

/** "YYYY-MM-DD" -> "YYYY年M月D日"。date型カラムをDateオブジェクト経由で変換するとサーバーの
 *  タイムゾーンによって日付がずれる恐れがあるため、文字列のまま組み立てる。 */
function formatDate(d: string | null): string {
  if (!d) return "未登録";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (!m) return d;
  return `${m[1]}年${Number(m[2])}月${Number(m[3])}日`;
}

function orNotRegistered(v: string | null | undefined): string {
  return v && v.length > 0 ? v : "未登録";
}

function AssignmentRowView({ assignment, current }: { assignment: AssignmentRow; current: boolean }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm ${
        current ? "border-blue-200 bg-blue-50/40" : "border-slate-200 bg-slate-50/40"
      }`}
    >
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <Badge label={current ? "現在" : "過去"} className={current ? GREEN : SLATE} />
        {assignment.change_type && <span className="text-xs text-slate-500">{assignment.change_type}</span>}
        <span className="text-xs text-slate-400">
          {formatDate(assignment.effective_from)} 〜 {assignment.effective_to ? formatDate(assignment.effective_to) : ""}
        </span>
      </div>
      <p className="text-slate-800">
        {assignment.stores?.name ?? "店舗未設定"}
        {assignment.department ? ` / ${assignment.department}` : ""}
        {assignment.position ? ` / ${assignment.position}` : ""}
      </p>
    </div>
  );
}

export default async function HrEmployeeDetailPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = await params;
  const ctx = await getPortalContext();

  if (!isHrAdminRole(ctx?.roleCode ?? null)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">
          この画面を表示する権限がありません。管理者権限を持つアカウントで再ログインしてください。
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: personRaw } = await supabase
    .from("hr_persons")
    .select("*")
    .eq("id", personId)
    .maybeSingle();

  // RLSスコープ外(担当外の会社の人物)、または存在しないIDはnotFoundとして扱う
  // (URL直指定による会社をまたいだ参照・3社分離の突破を防止)。
  if (!personRaw) notFound();

  const person = personRaw as PersonRow;

  // hr_employments・hr_employee_addressesはperson_idのみで独立して取得できるためPromise.allで並列化。
  // hr_assignmentsはhr_employments.idに紐づくため、雇用履歴のID一覧が確定してから取得する。
  const [{ data: employmentsRaw }, { data: addressesRaw }] = await Promise.all([
    supabase
      .from("hr_employments")
      .select(
        "id, hired_on, retired_on, retirement_reason, employment_category, salary_category, is_rehire, employees(employee_code, companies(name))"
      )
      .eq("person_id", personId)
      .order("hired_on", { ascending: false }),
    supabase
      .from("hr_employee_addresses")
      .select("id, effective_from, effective_to, postal_code, address, phone, emergency_contact")
      .eq("person_id", personId)
      .order("effective_from", { ascending: false }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const employments = (employmentsRaw ?? []) as any as EmploymentRow[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addresses = (addressesRaw ?? []) as any as AddressRow[];

  const employmentIds = employments.map((e) => e.id);
  const { data: assignmentsRaw } =
    employmentIds.length > 0
      ? await supabase
          .from("hr_assignments")
          .select("id, employment_id, department, position, effective_from, effective_to, change_type, stores(name)")
          .in("employment_id", employmentIds)
          .order("effective_from", { ascending: false })
      : { data: [] as AssignmentRow[] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assignments = (assignmentsRaw ?? []) as any as AssignmentRow[];

  // 発効日降順で取得済みのため、グルーピング後も各グループ内は発効日降順のまま保たれる。
  const assignmentsByEmployment = new Map<string, AssignmentRow[]>();
  for (const a of assignments) {
    const list = assignmentsByEmployment.get(a.employment_id) ?? [];
    list.push(a);
    assignmentsByEmployment.set(a.employment_id, list);
  }

  const primaryEmployment = employments[0] ?? null;
  const headerSubtitleParts = [
    primaryEmployment?.employees?.employee_code,
    primaryEmployment?.employees?.companies?.name,
  ].filter((v): v is string => Boolean(v));

  // 住所は発効日降順で取得済みのため、先頭(最新の発効日)を現在の住所、残りを履歴として扱う
  // (仕様書5.1「上書きせず履歴として保持」)。
  const currentAddress = addresses[0] ?? null;
  const pastAddresses = addresses.slice(1);

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6">
      <PageHeader
        backHref="/hr/employees"
        backLabel="社員一覧に戻る"
        title={person.full_name}
        subtitle={headerSubtitleParts.length > 0 ? headerSubtitleParts.join(" / ") : undefined}
      />

      {/* 基本情報 */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">基本情報</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium text-slate-500">氏名</dt>
              <dd className="mt-1 text-sm text-slate-900">{person.full_name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">フリガナ</dt>
              <dd className="mt-1 text-sm text-slate-900">{orNotRegistered(person.full_name_kana)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">生年月日</dt>
              <dd className="mt-1 text-sm text-slate-900">{formatDate(person.birth_date)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">性別</dt>
              <dd className="mt-1 text-sm text-slate-900">{orNotRegistered(person.gender_code)}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* 雇用履歴(再入社等により複数件になり得るため、入社日が新しい順に1件ずつブロック表示) */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">雇用履歴</h2>
        {employments.length === 0 ? (
          <EmptyState message="雇用履歴が登録されていません。" />
        ) : (
          <div className="space-y-4">
            {employments.map((emp) => {
              const isCurrent = emp.retired_on === null;
              const categoryBadgeClass = emp.employment_category?.includes("正社員") ? GREEN : SLATE;

              return (
                <div
                  key={emp.id}
                  className={`rounded-xl border bg-white p-4 shadow-sm ${
                    isCurrent ? "border-blue-300 ring-1 ring-blue-100" : "border-slate-200"
                  }`}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge label={isCurrent ? "現在" : "過去"} className={isCurrent ? GREEN : SLATE} />
                    {emp.employment_category && (
                      <Badge label={emp.employment_category} className={categoryBadgeClass} />
                    )}
                    {emp.is_rehire && <Badge label="再入社" className={AMBER} />}
                    <span className="text-xs text-slate-400">
                      {emp.employees?.companies?.name ?? "会社未設定"}
                      {emp.employees?.employee_code ? `（${emp.employees.employee_code}）` : ""}
                    </span>
                  </div>

                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                    <div>
                      <dt className="text-xs font-medium text-slate-500">入社日</dt>
                      <dd className="mt-1 text-sm text-slate-900">{formatDate(emp.hired_on)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">退職日</dt>
                      <dd className="mt-1 text-sm text-slate-900">{formatDate(emp.retired_on)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">退職理由</dt>
                      <dd className="mt-1 text-sm text-slate-900">{orNotRegistered(emp.retirement_reason)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">給与区分</dt>
                      <dd className="mt-1 text-sm text-slate-900">{orNotRegistered(emp.salary_category)}</dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 住所(発効日付き履歴。最新を現在の住所として強調し、過去の行は履歴として一覧表示) */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">住所</h2>
        {!currentAddress ? (
          <EmptyState message="住所が登録されていません。" />
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-blue-300 bg-white p-4 shadow-sm ring-1 ring-blue-100">
              <div className="mb-2 flex items-center gap-2">
                <Badge label="現在" className={GREEN} />
                <span className="text-xs text-slate-400">適用開始: {formatDate(currentAddress.effective_from)}</span>
              </div>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-slate-500">郵便番号</dt>
                  <dd className="mt-1 text-sm text-slate-900">{orNotRegistered(currentAddress.postal_code)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">住所</dt>
                  <dd className="mt-1 text-sm text-slate-900">{orNotRegistered(currentAddress.address)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">電話番号</dt>
                  <dd className="mt-1 text-sm text-slate-900">{orNotRegistered(currentAddress.phone)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">緊急連絡先</dt>
                  <dd className="mt-1 text-sm text-slate-900">{orNotRegistered(currentAddress.emergency_contact)}</dd>
                </div>
              </dl>
            </div>

            {pastAddresses.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-3">
                  <h3 className="text-xs font-semibold text-slate-500">住所履歴</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">
                        <th className="whitespace-nowrap px-4 py-2">適用期間</th>
                        <th className="whitespace-nowrap px-4 py-2">郵便番号</th>
                        <th className="whitespace-nowrap px-4 py-2">住所</th>
                        <th className="whitespace-nowrap px-4 py-2">電話番号</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pastAddresses.map((a) => (
                        <tr key={a.id}>
                          <td className="whitespace-nowrap px-4 py-2 text-slate-600">
                            {formatDate(a.effective_from)} 〜 {a.effective_to ? formatDate(a.effective_to) : ""}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-slate-600">{orNotRegistered(a.postal_code)}</td>
                          <td className="px-4 py-2 text-slate-600">{orNotRegistered(a.address)}</td>
                          <td className="whitespace-nowrap px-4 py-2 text-slate-600">{orNotRegistered(a.phone)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 所属・異動履歴(雇用履歴ごとに現在の所属+過去の異動履歴を表示) */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">所属・異動履歴</h2>
        {employments.length === 0 ? (
          <EmptyState message="所属・異動履歴が登録されていません。" />
        ) : (
          <div className="space-y-4">
            {employments.map((emp) => {
              const empAssignments = assignmentsByEmployment.get(emp.id) ?? [];
              const currentAssignment = empAssignments[0] ?? null;
              const pastAssignments = empAssignments.slice(1);
              const empLabel = [
                emp.employees?.companies?.name ?? "会社未設定",
                `入社日: ${formatDate(emp.hired_on)}`,
              ].join(" / ");

              return (
                <div key={emp.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 py-3">
                    <h3 className="text-xs font-semibold text-slate-500">{empLabel}</h3>
                  </div>
                  <div className="px-5 py-4">
                    {empAssignments.length === 0 ? (
                      <p className="text-xs text-slate-400">登録されていません。</p>
                    ) : (
                      <div className="space-y-2">
                        {currentAssignment && <AssignmentRowView assignment={currentAssignment} current />}
                        {pastAssignments.map((a) => (
                          <AssignmentRowView key={a.id} assignment={a} current={false} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
