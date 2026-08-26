"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ParsedCompanyForm =
  | { error: string }
  | {
      values: {
        company_code: string;
        name: string;
      };
    };

function parseCompanyForm(formData: FormData): ParsedCompanyForm {
  const companyCode = String(formData.get("company_code") ?? "").trim();
  if (!companyCode) {
    return { error: "会社コードを入力してください" };
  }
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "会社名を入力してください" };
  }
  return { values: { company_code: companyCode, name } };
}

// 監査ログ(仕様書9「監査」)。ここでの失敗は登録自体をブロックしない既知のトレードオフ
// (haccp/actions.ts confirmHalfMonthと同じ規約)。
async function recordAuditLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actorId: string,
  action: string,
  targetId: string,
  beforeData: Record<string, string | number | boolean | null> | null,
  afterData: Record<string, string | number | boolean | null> | null
) {
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: actorId,
    system_code: "store_master",
    action,
    target_table: "companies",
    target_id: targetId,
    before_data: beforeData,
    after_data: afterData,
  });
  if (error) {
    console.error("[master/companies] audit log insert failed", error);
  }
}

export async function createCompany(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = parseCompanyForm(formData);
  if ("error" in parsed) {
    redirect(`/master/companies/new?error=${encodeURIComponent(parsed.error)}`);
  }

  const { data: company, error } = await supabase
    .from("companies")
    .insert(parsed.values)
    .select("id")
    .single();
  if (error || !company) {
    const message = error?.message.includes("row-level security")
      ? "会社の作成は全権限管理者のみ行えます"
      : (error?.message ?? "作成に失敗しました");
    redirect(`/master/companies/new?error=${encodeURIComponent(message)}`);
  }

  await recordAuditLog(supabase, user.id, "create", company.id, null, parsed.values);

  revalidatePath("/master/companies");
  revalidatePath("/master");
  redirect("/master/companies?success=1");
}

export async function updateCompany(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const companyId = String(formData.get("company_id") ?? "");
  if (!companyId) redirect("/master/companies");

  const parsed = parseCompanyForm(formData);
  if ("error" in parsed) {
    redirect(`/master/companies/${companyId}?error=${encodeURIComponent(parsed.error)}`);
  }

  const { data: before } = await supabase
    .from("companies")
    .select("company_code, name")
    .eq("id", companyId)
    .maybeSingle();

  const { error } = await supabase.from("companies").update(parsed.values).eq("id", companyId);
  if (error) {
    const message = error.message.includes("row-level security")
      ? "会社情報の更新は全権限管理者のみ行えます"
      : error.message;
    redirect(`/master/companies/${companyId}?error=${encodeURIComponent(message)}`);
  }

  await recordAuditLog(supabase, user.id, "update", companyId, before, parsed.values);

  revalidatePath("/master/companies");
  revalidatePath("/master");
  redirect("/master/companies?success=1");
}

export async function toggleCompanyStatus(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const companyId = String(formData.get("company_id") ?? "");
  const nextStatus = String(formData.get("next_status") ?? "");
  if (!companyId || (nextStatus !== "active" && nextStatus !== "inactive")) {
    redirect("/master/companies");
  }

  // 物理削除はしない(店舗・従業員・受注等が広く参照するため)。稼働状態の切り替えのみ行う。
  const { data: before } = await supabase
    .from("companies")
    .select("status")
    .eq("id", companyId)
    .maybeSingle();

  const { error } = await supabase.from("companies").update({ status: nextStatus }).eq("id", companyId);
  if (error) {
    redirect(`/master/companies?error=${encodeURIComponent(error.message)}`);
  }

  await recordAuditLog(supabase, user.id, "toggle_status", companyId, before, { status: nextStatus });

  revalidatePath("/master/companies");
  revalidatePath("/master");
  redirect("/master/companies?success=1");
}
