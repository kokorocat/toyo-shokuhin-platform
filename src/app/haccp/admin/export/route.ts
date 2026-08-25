// HM-*管理者ダッシュボードのCSV出力エンドポイント(仕様書6「CSV・Excel出力は検索条件を反映し、
// 出力者・日時・条件を監査ログに保存する」)。ページではなくRoute Handlerとして実装する。
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isHaccpAdminRole } from "@/app/haccp/admin/guard";
import { todayInTokyo } from "@/lib/date";
import {
  getScopedStores,
  computeKeypointStatus,
  computeEmployeeStatus,
  computeInspectionStatus,
  type HaccpAdminFilters,
  type KeypointStatus,
  type EmployeeStatus,
  type InspectionStatus,
} from "@/lib/haccp/admin-dashboard";

type ExportType = "keypoint" | "employee" | "inspection";

const EXPORT_TYPES = new Set<ExportType>(["keypoint", "employee", "inspection"]);

function isExportType(value: string | null): value is ExportType {
  return value !== null && EXPORT_TYPES.has(value as ExportType);
}

/** 対象日: YYYY-MM-DD形式でなければ本日にフォールバック(未指定時のデフォルトも本日)。 */
function normalizeDate(input: string | null): string {
  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  return todayInTokyo();
}

/** 対象月: computeInspectionStatusはYYYY-MM-01を要求するため、<input type="month">が返す
 *  "YYYY-MM"や日付付き入力も含めて月初日に正規化する。不正・未指定時は今月にフォールバック。 */
function normalizeMonth(input: string | null): string {
  const fallback = `${todayInTokyo().slice(0, 7)}-01`;
  if (!input) return fallback;
  const m = input.match(/^(\d{4}-\d{2})(?:-\d{2})?$/);
  if (!m) return fallback;
  return `${m[1]}-01`;
}

/** CSVフィールドのエスケープ(カンマ・ダブルクォート・改行を含む値も安全に埋め込む)。 */
function csvField(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function csvRow(fields: (string | number)[]): string {
  return fields.map(csvField).join(",") + "\r\n";
}

function keypointRowValues(status: KeypointStatus | undefined): { label: string; improvement: string } {
  if (!status) return { label: "対象外", improvement: "" };
  switch (status.status) {
    case "answered":
      return { label: "回答済", improvement: status.needsImprovement ? "はい" : "いいえ" };
    case "unanswered":
      return { label: "未回答", improvement: "" };
    case "holiday":
      return { label: "店休日", improvement: "" };
    case "out_of_scope":
      return { label: "対象外", improvement: "" };
  }
}

// 5.2の注記: 従業員衛生は勤怠データ未連携のため「未回答」と断定しない。
// ステータスラベルは「記録あり/記録なし/店休日/対象外」を用いる(「未回答」は使わない)。
function employeeRowValues(
  status: EmployeeStatus | undefined
): { label: string; count: string; needsAction: string } {
  if (!status) return { label: "対象外", count: "", needsAction: "" };
  switch (status.status) {
    case "recorded":
      return {
        label: "記録あり",
        count: String(status.responseCount),
        needsAction: status.hasIssue ? "はい" : "いいえ",
      };
    case "not_recorded":
      return { label: "記録なし", count: "", needsAction: "" };
    case "holiday":
      return { label: "店休日", count: "", needsAction: "" };
    case "out_of_scope":
      return { label: "対象外", count: "", needsAction: "" };
  }
}

function inspectionRowValues(status: InspectionStatus | undefined): { label: string; improvement: string } {
  if (!status) return { label: "対象外", improvement: "" };
  switch (status.status) {
    case "answered":
      return { label: "回答済", improvement: status.needsImprovement ? "はい" : "いいえ" };
    case "unanswered":
      return { label: "未回答", improvement: "" };
    case "out_of_scope":
      return { label: "対象外", improvement: "" };
  }
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const typeParam = params.get("type");
  if (!isExportType(typeParam)) {
    return new Response(
      "typeパラメータが不正です。keypoint・employee・inspectionのいずれかを指定してください。",
      { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }
  const type: ExportType = typeParam;

  const ctx = await getPortalContext();
  if (!ctx || !isHaccpAdminRole(ctx.roleCode)) {
    return new Response("権限がありません", { status: 403 });
  }

  const filters: HaccpAdminFilters = {
    companyId: params.get("companyId") || undefined,
    blockId: params.get("blockId") || undefined,
    areaId: params.get("areaId") || undefined,
    storeCode: params.get("storeCode") || undefined,
    storeName: params.get("storeName") || undefined,
  };

  const supabase = await createClient();
  const stores = await getScopedStores(supabase, filters);

  let header: string;
  let dataRows: string[];
  let periodLabel: string;

  if (type === "keypoint") {
    const date = normalizeDate(params.get("date"));
    periodLabel = date;
    const statusMap = await computeKeypointStatus(supabase, stores, date);
    header = csvRow(["店舗コード", "店舗名", "エリア", "対象日", "回答状態", "要改善"]);
    dataRows = stores.map((store) => {
      const { label, improvement } = keypointRowValues(statusMap.get(store.id));
      return csvRow([store.store_code, store.name, store.area_name ?? "", date, label, improvement]);
    });
  } else if (type === "employee") {
    const date = normalizeDate(params.get("date"));
    periodLabel = date;
    const statusMap = await computeEmployeeStatus(supabase, stores, date);
    header = csvRow(["店舗コード", "店舗名", "エリア", "対象日", "回答状態", "回答人数", "要対応"]);
    dataRows = stores.map((store) => {
      const { label, count, needsAction } = employeeRowValues(statusMap.get(store.id));
      return csvRow([store.store_code, store.name, store.area_name ?? "", date, label, count, needsAction]);
    });
  } else {
    const month = normalizeMonth(params.get("month"));
    periodLabel = month;
    const statusMap = await computeInspectionStatus(supabase, stores, month);
    header = csvRow(["店舗コード", "店舗名", "エリア", "対象月", "回答状態", "要改善"]);
    dataRows = stores.map((store) => {
      const { label, improvement } = inspectionRowValues(statusMap.get(store.id));
      return csvRow([store.store_code, store.name, store.area_name ?? "", month, label, improvement]);
    });
  }

  // ExcelでのUTF-8文字化け対策としてBOMを付与する(既知のExcel/UTF-8の落とし穴)。
  const csvBody = "\uFEFF" + header + dataRows.join("");

  // 監査ログ記録(仕様書6)。ここでの失敗はダウンロード自体をブロックしない既知のトレードオフ
  // (監査ログが1件欠けるより、出力者が業務に必要なCSVを受け取れる方を優先する)。
  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_id: ctx.userId,
    system_code: "haccp",
    action: "csv_export",
    target_table:
      type === "keypoint"
        ? "haccp_keypoint_responses"
        : type === "employee"
          ? "haccp_employee_responses"
          : "haccp_inspections",
    target_id: null,
    after_data: { type, ...filters, period: periodLabel, rowCount: dataRows.length },
  });
  if (auditError) {
    console.error("[haccp/admin/export] audit log insert failed", auditError);
  }

  return new Response(csvBody, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="haccp_${type}_${periodLabel}.csv"`,
    },
  });
}
