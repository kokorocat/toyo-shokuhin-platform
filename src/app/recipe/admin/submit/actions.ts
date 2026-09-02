"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseFileName } from "@/lib/recipe/parse-file-name";
import { parseRecipeFileContent } from "@/lib/recipe/parse-recipe-file";

type FileResult = { fileName: string; status: "ok" | "duplicate" | "error"; detail?: string };

export async function submitRecipe(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const companyId = String(formData.get("company_id") ?? "");
  const submitterId = String(formData.get("submitter_id") ?? "");
  const areaId = String(formData.get("area_id") ?? "") || null;
  const category = String(formData.get("category") ?? "").trim() || null;
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  if (!companyId) {
    redirect(`/recipe/admin/submit?error=${encodeURIComponent("会社を選択してください")}`);
  }
  if (!submitterId) {
    redirect(`/recipe/admin/submit?company_id=${companyId}&error=${encodeURIComponent("申請者を選択してください")}`);
  }
  if (files.length === 0) {
    redirect(`/recipe/admin/submit?company_id=${companyId}&error=${encodeURIComponent("ファイルを選択してください")}`);
  }

  // 名簿の会社整合性を先に確認する(最終的な防衛はRLSだが、分かりやすいエラーを先に返す)。
  const { data: submitter } = await supabase
    .from("recipe_submitters")
    .select("id")
    .eq("id", submitterId)
    .eq("company_id", companyId)
    .eq("status", "active")
    .maybeSingle();
  if (!submitter) {
    redirect(`/recipe/admin/submit?company_id=${companyId}&error=${encodeURIComponent("申請者を選択してください")}`);
  }

  // エリアも同様に会社との整合性をサーバー側で確認する(upload/actions.tsと同じ理由)。
  if (areaId) {
    const { data: area } = await supabase
      .from("areas")
      .select("id")
      .eq("id", areaId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!area) {
      redirect(`/recipe/admin/submit?company_id=${companyId}&error=${encodeURIComponent("選択したエリアが会社と一致しません")}`);
    }
  }

  // recipe_applicationsはUPDATE/DELETEポリシーを持たない不変のスナップショットとして設計されて
  // いる(20260827000005参照)。そのため、ここで先に作ってしまうと全件重複/全件失敗のバッチで
  // 子のrecipes行が1件も無い空の申請が消せないまま残り、承認待ち一覧・履歴のどちらにも
  // 一切表示されない(recipesを起点にグルーピングするため)ゴミデータになる。作成を遅延させ、
  // ループ内で最初にrecipes行を実際に作成できることが確定した時点で初めて1回だけ作成する。
  let applicationId: string | null = null;

  const results: FileResult[] = [];

  for (const file of files) {
    try {
      // upload/actions.tsのbulkUploadApprovedRecipesと同じ理由でExcel内容から読み取る
      // (呼出No.セルにエリアの略称が含まれ、会社内での一意性を正しく担保できるため)。
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

      // status='rejected'(差し戻し済み)の行は20260901000003で一意制約の対象外にしたため、
      // 重複チェックからも除外する。除外しないと、差し戻されて再提出されたはずのファイルが
      // 「既に存在します」で永久にブロックされてしまう(差し戻し前の不具合)。
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

      if (!applicationId) {
        const { data: application, error: appError } = await supabase
          .from("recipe_applications")
          .insert({ company_id: companyId, submitter_id: submitterId, submitted_by: user.id })
          .select("id")
          .single();
        if (appError || !application) {
          results.push({ fileName: file.name, status: "error", detail: appError?.message ?? "申請の登録に失敗しました" });
          continue;
        }
        applicationId = application.id;
      }

      const { data: recipe, error: recipeError } = await supabase
        .from("recipes")
        .insert({
          recipe_code: parsed.code,
          company_id: companyId,
          area_id: areaId,
          name: parsed.name,
          category,
          status: "draft",
          application_id: applicationId,
        })
        .select("id")
        .single();

      if (recipeError || !recipe) {
        results.push({ fileName: file.name, status: "error", detail: recipeError?.message ?? "登録に失敗しました" });
        continue;
      }

      const ext = file.name.split(".").pop() || "xlsx";
      const path = `${companyId}/submissions/${parsed.code}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("recipe-files").upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });

      let originalStoragePath: string | null = null;
      if (uploadError) {
        // レシピ本体は作成済みなので、アップロード失敗はエラー表示のみとし登録自体は破棄しない
        // (承認担当が理由付きで差し戻せば呼出番号は解放され、再提出できる)。
        console.error("[recipe/admin/submit] file upload failed", file.name, uploadError);
      } else {
        originalStoragePath = path;
      }

      const { data: version, error: versionError } = await supabase
        .from("recipe_versions")
        .insert({
          recipe_id: recipe.id,
          version_no: 1,
          original_storage_path: originalStoragePath,
          uploaded_by: user.id,
        })
        .select("id")
        .single();

      if (versionError || !version) {
        results.push({ fileName: file.name, status: "error", detail: versionError?.message ?? "版の登録に失敗しました" });
        continue;
      }

      const { error: linkError } = await supabase
        .from("recipes")
        .update({ current_version_id: version.id })
        .eq("id", recipe.id);
      if (linkError) {
        console.error("[recipe/admin/submit] linking current_version_id failed", file.name, linkError);
      }

      results.push({
        fileName: file.name,
        status: uploadError || linkError ? "error" : "ok",
        detail: uploadError
          ? "ファイル本体の保存に失敗しました(レシピ情報は登録済み)"
          : linkError
            ? "版の紐付けに失敗しました(レシピ情報は登録済み)"
            : undefined,
      });
    } catch (e) {
      // 1ファイルの想定外の例外でバッチ全体が中断され、それまでに処理済みのファイルの結果が
      // 一切表示されない事態を防ぐ(このファイルだけエラー扱いにして残りの処理を続行する)。
      console.error("[recipe/admin/submit] unexpected error", file.name, e);
      results.push({ fileName: file.name, status: "error", detail: "予期しないエラーが発生しました" });
    }
  }

  const okCount = results.filter((r) => r.status === "ok").length;
  const dupCount = results.filter((r) => r.status === "duplicate").length;
  const errorFiles = results.filter((r) => r.status === "error");

  const summaryParts = [`${okCount}件申請完了`];
  if (dupCount > 0) summaryParts.push(`${dupCount}件は重複のためスキップ`);
  if (errorFiles.length > 0) {
    summaryParts.push(`${errorFiles.length}件失敗(${errorFiles.map((f) => f.fileName).join(", ")})`);
  }

  // 監査ログ(仕様書9「監査」)。ここでの失敗は登録自体をブロックしない既知のトレードオフ。
  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_id: user.id,
    system_code: "recipe",
    action: "submit_application",
    target_table: "recipe_applications",
    target_id: applicationId ?? companyId,
    after_data: { company_id: companyId, submitter_id: submitterId, ok_count: okCount, duplicate_count: dupCount, error_count: errorFiles.length },
  });
  if (auditError) {
    console.error("[recipe/admin/submit] audit log insert failed", auditError);
  }

  revalidatePath("/recipe/admin/submit");
  revalidatePath("/recipe/admin/approvals");
  revalidatePath("/recipe/admin/history");

  if (okCount === 0) {
    // 全件重複/全件失敗は「◯件申請完了」という緑の成功表示にすべきではない。
    redirect(`/recipe/admin/submit?company_id=${companyId}&error=${encodeURIComponent(summaryParts.join(" / "))}`);
  }
  if (errorFiles.length > 0) {
    redirect(`/recipe/admin/submit?company_id=${companyId}&error=${encodeURIComponent(summaryParts.join(" / "))}`);
  }
  redirect(`/recipe/admin/submit?company_id=${companyId}&success=${encodeURIComponent(summaryParts.join(" / "))}`);
}
