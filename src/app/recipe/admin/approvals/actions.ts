"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function approveRecipe(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const recipeId = String(formData.get("recipe_id") ?? "");
  if (!recipeId) redirect("/recipe/admin/approvals");

  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, current_version_id")
    .eq("id", recipeId)
    .maybeSingle();
  if (!recipe) {
    redirect(`/recipe/admin/approvals?error=${encodeURIComponent("対象のレシピが見つかりません")}`);
  }

  // updated_atはDBのdefault now()がINSERT時にのみ適用されUPDATE時は自動更新されないため、
  // 「最近承認したレシピ」一覧(updated_at desc)が実際の承認順を反映するよう明示的に更新する。
  const { error } = await supabase
    .from("recipes")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", recipeId);
  if (error) {
    redirect(`/recipe/admin/approvals?error=${encodeURIComponent(error.message)}`);
  }

  if (recipe.current_version_id) {
    await supabase
      .from("recipe_versions")
      .update({ published_at: new Date().toISOString() })
      .eq("id", recipe.current_version_id);
  }

  revalidatePath("/recipe/admin/approvals");
  revalidatePath("/recipe");
  redirect("/recipe/admin/approvals?success=1");
}

export async function rejectRecipe(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const recipeId = String(formData.get("recipe_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!recipeId) redirect("/recipe/admin/approvals");
  if (!reason) {
    redirect(`/recipe/admin/approvals?error=${encodeURIComponent("差し戻し理由を入力してください")}`);
  }

  // 却下(差し戻し)はdraftのまま理由を記録する。物理削除はしない(仕様書の論理削除原則)。
  const { error } = await supabase
    .from("recipes")
    .update({ status: "draft", rejection_note: reason })
    .eq("id", recipeId);
  if (error) {
    redirect(`/recipe/admin/approvals?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/recipe/admin/approvals");
  redirect("/recipe/admin/approvals?success=1");
}
