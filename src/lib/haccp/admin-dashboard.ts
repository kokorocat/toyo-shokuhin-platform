import type { SupabaseClient } from "@supabase/supabase-js";

export type HaccpAdminFilters = {
  companyId?: string;
  blockId?: string;
  areaId?: string;
  storeCode?: string;
  storeName?: string;
};

export type ScopedStore = {
  id: string;
  store_code: string;
  name: string;
  company_id: string;
  area_id: string | null;
  opened_on: string;
  closed_on: string | null;
  area_name: string | null;
  block_id: string | null;
};

export type KeypointStatus =
  | { status: "answered"; needsImprovement: boolean; responseId: string; version: number }
  | { status: "unanswered" }
  | { status: "holiday" }
  | { status: "out_of_scope" };

export type EmployeeStatus =
  | { status: "recorded"; responseCount: number; hasIssue: boolean }
  | { status: "not_recorded" }
  | { status: "holiday" }
  | { status: "out_of_scope" };

export type InspectionStatus =
  | { status: "answered"; needsImprovement: boolean; inspectionId: string; version: number }
  | { status: "unanswered" }
  | { status: "out_of_scope" };

export type ConfirmationStatus =
  | { status: "confirmed"; confirmedOn: string }
  | { status: "needs_action" }
  | { status: "unconfirmed" };

function latestByKey<T extends { store_id: string; version: number }>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    const existing = map.get(row.store_id);
    if (!existing || row.version > existing.version) map.set(row.store_id, row);
  }
  return map;
}

function isInScope(store: ScopedStore, targetDate: string): boolean {
  if (store.opened_on > targetDate) return false;
  if (store.closed_on && store.closed_on < targetDate) return false;
  return true;
}

/** 半月期間(1〜15日、16日〜月末)の開始日・終了日を返す(仕様書5.1) */
export function getHalfMonthPeriod(dateStr: string): { start: string; end: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d <= 15) {
    return { start: `${y}-${pad(m)}-01`, end: `${y}-${pad(m)}-15` };
  }
  const lastDay = new Date(y, m, 0).getDate();
  return { start: `${y}-${pad(m)}-16`, end: `${y}-${pad(m)}-${pad(lastDay)}` };
}

export async function getScopedStores(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  filters: HaccpAdminFilters
): Promise<ScopedStore[]> {
  let query = supabase
    .from("stores")
    .select("id, store_code, name, company_id, area_id, opened_on, closed_on, status, areas(name, block_id)")
    .eq("status", "active")
    .order("store_code");

  if (filters.companyId) query = query.eq("company_id", filters.companyId);
  if (filters.areaId) query = query.eq("area_id", filters.areaId);
  if (filters.storeCode) query = query.ilike("store_code", `%${filters.storeCode}%`);
  if (filters.storeName) query = query.ilike("name", `%${filters.storeName}%`);

  const { data, error } = await query;
  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stores: ScopedStore[] = (data ?? []).map((s: any) => ({
    id: s.id,
    store_code: s.store_code,
    name: s.name,
    company_id: s.company_id,
    area_id: s.area_id,
    opened_on: s.opened_on,
    closed_on: s.closed_on,
    area_name: s.areas?.name ?? null,
    block_id: s.areas?.block_id ?? null,
  }));

  // block_idはareas経由のため、DB側フィルタではなくここで絞り込む
  if (filters.blockId) stores = stores.filter((s) => s.block_id === filters.blockId);

  return stores;
}

