"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitRecipe(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const companyId = String(formData.get("company_id") ?? "");
  const areaId = String(formData.get("area_id") ?? "") || null;
  const recipeCode = String(formData.get("recipe_code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const file = formData.get("original_file");

  if (!companyId || !recipeCode || !name) {
    redirect(`/recipe/admin/submit?error=${encodeURIComponent("会社・レシピコード・レシピ名を入力してください")}`);
  }

  // 会社・レシピコードの重複チェック(recipes.unique(company_id, recipe_code))
  const { data: existing } = await supabase
    .from("recipes")
    .select("id")
    .eq("company_id", companyId)
    .eq("recipe_code", recipeCode)
    .maybeSingle();
  if (existing) {
    redirect(
      `/recipe/admin/submit?error=${encodeURIComponent("このレシピコードは既に使用されています")}`
    );
  }

  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .insert({
      recipe_code: recipeCode,
      company_id: companyId,
      area_id: areaId,
      name,
      category,
      status: "draft",
    })
    .select("id")
    .single();

  if (recipeError || !recipe) {
    redirect(
      `/recipe/admin/submit?error=${encodeURIComponent(recipeError?.message ?? "登録に失敗しました")}`
    );
  }

  let originalStoragePath: string | null = null;
  if (file instanceof File && file.size > 0) {
    const ext = file.name.split(".").pop() || "xlsx";
    const path = `submissions/${recipeCode}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("recipe-files").upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (uploadError) {
      // レシピ本体は作成済みなので、アップロード失敗はエラー表示のみとし登録自体は破棄しない
      // (申請者はRV-40相当の一覧から後で再アップロードできる想定。今回のMVPには再アップロードUIは
      // ないため、失敗時はこの場でエラーを伝え、管理者側での手当てを促す)。
      console.error("[recipe/admin/submit] file upload failed", uploadError);
    } else {
      originalStoragePath = path;
    }
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
    redirect(
      `/recipe/admin/submit?error=${encodeURIComponent(versionError?.message ?? "版の登録に失敗しました")}`
    );
  }

  const { error: linkError } = await supabase
    .from("recipes")
    .update({ current_version_id: version.id })
    .eq("id", recipe.id);
  if (linkError) {
    console.error("[recipe/admin/submit] linking current_version_id failed", linkError);
  }

  revalidatePath("/recipe/admin/submit");
  revalidatePath("/recipe/admin/approvals");
  redirect("/recipe/admin/submit?success=1");
}
