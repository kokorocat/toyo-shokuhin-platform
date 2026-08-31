// HM-20 回答詳細・履歴(店舗別)(仕様書6「管理者機能」)。
// HM-10(店舗別回答状況)の行から遷移し、選択中の対象日・対象月を引き継いで表示する。
// 集計ロジックはHM-00/HM-10と共有(admin-dashboard.ts)だが、この画面は集計ではなく
// 「回答本文・訂正履歴・責任者確認・監査ログ」という記録そのものを表示するため、
// 各haccpテーブルを直接(全バージョン)取得する。
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isHaccpAdminRole } from "@/app/haccp/admin/guard";
import { getHalfMonthPeriod } from "@/lib/haccp/admin-dashboard";
import { EmptyState } from "@/components/EmptyState";
import { Banner } from "@/components/Banner";
import { SubmitButton } from "@/components/SubmitButton";
import { todayInTokyo } from "@/lib/date";
import { KEYPOINT_ITEMS } from "@/app/haccp/keypoint/constants";
import { INSPECTION_QUESTIONS } from "@/app/haccp/inspection/constants";
import { regenerateKioskToken } from "./actions";
import { confirmHalfMonth } from "@/app/haccp/actions";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

const EMPLOYEE_ITEM_ORDER = [
  "handwash",
  "clean_uniform",
  "proper_cap",
  "nails",
  "no_accessory",
  "skin_injury",
  "stomach_symptom",
  "body_temp",
] as const;

const EMPLOYEE_ITEM_LABELS: Record<string, string> = {
  handwash: "正しい手洗いができているか",
  clean_uniform: "清潔な白衣・エプロンを着用しているか",
  proper_cap: "正しい帽子を着用しているか",
  nails: "爪は短く切ってあるか",
  no_accessory: "不要なアクセサリーを着用していないか",
  skin_injury: "手荒れ・傷がないか",
  stomach_symptom: "下痢・嘔吐・吐き気等の症状がないか",
  body_temp: "体温は37.5℃以下か",
};

const JUDGMENT_LABELS: Record<string, string> = { ok: "OK", ng: "NG" };
const EMPLOYEE_ANSWER_LABELS: Record<string, string> = { good: "良好", bad: "異常" };
const EVALUATION_LABELS: Record<string, string> = { good: "良好", needs_improvement: "要改善" };
const CONFIRMATION_STATUS_LABELS: Record<string, string> = { confirmed: "確認済", needs_action: "要対応" };

const AUDIT_TABLES = [
  "haccp_keypoint_responses",
  "haccp_employee_responses",
  "haccp_inspections",
  "manager_confirmations",
] as const;