export async function computeKeypointStatus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  stores: ScopedStore[],
  targetDate: string
): Promise<Map<string, KeypointStatus>> {
  const storeIds = stores.map((s) => s.id);
  const result = new Map<string, KeypointStatus>();
  if (storeIds.length === 0) return result;

  const [{ data: holidays }, { data: responses }] = await Promise.all([
    supabase
      .from("store_holidays")
      .select("store_id")
      .in("store_id", storeIds)
      .eq("holiday_date", targetDate)
      .eq("status", "active"),
    supabase
      .from("haccp_keypoint_responses")
      .select("id, store_id, version, haccp_keypoint_items(checked), haccp_temperature_labels(judgment)")
      .in("store_id", storeIds)
      .eq("target_date", targetDate),
  ]);

  const holidaySet = new Set((holidays ?? []).map((h) => h.store_id));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latest = latestByKey((responses ?? []) as any[]);

  for (const store of stores) {
    if (!isInScope(store, targetDate)) {
      result.set(store.id, { status: "out_of_scope" });
      continue;
    }
    if (holidaySet.has(store.id)) {
      result.set(store.id, { status: "holiday" });
      continue;
    }
    const response = latest.get(store.id);
    if (!response) {
      result.set(store.id, { status: "unanswered" });
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (response.haccp_keypoint_items ?? []) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const labels = (response.haccp_temperature_labels ?? []) as any[];
    const needsImprovement = items.some((i) => !i.checked) || labels.some((l) => l.judgment === "ng");
    result.set(store.id, {
      status: "answered",
      needsImprovement,
      responseId: response.id,
      version: response.version,
    });
  }

  return result;
}

export async function computeEmployeeStatus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  stores: ScopedStore[],
  targetDate: string
): Promise<Map<string, EmployeeStatus>> {
  const storeIds = stores.map((s) => s.id);
  const result = new Map<string, EmployeeStatus>();
  if (storeIds.length === 0) return result;

  const [{ data: holidays }, { data: responses }] = await Promise.all([
    supabase
      .from("store_holidays")
      .select("store_id")
      .in("store_id", storeIds)
      .eq("holiday_date", targetDate)
      .eq("status", "active"),
    supabase
      .from("haccp_employee_responses")
      .select("id, store_id, employee_id, manual_name, version, haccp_employee_items(answer)")
      .in("store_id", storeIds)
      .eq("target_date", targetDate),
  ]);

  const holidaySet = new Set((holidays ?? []).map((h) => h.store_id));

  // 従業員×日で最新版のみ残す(店舗×従業員識別子ごとにdedupe)
  const latestByIdentity = new Map<string, { store_id: string; version: number; hasIssue: boolean }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (responses ?? []) as any[]) {
    const key = `${r.store_id}::${r.employee_id ?? `manual:${r.manual_name ?? ""}`}`;
    const existing = latestByIdentity.get(key);
    if (existing && existing.version >= r.version) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (r.haccp_employee_items ?? []) as any[];
    latestByIdentity.set(key, {
      store_id: r.store_id,
      version: r.version,
      hasIssue: items.some((i) => i.answer === "bad"),
    });
  }

  const byStore = new Map<string, { count: number; hasIssue: boolean }>();
  for (const entry of latestByIdentity.values()) {
    const current = byStore.get(entry.store_id) ?? { count: 0, hasIssue: false };
    current.count += 1;
    current.hasIssue = current.hasIssue || entry.hasIssue;
    byStore.set(entry.store_id, current);
  }

  for (const store of stores) {
    if (!isInScope(store, targetDate)) {
      result.set(store.id, { status: "out_of_scope" });
      continue;
    }
    if (holidaySet.has(store.id)) {
      result.set(store.id, { status: "holiday" });
      continue;
    }
    const agg = byStore.get(store.id);
    if (!agg) {
      // 勤怠データ未連携のため「全従業員未回答」は断定しない(仕様書5.2)
      result.set(store.id, { status: "not_recorded" });
      continue;
    }
    result.set(store.id, { status: "recorded", responseCount: agg.count, hasIssue: agg.hasIssue });
  }

  return result;
}

