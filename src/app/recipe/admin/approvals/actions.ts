"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// 呼び出し元ページに戻すためのリダイレクト先。任意の値をそのままredirect()に渡すと
// オープンリダイレクトになるため、既知のパスのみ許可する(未知の値は既定の承認待ち一覧へ)。
const ALLOWED_REDIRECTS = new Set(["/recipe/admin/approvals", "/recipe/admin/approvals/history"]);
function resolveRedirectTo(formData: FormData): string {
  const value = String(formData.get("redirect_to") ?? "");
  return ALLOWED_REDIRECTS.has(value) ? value : "/recipe/admin/approvals";
}

export async function approveRecipe(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const recipeId = String(formData.get("recipe_id") ?? "");
  const redirectTo = resolveRedirectTo(formData);
  if (!recipeId) redirect(redirectTo);

  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, current_version_id")
    .eq("id", recipeId)
    .maybeSingle();
  if (!recipe) {
    redirect(`${redirectTo}?error=${encodeURIComponent("対象のレシピが見つかりません")}`);
  }

  // updated_atはDBのdefault now()がINSERT時にのみ適用されUPDATE時は自動更新されないため、
  // 「最近承認したレシピ」一覧(updated_at desc)が実際の承認順を反映するよう明示的に更新する。
  // rejection_noteは、以前差し戻された行が今回承認された場合に古い理由が残り続けないよう
  // 明示的にクリアする。
  const { error } = await supabase
    .from("recipes")
    .update({ status: "published", updated_at: new Date().toISOString(), rejection_note: null })
    .eq("id", recipeId);
  if (error) {
    redirect(`${redirectTo}?error=${encodeURIComponent(error.message)}`);
  }

  if (recipe.current_version_id) {
    await supabase
      .from("recipe_versions")
      .update({ published_at: new Date().toISOString() })
      .eq("id", recipe.current_version_id);
  }

  revalidatePath("/recipe/admin/approvals");
  revalidatePath("/recipe/admin/approvals/history");
  revalidatePath("/recipe/admin/history");
  revalidatePath("/recipe");
  redirect(`${redirectTo}?success=1`);
}

export async function approveRecipeWithoutPublishing(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const recipeId = String(formData.get("recipe_id") ?? "");
  const redirectTo = resolveRedirectTo(formData);
  if (!recipeId) redirect(redirectTo);

  // 社内的な理由でまだ公開しない「承認」。既存のapproveRecipe(status→published)とは異なり、
  // 一覧には出さないまま判定だけ完了させる。rejection_noteもapproveRecipeと同様にクリアする。
  const { error } = await supabase
    .from("recipes")
    .update({ status: "approved", updated_at: new Date().toISOString(), rejection_note: null })
    .eq("id", recipeId);
  if (error) {
    redirect(`${redirectTo}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/recipe/admin/approvals");
  revalidatePath("/recipe/admin/approvals/history");
  revalidatePath("/recipe/admin/history");
  redirect(`${redirectTo}?success=1`);
}

export async function rejectRecipe(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const recipeId = String(formData.get("recipe_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const redirectTo = resolveRedirectTo(formData);
  if (!recipeId) redirect(redirectTo);
  if (!reason) {
    redirect(`${redirectTo}?error=${encodeURIComponent("差し戻し理由を入力してください")}`);
  }

  // 却下(差し戻し)はdraftのまま理由を記録する。物理削除はしない(仕様書の論理削除原則)。
  const { error } = await supabase
    .from("recipes")
    .update({ status: "draft", rejection_note: reason })
    .eq("id", recipeId);
  if (error) {
    redirect(`${redirectTo}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/recipe/admin/approvals");
  revalidatePath("/recipe/admin/approvals/history");
  revalidatePath("/recipe/admin/history");
  redirect(`${redirectTo}?success=1`);
}