const AUDIT_TABLE_LABELS: Record<string, string> = {
  haccp_keypoint_responses: "重要ポイント・温度・ラベル",
  haccp_employee_responses: "従業員衛生",
  haccp_inspections: "食品衛生自主点検",
  manager_confirmations: "責任者確認",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

function formatMonth(targetMonth: string): string {
  const [y, m] = targetMonth.slice(0, 7).split("-");
  return `${y}年${Number(m)}月`;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) sp.set(key, value);
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

type VersionMeta = { version: number; createdAt: string; recordedByName: string };

function versionTransitions(rowsDescByVersion: VersionMeta[]): { key: string; text: string }[] {
  const asc = [...rowsDescByVersion].reverse();
  const items: { key: string; text: string }[] = [];
  for (let i = 0; i < asc.length - 1; i++) {
    const a = asc[i];
    const b = asc[i + 1];
    items.push({
      key: `${a.version}-${b.version}`,
      text: `v${a.version} → v${b.version}: ${formatDateTime(b.createdAt)} 登録（${b.recordedByName}）`,
    });
  }
  return items.reverse();
}

function HistoryList({ entries }: { entries: VersionMeta[] }) {
  const transitions = versionTransitions(entries);
  if (transitions.length === 0) return null;
  return (
    <div className="mt-4 border-t border-slate-100 pt-3">
      <p className="mb-1.5 text-xs font-semibold text-slate-400">訂正履歴</p>
      <ul className="space-y-1">
        {transitions.map((t) => (
          <li key={t.key} className="text-xs text-slate-500">
            {t.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

type NamedActor = { display_name: string } | null;

type KeypointResponseRow = {
  id: string;
  version: number;
  created_at: string;
  confirmed_by_name: string | null;
  user_profiles: NamedActor;
  haccp_keypoint_items: { item_code: string; judgment: string; note: string | null }[];
  haccp_temperature_labels: {
    label_type: string;
    measured_value: number | null;
    judgment: string | null;
    note: string | null;
  }[];
};

type EmployeeResponseRow = {
  id: string;
  employee_id: string | null;
  manual_name: string | null;
  is_unmatched: boolean;
  version: number;
  created_at: string;
  user_profiles: NamedActor;
  employees: { full_name: string } | null;
  haccp_employee_items: { item_code: string; answer: string; note: string | null; action_taken: string | null }[];
};

type InspectionRow = {
  id: string;
  version: number;
  created_at: string;
  submitted_on: string;
  overall_evaluation: string;
  implementer_name: string;
  store_manager_name: string | null;
  hygiene_officer_name: string | null;
  area_manager_name: string | null;
  area_hygiene_officer_name: string | null;
  improvement_reason: string | null;
  self_evaluation: string | null;
  special_notes: string | null;
  business_license_expiry_date: string | null;
  user_profiles: NamedActor;
  haccp_inspection_items: { question_code: string; answer: string; reason: string | null; action_taken: string | null }[];
};

type ConfirmationRow = {
  id: string;
  version: number;
  confirmed_on: string;
  comment: string | null;
  status: string;
  created_at: string;
  user_profiles: NamedActor;
};

type AuditLogRow = {
  id: string;
  action: string;
  target_table: string | null;
  target_id: string | null;
  occurred_at: string;
  user_profiles: NamedActor;
};

type HolidayRow = {
  id: string;
  holiday_date: string;
  reason: string | null;
  status: string;
  created_at: string;
  user_profiles: NamedActor;
};

export default async function HaccpAdminStoreDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeId: string }>;
  searchParams: Promise<{
    date?: string;
    month?: string;
    kioskError?: string;
    kioskSuccess?: string;
    confirmError?: string;
    confirmSuccess?: string;
  }>;
}) {
  const { storeId } = await params;
  const sp = await searchParams;
  const ctx = await getPortalContext();

  if (!ctx || !isHaccpAdminRole(ctx.roleCode ?? null)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">
          この画面を表示する権限がありません。管理者権限を持つアカウントで再ログインしてください。
        </p>
      </div>
    );
  }

  const targetDate = sp.date && DATE_RE.test(sp.date) ? sp.date : todayInTokyo();
  const monthValue = sp.month && MONTH_RE.test(sp.month) ? sp.month : todayInTokyo().slice(0, 7);
  const targetMonth = `${monthValue}-01`;
  const period = getHalfMonthPeriod(targetDate);

  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id, store_code, name, company_id, area_id, public_access_token, areas(name)")
    .eq("id", storeId)
    .maybeSingle();

  if (!store) notFound();

  const hdrs = await headers();
  const host = hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  const kioskUrl = host ? `${proto}://${host}/haccp/kiosk/${store.public_access_token}` : `/haccp/kiosk/${store.public_access_token}`;

  const [
    { data: keypointRowsRaw },
    { data: employeeRowsRaw },
    { data: inspectionRowsRaw },
    { data: confirmationRowsRaw },
    { data: auditRowsRaw },
    { data: holidayRowsRaw },
  ] = await Promise.all([
    supabase
      .from("haccp_keypoint_responses")
      .select(
        "id, version, created_at, confirmed_by_name, user_profiles(display_name), haccp_keypoint_items(item_code,judgment,note), haccp_temperature_labels(label_type,measured_value,judgment,note)"
      )
      .eq("store_id", storeId)
      .eq("target_date", targetDate)
      .order("version", { ascending: false }),
    supabase
      .from("haccp_employee_responses")
      .select(
        "id, employee_id, manual_name, is_unmatched, version, created_at, user_profiles(display_name), employees(full_name), haccp_employee_items(item_code,answer,note,action_taken)"
      )
      .eq("store_id", storeId)
      .eq("target_date", targetDate)
      .order("version", { ascending: false }),
    supabase
      .from("haccp_inspections")
      .select(
        "id, version, created_at, submitted_on, overall_evaluation, implementer_name, store_manager_name, hygiene_officer_name, area_manager_name, area_hygiene_officer_name, improvement_reason, self_evaluation, special_notes, business_license_expiry_date, user_profiles(display_name), haccp_inspection_items(question_code,answer,reason,action_taken)"
      )
      .eq("store_id", storeId)
      .eq("target_month", targetMonth)
      .order("version", { ascending: false }),
    supabase
      .from("manager_confirmations")
      .select("id, version, confirmed_on, comment, status, created_at, user_profiles(display_name)")
      .eq("store_id", storeId)
      .eq("period_type", "half_month")
      .eq("period_start", period.start)
      .eq("period_end", period.end)
      .order("version", { ascending: false }),
    supabase
      .from("audit_logs")
      .select("id, action, target_table, target_id, occurred_at, user_profiles(display_name)")
      .in("target_table", [...AUDIT_TABLES])
      .order("occurred_at", { ascending: false })
      .limit(300),
    supabase
      .from("store_holidays")
      .select("id, holiday_date, reason, status, created_at, user_profiles(display_name)")
      .eq("store_id", storeId)
      .eq("status", "active")
      .order("holiday_date", { ascending: false })
      .limit(30),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keypointRows = (keypointRowsRaw ?? []) as any as KeypointResponseRow[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const employeeRows = (employeeRowsRaw ?? []) as any as EmployeeResponseRow[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inspectionRows = (inspectionRowsRaw ?? []) as any as InspectionRow[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const confirmationRows = (confirmationRowsRaw ?? []) as any as ConfirmationRow[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const auditRowsAll = (auditRowsRaw ?? []) as any as AuditLogRow[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const holidayRows = (holidayRowsRaw ?? []) as any as HolidayRow[];

  const relevantAuditIds = new Set<string>([
    ...keypointRows.map((r) => r.id),
    ...employeeRows.map((r) => r.id),
    ...inspectionRows.map((r) => r.id),
    ...confirmationRows.map((r) => r.id),
  ]);
  const auditLogs = auditRowsAll.filter((a) => a.target_id && relevantAuditIds.has(a.target_id));

  const areaName = (store.areas as { name: string } | null)?.name ?? null;

  const backHref = `/haccp/admin/stores${buildQuery({ date: targetDate, month: monthValue })}`;

  const latestKeypoint = keypointRows[0] ?? null;
  const keypointItemsByCode = new Map(
    (latestKeypoint?.haccp_keypoint_items ?? []).map((i) => [i.item_code, i])
  );
  const temperatureCheck = latestKeypoint?.haccp_temperature_labels.find((l) => l.label_type === "temperature");
  const labelCheck = latestKeypoint?.haccp_temperature_labels.find((l) => l.label_type === "label");

  const employeeGroups = new Map<string, EmployeeResponseRow[]>();
  for (const r of employeeRows) {
    const key = r.employee_id ?? `manual:${r.manual_name ?? ""}`;
    const list = employeeGroups.get(key) ?? [];
    list.push(r);
    employeeGroups.set(key, list);
  }
  const employeeEntries = [...employeeGroups.entries()].sort(([, a], [, b]) => {
    const nameA = a[0].employees?.full_name ?? a[0].manual_name ?? "";
    const nameB = b[0].employees?.full_name ?? b[0].manual_name ?? "";
    return nameA.localeCompare(nameB, "ja");
  });

  const latestInspection = inspectionRows[0] ?? null;
  const inspectionItemsByCode = new Map(
    (latestInspection?.haccp_inspection_items ?? []).map((i) => [i.question_code, i])
  );

  const latestConfirmation = confirmationRows[0] ?? null;

  return (
    <div className="min-h-screen bg-white">
      {/* Teal gradient header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-400 px-4 py-4 text-white shadow-md">
        <h1 className="text-lg font-bold">{store.name}（{store.store_code}）</h1>
        <p className="mt-0.5 text-sm text-teal-100">
          {areaName ?? "エリア未設定"} / 対象日: {targetDate} ・ 対象月: {formatMonth(targetMonth)} ・ 責任者確認期間: {period.start} 〜 {period.end}
        </p>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <a href={backHref} className="text-sm text-teal-600 hover:underline">
          ← 店舗一覧に戻る
        </a>

        {/* Section navigation — pill tabs */}
        <nav className="mt-6 mb-6 flex flex-wrap gap-2" aria-label="ページ内リンク">
          {[
            { id: "keypoint", label: "重要ポイント" },
            { id: "employee", label: "従業員衛生" },
            { id: "inspection", label: "自主点検" },
            { id: "confirmation", label: "責任者確認" },
            { id: "holiday", label: "店休日" },
            { id: "audit", label: "監査ログ" },
          ].map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700"
            >
              {s.label}
            </a>
          ))}
        </nav>

        {/* Kiosk link */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-blue-50 px-5 py-3">
            <h2 className="text-base font-bold text-blue-800">ログイン不要の入力用リンク</h2>
            <p className="mt-1 text-xs text-slate-500">
              店舗のタブレット等にブックマークしておくと、ログインせずに衛生チェックを入力できます。
            </p>
          </div>
          <div className="px-5 py-4">
            {sp.kioskSuccess && (
              <div className="mb-3">
                <Banner variant="success">リンクを再発行しました。以前のリンクは無効になります。</Banner>
              </div>
            )}
            {sp.kioskError && (
              <div className="mb-3">
                <Banner variant="error">{sp.kioskError}</Banner>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <code className="min-w-0 flex-1 break-all rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {kioskUrl}
              </code>
              <form action={regenerateKioskToken}>
                <input type="hidden" name="store_id" value={store.id} />
                <SubmitButton
                  className="shrink-0 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white"
                  pendingText="再発行中..."
                >
                  リンクを再発行
                </SubmitButton>
              </form>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              ※リンクを再発行すると、これまでのリンクは使えなくなります。流出時や端末紛失時のみご利用ください。
            </p>
          </div>
        </div>

        {/* 重要ポイント・温度・ラベル */}
        <section id="keypoint" className="mb-8 scroll-mt-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-200" />
            <h2 className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-400">
              重要ポイント・温度・ラベル（対象日: {targetDate}）
            </h2>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          {!latestKeypoint ? (
            <EmptyState message="この対象日の重要ポイント・温度・ラベルの回答はありません。" />
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-blue-50 px-5 py-3">
                <h3 className="text-base font-bold text-blue-800">最新の回答内容</h3>
                <p className="text-xs text-slate-400">
                  v{latestKeypoint.version} ・確認者：{latestKeypoint.confirmed_by_name ?? "-"} ・記録者：
                  {latestKeypoint.user_profiles?.display_name ?? "(不明)"} ・{" "}
                  {formatDateTime(latestKeypoint.created_at)} 登録
                </p>
              </div>
              <div className="px-5 py-4">
                <ul className="mb-4 space-y-2">
                  {KEYPOINT_ITEMS.map(({ code, label }) => {
                    const item = keypointItemsByCode.get(code);
                    const isNg = item?.judgment === "ng";
                    return (
                      <li key={code} className="flex items-center gap-3 text-sm text-slate-700">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            !item
                              ? "bg-slate-100 text-slate-500"
                              : isNg
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                          }`}
                        >
                          {!item ? "未回答" : isNg ? "否" : "良"}
                        </span>
                        <span>{label}</span>
                        {item?.note && <span className="text-xs text-slate-400">({item.note})</span>}
                      </li>
                    );
                  })}
                </ul>
                <div className="grid grid-cols-1 gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 sm:grid-cols-2">
                  <p>
                    <span className="font-medium">温度チェック：</span>
                    {temperatureCheck ? (
                      <span className={temperatureCheck.judgment === "ng" ? "font-semibold text-red-700" : undefined}>
                        {temperatureCheck.measured_value ?? "-"}℃ /{" "}
                        {temperatureCheck.judgment
                          ? (JUDGMENT_LABELS[temperatureCheck.judgment] ?? temperatureCheck.judgment)
                          : "-"}
                        {temperatureCheck.note ? ` (${temperatureCheck.note})` : ""}
                      </span>
                    ) : (
                      "未記録"
                    )}
                  </p>
                  <p>
                    <span className="font-medium">ラベルチェック：</span>
                    {labelCheck ? (
                      <span className={labelCheck.judgment === "ng" ? "font-semibold text-red-700" : undefined}>
                        {labelCheck.judgment ? (JUDGMENT_LABELS[labelCheck.judgment] ?? labelCheck.judgment) : "-"}
                        {labelCheck.note ? ` (${labelCheck.note})` : ""}
                      </span>
                    ) : (
                      "未記録"
                    )}
                  </p>
                </div>
                <HistoryList
                  entries={keypointRows.map((r) => ({
                    version: r.version,
                    createdAt: r.created_at,
                    recordedByName: r.user_profiles?.display_name ?? "(不明)",
                  }))}
                />
              </div>
            </div>
          )}
        </section>

        {/* 従業員衛生 */}
        <section id="employee" className="mb-8 scroll-mt-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-200" />
            <h2 className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-400">
              従業員衛生（対象日: {targetDate}）
            </h2>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          {employeeEntries.length === 0 ? (
            <EmptyState message="この対象日の従業員衛生チェックの記録はありません。" />
          ) : (
            <div className="space-y-3">
              {employeeEntries.map(([key, rows]) => {
                const latest = rows[0];
                const displayName = latest.employees?.full_name ?? latest.manual_name ?? "(氏名不明)";
                const itemsByCode = new Map(latest.haccp_employee_items.map((i) => [i.item_code, i]));
                const hasBad = latest.haccp_employee_items.some((i) => i.answer === "bad");
                return (
                  <div
                    key={key}
                    className={`rounded-xl border shadow-sm ${
                      hasBad ? "border-red-200 bg-red-50/40" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{displayName}</p>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                            hasBad ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                          }`}
                        >
                          {hasBad ? "要対応" : "良好"}
                        </span>
                        {latest.is_unmatched && (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                            コード未一致
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        v{latest.version} ・ {latest.user_profiles?.display_name ?? "(不明)"} ・{" "}
                        {formatDateTime(latest.created_at)} 登録
                      </p>
                    </div>
                    <div className="px-5 py-4">
                      <ul className="space-y-1.5">
                        {EMPLOYEE_ITEM_ORDER.map((code) => {
                          const item = itemsByCode.get(code);
                          const bad = item?.answer === "bad";
                          return (
                            <li key={code} className={`text-sm ${bad ? "text-red-700" : "text-slate-700"}`}>
                              <span
                                className={`mr-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                                  bad ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                                }`}
                              >
                                {item ? (EMPLOYEE_ANSWER_LABELS[item.answer] ?? item.answer) : "-"}
                              </span>
                              {EMPLOYEE_ITEM_LABELS[code]}
                              {bad && item?.note && <span className="ml-2 text-xs">備考: {item.note}</span>}
                              {bad && item?.action_taken && (
                                <span className="ml-2 text-xs">対応: {item.action_taken}</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                      <HistoryList
                        entries={rows.map((r) => ({
                          version: r.version,
                          createdAt: r.created_at,
                          recordedByName: r.user_profiles?.display_name ?? "(不明)",
                        }))}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 食品衛生自主点検 */}
        <section id="inspection" className="mb-8 scroll-mt-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-200" />
            <h2 className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-400">
              食品衛生自主点検（対象月: {formatMonth(targetMonth)}）
            </h2>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          {!latestInspection ? (
            <EmptyState message="この対象月の食品衛生自主点検の記録はありません。" />
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-blue-50 px-5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-blue-800">最新の回答内容</h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                      latestInspection.overall_evaluation === "needs_improvement"
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {EVALUATION_LABELS[latestInspection.overall_evaluation] ?? latestInspection.overall_evaluation}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  v{latestInspection.version} ・ {latestInspection.user_profiles?.display_name ?? "(不明)"} ・{" "}
                  {formatDateTime(latestInspection.created_at)} 登録 / 提出日 {latestInspection.submitted_on}
                </p>
              </div>
              <div className="px-5 py-4">
                <div className="mb-4 grid grid-cols-1 gap-1 text-sm text-slate-600 sm:grid-cols-3">
                  <p>
                    <span className="font-medium text-slate-700">実施者：</span>
                    {latestInspection.implementer_name}
                  </p>
                  <p>
                    <span className="font-medium text-slate-700">店長：</span>
                    {latestInspection.store_manager_name ?? "-"}
                  </p>
                  <p>
                    <span className="font-medium text-slate-700">食品衛生責任者：</span>
                    {latestInspection.hygiene_officer_name ?? "-"}
                  </p>
                  <p>
                    <span className="font-medium text-slate-700">エリア長：</span>
                    {latestInspection.area_manager_name ?? "-"}
                  </p>
                  <p>
                    <span className="font-medium text-slate-700">エリア衛生担当者：</span>
                    {latestInspection.area_hygiene_officer_name ?? "-"}
                  </p>
                  <p>
                    <span className="font-medium text-slate-700">営業許可証有効期限：</span>
                    {latestInspection.business_license_expiry_date ?? "-"}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100 text-xs font-bold text-slate-500">
                        <th className="px-2 py-2">#</th>
                        <th className="px-2 py-2">設問</th>
                        <th className="px-2 py-2">回答</th>
                        <th className="px-2 py-2">理由・対応</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {INSPECTION_QUESTIONS.map((q, idx) => {
                        const item = inspectionItemsByCode.get(q.code);
                        const bad = item?.answer === "needs_improvement";
                        return (
                          <tr key={q.code} className={bad ? "bg-amber-50" : idx % 2 === 1 ? "bg-slate-50/60" : undefined}>
                            <td className="px-2 py-2 text-slate-400">{idx + 1}</td>
                            <td className="px-2 py-2 text-slate-700">{q.text}</td>
                            <td className="px-2 py-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                                  bad ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                                }`}
                              >
                                {item ? (EVALUATION_LABELS[item.answer] ?? item.answer) : "-"}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-xs text-slate-500">
                              {[item?.reason, item?.action_taken].filter(Boolean).join(" / ") || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {latestInspection.improvement_reason && (
                  <Banner variant="warning" className="mt-4">
                    <p className="mb-1 font-medium">改善が必要な項目の詳細</p>
                    <p>{latestInspection.improvement_reason}</p>
                  </Banner>
                )}
                {latestInspection.self_evaluation && (
                  <p className="mt-4 text-sm text-slate-600">
                    <span className="font-medium text-slate-700">自主評価：</span>
                    <span
                      className={`ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                        latestInspection.self_evaluation === "needs_improvement"
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {EVALUATION_LABELS[latestInspection.self_evaluation] ?? latestInspection.self_evaluation}
                    </span>
                  </p>
                )}
                {latestInspection.special_notes && (
                  <Banner variant="info" className="mt-4">
                    <p className="mb-1 font-medium">特記事項</p>
                    <p>{latestInspection.special_notes}</p>
                  </Banner>
                )}
                <HistoryList
                  entries={inspectionRows.map((r) => ({
                    version: r.version,
                    createdAt: r.created_at,
                    recordedByName: r.user_profiles?.display_name ?? "(不明)",
                  }))}
                />
              </div>
            </div>
          )}
        </section>

        {/* 責任者確認 */}
        <section id="confirmation" className="mb-8 scroll-mt-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-200" />
            <h2 className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-400">
              責任者確認（期間: {period.start} 〜 {period.end}）
            </h2>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          {sp.confirmSuccess && (
            <div className="mb-3">
              <Banner variant="success">責任者確認を登録しました。</Banner>
            </div>
          )}
          {sp.confirmError && (
            <div className="mb-3">
              <Banner variant="error">{sp.confirmError}</Banner>
            </div>
          )}
          {!latestConfirmation ? (
            <EmptyState message="この期間の責任者確認はまだ登録されていません。" />
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-blue-50 px-5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-blue-800">最新の確認内容</h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                      latestConfirmation.status === "needs_action"
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {CONFIRMATION_STATUS_LABELS[latestConfirmation.status] ?? latestConfirmation.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  v{latestConfirmation.version} ・ {latestConfirmation.user_profiles?.display_name ?? "(不明)"} ・
                  確認日 {latestConfirmation.confirmed_on}
                </p>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-slate-700">{latestConfirmation.comment || "コメントはありません。"}</p>
                <HistoryList
                  entries={confirmationRows.map((r) => ({
                    version: r.version,
                    createdAt: r.created_at,
                    recordedByName: r.user_profiles?.display_name ?? "(不明)",
                  }))}
                />
              </div>
            </div>
          )}

          <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-blue-50 px-5 py-3">
              <h3 className="text-sm font-bold text-blue-800">この期間を確認する</h3>
            </div>
            <form action={confirmHalfMonth} className="space-y-3 px-5 py-4">
              <input type="hidden" name="company_id" value={store.company_id} />
              <input type="hidden" name="store_id" value={store.id} />
              <input type="hidden" name="admin_store_id" value={store.id} />
              <input type="hidden" name="period_start" value={period.start} />
              <input type="hidden" name="period_end" value={period.end} />
              <p className="text-sm text-slate-600">
                上記の記録を確認し、問題なければ確認登録してください。既に確認済みの場合も、再登録すると新しいバージョンとして履歴に残ります。
              </p>
              <input
                name="comment"
                placeholder="コメント（任意）"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <SubmitButton
                className="w-full rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
                pendingText="確認中..."
              >
                この期間を確認する
              </SubmitButton>
            </form>
          </div>
        </section>

        {/* 店休日 */}
        <section id="holiday" className="mb-8 scroll-mt-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-200" />
            <h2 className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-400">店休日(直近30件)</h2>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          {holidayRows.length === 0 ? (
            <EmptyState message="登録されている店休日はありません。" />
          ) : (
            <ul className="space-y-2">
              {holidayRows.map((h) => (
                <li key={h.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-800">{h.holiday_date}</span>
                    <span className="text-xs text-slate-400">
                      {h.user_profiles?.display_name ?? "(不明)"} ・ {formatDateTime(h.created_at)} 登録
                    </span>
                  </div>
                  {h.reason && <p className="mt-1 text-xs text-slate-500">{h.reason}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 監査ログ */}
        <section id="audit" className="scroll-mt-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-200" />
            <h2 className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-400">監査ログ</h2>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          {auditLogs.length === 0 ? (
            <EmptyState message="監査ログはありません。" />
          ) : (
            <ul className="space-y-2">
              {auditLogs.map((a) => (
                <li key={a.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-800">
                      {AUDIT_TABLE_LABELS[a.target_table ?? ""] ?? a.target_table ?? "-"} / {a.action}
                    </span>
                    <span className="text-xs text-slate-400">{formatDateTime(a.occurred_at)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">実行者: {a.user_profiles?.display_name ?? "(不明)"}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-400">
            ※監査ログの閲覧は全権限管理者(super_admin)のみに許可されています。会社別管理者・エリア管理者の
            アカウントで表示した場合、この一覧は常に空になります(仕様通りの挙動です)。
          </p>
        </section>
      </div>
    </div>
  );
}