export async function computeInspectionStatus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  stores: ScopedStore[],
  targetMonth: string
): Promise<Map<string, InspectionStatus>> {
  const storeIds = stores.map((s) => s.id);
  const result = new Map<string, InspectionStatus>();
  if (storeIds.length === 0) return result;

  const { data: inspections } = await supabase
    .from("haccp_inspections")
    .select("id, store_id, version, overall_evaluation")
    .in("store_id", storeIds)
    .eq("target_month", targetMonth);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latest = latestByKey((inspections ?? []) as any[]);

  for (const store of stores) {
    // 稼働前・休止閉店適用月は対象外(月初日を基準に稼働日と比較)
    if (!isInScope(store, targetMonth)) {
      result.set(store.id, { status: "out_of_scope" });
      continue;
    }
    const inspection = latest.get(store.id);
    if (!inspection) {
      result.set(store.id, { status: "unanswered" });
      continue;
    }
    result.set(store.id, {
      status: "answered",
      needsImprovement: inspection.overall_evaluation === "needs_improvement",
      inspectionId: inspection.id,
      version: inspection.version,
    });
  }

  return result;
}

export async function computeConfirmationStatus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  stores: ScopedStore[],
  periodStart: string,
  periodEnd: string
): Promise<Map<string, ConfirmationStatus>> {
  const storeIds = stores.map((s) => s.id);
  const result = new Map<string, ConfirmationStatus>();
  if (storeIds.length === 0) return result;

  const { data: confirmations } = await supabase
    .from("manager_confirmations")
    .select("store_id, version, status, confirmed_on")
    .in("store_id", storeIds)
    .eq("period_type", "half_month")
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latest = latestByKey((confirmations ?? []) as any[]);

  for (const store of stores) {
    const confirmation = latest.get(store.id);
    if (!confirmation) {
      result.set(store.id, { status: "unconfirmed" });
      continue;
    }
    if (confirmation.status === "needs_action") {
      result.set(store.id, { status: "needs_action" });
      continue;
    }
    result.set(store.id, { status: "confirmed", confirmedOn: confirmation.confirmed_on });
  }

  return result;
}

export function summarizeKeypoint(map: Map<string, KeypointStatus>) {
  let answered = 0,
    unanswered = 0,
    holiday = 0,
    outOfScope = 0,
    needsImprovement = 0;
  for (const v of map.values()) {
    if (v.status === "answered") {
      answered++;
      if (v.needsImprovement) needsImprovement++;
    } else if (v.status === "unanswered") unanswered++;
    else if (v.status === "holiday") holiday++;
    else outOfScope++;
  }
  return { answered, unanswered, holiday, outOfScope, needsImprovement, total: map.size };
}

export function summarizeEmployee(map: Map<string, EmployeeStatus>) {
  let recorded = 0,
    notRecorded = 0,
    holiday = 0,
    outOfScope = 0,
    hasIssueStores = 0,
    totalResponses = 0;
  for (const v of map.values()) {
    if (v.status === "recorded") {
      recorded++;
      totalResponses += v.responseCount;
      if (v.hasIssue) hasIssueStores++;
    } else if (v.status === "not_recorded") notRecorded++;
    else if (v.status === "holiday") holiday++;
    else outOfScope++;
  }
  return { recorded, notRecorded, holiday, outOfScope, hasIssueStores, totalResponses, total: map.size };
}

export function summarizeInspection(map: Map<string, InspectionStatus>) {
  let answered = 0,
    unanswered = 0,
    outOfScope = 0,
    needsImprovement = 0;
  for (const v of map.values()) {
    if (v.status === "answered") {
      answered++;
      if (v.needsImprovement) needsImprovement++;
    } else if (v.status === "unanswered") unanswered++;
    else outOfScope++;
  }
  return { answered, unanswered, outOfScope, needsImprovement, total: map.size };
}

export function summarizeConfirmation(map: Map<string, ConfirmationStatus>) {
  let confirmed = 0,
    needsAction = 0,
    unconfirmed = 0;
  for (const v of map.values()) {
    if (v.status === "confirmed") confirmed++;
    else if (v.status === "needs_action") needsAction++;
    else unconfirmed++;
  }
  return { confirmed, needsAction, unconfirmed, total: map.size };
}
