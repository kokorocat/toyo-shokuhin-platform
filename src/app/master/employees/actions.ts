"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const EMPLOYEE_STATUSES = new Set(["active", "leave", "retired"]);

type ParsedEmployeeForm =
  | { error: string }
  | {
      values: {
        company_id: string;
        employee_code: string;
        full_name: string;
        employment_type: string | null;
        hired_on: string | null;
      };
    };

function parseEmployeeForm(formData: FormData): ParsedEmployeeForm {
  const companyId = String(formData.get("company_id") ?? "");
  if (!companyId) {
    return { error: "会社を選択してください" };
  }
  const employeeCode = String(formData.get("employee_code") ?? "").trim();
  if (!employeeCode) {
    return { error: "社員コードを入力してください" };
  }
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) {
    return { error: "氏名を入力してください" };
  }
  return {
    values: {
      company_id: companyId,
      employee_code: employeeCode,
      full_name: fullName,
      employment_type: String(formData.get("employment_type") ?? "").trim() || null,
      hired_on: String(formData.get("hired_on") ?? "") || null,
    },
  };
}

async function recordAuditLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actorId: string,
  action: string,
  targetTable: string,
  targetId: string,
  beforeData: Record<string, string | number | boolean | null> | null,
  afterData: Record<string, string | number | boolean | null> | null
) {
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: actorId,
    system_code: "store_master",
    action,
    target_table: targetTable,
    target_id: targetId,
    before_data: beforeData,
    after_data: afterData,
  });
  if (error) {
    console.error("[master/employees] audit log insert failed", error);
  }
}

export async function createEmployee(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = parseEmployeeForm(formData);
  if ("error" in parsed) {
    redirect(`/master/employees/new?error=${encodeURIComponent(parsed.error)}`);
  }

  const { data: employee, error } = await supabase
    .from("employees")
    .insert(parsed.values)
    .select("id")
    .single();
  if (error || !employee) {
    const message = error?.message.includes("row-level security")
      ? "従業員の登録は自社の会社管理者、または全権限管理者のみ行えます"
      : (error?.message ?? "作成に失敗しました");
    redirect(`/master/employees/new?error=${encodeURIComponent(message)}`);
  }

  await recordAuditLog(supabase, user.id, "create", "employees", employee.id, null, parsed.values);

  revalidatePath("/master/employees");
  revalidatePath("/master");
  redirect("/master/employees?success=1");
}

export async function updateEmployee(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const employeeId = String(formData.get("employee_id") ?? "");
  if (!employeeId) redirect("/master/employees");

  const parsed = parseEmployeeForm(formData);
  if ("error" in parsed) {
    redirect(`/master/employees/${employeeId}?error=${encodeURIComponent(parsed.error)}`);
  }

  const { data: before } = await supabase
    .from("employees")
    .select("company_id, employee_code, full_name, employment_type, hired_on")
    .eq("id", employeeId)
    .maybeSingle();

  const { error } = await supabase.from("employees").update(parsed.values).eq("id", employeeId);
  if (error) {
    const message = error.message.includes("row-level security")
      ? "従業員情報の更新は自社の会社管理者、または全権限管理者のみ行えます"
      : error.message;
    redirect(`/master/employees/${employeeId}?error=${encodeURIComponent(message)}`);
  }

  await recordAuditLog(supabase, user.id, "update", "employees", employeeId, before, parsed.values);

  revalidatePath("/master/employees");
  revalidatePath("/master");
  redirect(`/master/employees/${employeeId}?success=1`);
}

export async function toggleEmployeeStatus(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const employeeId = String(formData.get("employee_id") ?? "");
  const nextStatus = String(formData.get("next_status") ?? "");
  if (!employeeId || !EMPLOYEE_STATUSES.has(nextStatus)) {
    redirect("/master/employees");
  }

  // 物理削除はしない(HACCP回答履歴・雇用履歴等が広く参照するため)。在籍状態の切り替えのみ行う。
  const { data: before } = await supabase.from("employees").select("status, retired_on").eq("id", employeeId).maybeSingle();

  const patch: { status: string; retired_on?: string | null } = { status: nextStatus };
  if (nextStatus === "retired") {
    patch.retired_on = new Date().toISOString().slice(0, 10);
  } else if (before?.retired_on) {
    patch.retired_on = null;
  }

  const { error } = await supabase.from("employees").update(patch).eq("id", employeeId);
  if (error) {
    redirect(`/master/employees?error=${encodeURIComponent(error.message)}`);
  }

  await recordAuditLog(supabase, user.id, "toggle_status", "employees", employeeId, before, patch);

  revalidatePath("/master/employees");
  revalidatePath("/master");
  redirect("/master/employees?success=1");
}

export async function assignEmployeeToStore(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const employeeId = String(formData.get("employee_id") ?? "");
  const storeId = String(formData.get("store_id") ?? "");
  const startedOn = String(formData.get("started_on") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!employeeId || !storeId || !startedOn) {
    redirect(`/master/employees/${employeeId}?error=${encodeURIComponent("配属店舗と開始日を指定してください")}`);
  }

  // 現在有効な割当(ended_on未設定)があれば、新しい割当の開始日の前日で終了させる
  // (employee_assignmentsは履歴テーブルであり上書きしない — src/app/haccp等の他モジュールと同じ規約)。
  const { data: current } = await supabase
    .from("employee_assignments")
    .select("id, started_on")
    .eq("employee_id", employeeId)
    .is("ended_on", null);

  for (const row of current ?? []) {
    const endedOn = new Date(new Date(startedOn).getTime() - 86400000).toISOString().slice(0, 10);
    await supabase
      .from("employee_assignments")
      .update({ ended_on: endedOn >= row.started_on ? endedOn : row.started_on })
      .eq("id", row.id);
  }

  const { error } = await supabase.from("employee_assignments").insert({
    employee_id: employeeId,
    store_id: storeId,
    started_on: startedOn,
    reason,
    created_by: user.id,
  });
  if (error) {
    const message = error.message.includes("row-level security")
      ? "配属の登録は自社の会社管理者、または全権限管理者のみ行えます"
      : error.message;
    redirect(`/master/employees/${employeeId}?error=${encodeURIComponent(message)}`);
  }

  await recordAuditLog(supabase, user.id, "assign_store", "employee_assignments", employeeId, null, {
    store_id: storeId,
    started_on: startedOn,
  });

  revalidatePath(`/master/employees/${employeeId}`);
  redirect(`/master/employees/${employeeId}?success=1`);
}
