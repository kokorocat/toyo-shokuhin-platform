"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseFileName } from "@/lib/recipe/parse-file-name";
import { parseRecipeFileContent } from "@/lib/recipe/parse-recipe-file";

type FileResult = { fileName: string; status: "ok" | "duplicate" | "error"; detail?: string };

export async function bulkUploadApprovedRecipes(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const companyId = String(formData.get("company_id") ?? "");
  const areaId = String(formData.get("area_id") ?? "") || null;
  const category = String(formData.get("category") ?? "").trim() || null;
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  if (!companyId) {
    redirect(`/recipe/admin/upload?error=${encodeURIComponent("会社を選択してください")}`);
  }
  if (files.length === 0) {
    redirect(`/recipe/admin/upload?error=${encodeURIComponent("ファイルを選択してください")}`);
  }

  const results: FileResult[] = [];

  for (const file of files) {
   try {
    // Excelファイルはファイル内の呼出No.(E3)・商品名(Q3)セルから読み取る(エリアの略称込みの値
    // のため、エリアが違えば数字が同じでも別コードとして扱える — クライアント確認済みの実運用に
    // 対応するための2026-08-27追加)。xlsx以外(pdf等)や、想定セルが読み取れないExcelファイルは、
    // ファイル名から解析する(この場合エリア情報が無いため、同一会社内で数字が重複すると
    // 既存レシピとして重複スキップされる — 呼出No.セルが正しく入ったExcelでの登録を推奨)。
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    const parsed = isExcel ? await parseRecipeFileContent(file) : parseFileName(file.name);
    if (!parsed) {
      results.push({
        fileName: file.name,
        status: "error",
        detail: isExcel
          ? "ファイル内の呼出No.・商品名を読み取れませんでした"
          : "ファイル名から呼出番号を読み取れませんでした",
      });
      continue;
    }

    // status='rejected'の行は一意制約の対象外(20260901000003)なので重複チェックからも除外する。
    const { data: existing } = await supabase
      .from("recipes")
      .select("id")
      .eq("company_id", companyId)
      .eq("recipe_code", parsed.code)
      .neq("status", "rejected")
      .maybeSingle();
    if (existing) {
      results.push({ fileName: file.name, status: "duplicate", detail: `呼出番号 ${parsed.code} は既に存在します` });
      continue;
    }

    // ファイル本体のアップロードをDB行の作成より先に行う(manuals/admin/actions.tsと同じ
    // パターン)。先にrecipes行(status='published')を作ってしまうと、アップロードが失敗した
    // 場合に「公開済みなのに原本ファイルが無い」レシピがそのまま一覧に出てしまい、しかも
    // 重複チェックに阻まれて同じ呼出番号での再アップロードもできなくなる。
    const ext = file.name.split(".").pop() || "xlsx";
    const path = `${companyId}/approved/${parsed.code}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("recipe-files").upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (uploadError) {
      console.error("[recipe/admin/upload] file upload failed", file.name, uploadError);
      results.push({ fileName: file.name, status: "error", detail: "ファイル本体の保存に失敗しました" });
      continue;
    }

    const { data: recipe, error: recipeError } = await supabase
      .from("recipes")
      .insert({
        recipe_code: parsed.code,
        company_id: companyId,
        area_id: areaId,
        name: parsed.name,
        category,
        status: "published",
      })
      .select("id")
      .single();

    if (recipeError || !recipe) {
      await supabase.storage.from("recipe-files").remove([path]);
      results.push({ fileName: file.name, status: "error", detail: recipeError?.message ?? "登録に失敗しました" });
      continue;
    }

    const { data: version, error: versionError } = await supabase
      .from("recipe_versions")
      .insert({
        recipe_id: recipe.id,
        version_no: 1,
        original_storage_path: path,
        uploaded_by: user.id,
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (versionError || !version) {
      await supabase.storage.from("recipe-files").remove([path]);
      await supabase.from("recipes").delete().eq("id", recipe.id);
      results.push({ fileName: file.name, status: "error", detail: versionError?.message ?? "版の登録に失敗しました" });
      continue;
    }

    // 直接UPDATEではなくRPC経由にする理由: 通常のrecipes_update_*ポリシーは
    // 「draft状態のまま」または「super_adminのみ」を前提としており、一括アップロードが
    // 挿入直後に行うstatus='published'のままcurrent_version_idだけを紐付ける操作を
    // 安全に表現できない(20260827000007のコメント参照 — 複数ポリシー間の組み合わせによる
    // 迂回を防ぐため、RPC内で対象行を明示的に検証する設計にしている)。
    const { error: linkError } = await supabase.rpc("link_recipe_current_version", {
      p_recipe_id: recipe.id,
      p_version_id: version.id,
    });
    if (linkError) {
      // current_version_idが紐付かないまま「アップロード完了」と報告すると、公開済みなのに
      // /recipe/[id]が永久に「登録されていません」になる行が黙って残ってしまう。
      console.error("[recipe/admin/upload] linking current_version_id failed", file.name, linkError);
      await supabase.storage.from("recipe-files").remove([path]);
      await supabase.from("recipes").delete().eq("id", recipe.id);
      results.push({ fileName: file.name, status: "error", detail: "版の紐付けに失敗しました" });
      continue;
    }

    results.push({ fileName: file.name, status: "ok" });
   } catch (e) {
    console.error("[recipe/admin/upload] unexpected error", file.name, e);
    results.push({ fileName: file.name, status: "error", detail: "予期しないエラーが発生しました" });
   }
  }

  const okCount = results.filter((r) => r.status === "ok").length;
  const dupCount = results.filter((r) => r.status === "duplicate").length;
  const errorFiles = results.filter((r) => r.status === "error");

  const summaryParts = [`${okCount}件アップロード完了`];
  if (dupCount > 0) summaryParts.push(`${dupCount}件は重複のためスキップ`);
  if (errorFiles.length > 0) {
    summaryParts.push(`${errorFiles.length}件失敗(${errorFiles.map((f) => f.fileName).join(", ")})`);
  }

  // 監査ログ(仕様書9「監査」)。ここでの失敗は登録自体をブロックしない既知のトレードオフ。
  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_id: user.id,
    system_code: "recipe",
    action: "bulk_upload_approved",
    target_table: "recipes",
    target_id: companyId,
    after_data: { company_id: companyId, area_id: areaId, ok_count: okCount, duplicate_count: dupCount, error_count: errorFiles.length },
  });
  if (auditError) {
    console.error("[recipe/admin/upload] audit log insert failed", auditError);
  }

  revalidatePath("/recipe");
  revalidatePath("/recipe/admin/upload");

  if (errorFiles.length > 0) {
    redirect(`/recipe/admin/upload?error=${encodeURIComponent(summaryParts.join(" / "))}`);
  }
  redirect(`/recipe/admin/upload?success=${encodeURIComponent(summaryParts.join(" / "))}`);
}
