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

  // 存在チェックを先に行う(存在しないid相手のUPDATEはSupabaseがerror:nullで返すため、
  // チェック無しだと消えた/権限外の行に対する操作が黙って「成功」扱いになってしまう)。
  const { data: recipe } = await supabase.from("recipes").select("id").eq("id", recipeId).maybeSingle();
  if (!recipe) {
    redirect(`${redirectTo}?error=${encodeURIComponent("対象のレシピが見つかりません")}`);
  }

  // 社内的な理由でまだ公開しない「承認」。既存のapproveRecipe(status→published)とは異なり、
  // 一覧には出さないまま判定だけ完了させる。rejection_noteもapproveRecipeと同様にクリアする。
  const { error } = await supabase
    .from("recipes")
    .update({ status: "approved", updated_at: new Date().toISOString(), rejection_note: null })
    .eq("id", recipeId);
  if (error) {
    redirect(`${redirectTo}?error=${encodeURIComponent(error.message)}`);
  }

  // 公開済みだったレシピを「承認(未公開)」に差し戻す操作もあり得るため、公開一覧(/recipe)側の
  // キャッシュも更新する。
  revalidatePath("/recipe/admin/approvals");
  revalidatePath("/recipe/admin/approvals/history");
  revalidatePath("/recipe/admin/history");
  revalidatePath("/recipe");
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

  // 存在チェックを先に行う(approveRecipeと同じ理由)。現在のstatus/current_version_idも
  // 取得し、公開済みからの差し戻しならrecipe_versions.published_atもクリアする。
  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, status, current_version_id")
    .eq("id", recipeId)
    .maybeSingle();
  if (!recipe) {
    redirect(`${redirectTo}?error=${encodeURIComponent("対象のレシピが見つかりません")}`);
  }

  // 却下(差し戻し)は専用のstatus='rejected'で理由を記録する。物理削除はしない
  // (仕様書の論理削除原則)。'draft'のままにすると呼出番号のunique制約に阻まれて
  // 同じ番号での再提出が永久にブロックされるため、'rejected'は一意制約の対象外として扱う
  // (20260901000003参照)。updated_atも明示更新する(承認系アクションと同じ理由)。
  const { error } = await supabase
    .from("recipes")
    .update({ status: "rejected", rejection_note: reason, updated_at: new Date().toISOString() })
    .eq("id", recipeId);
  if (error) {
    redirect(`${redirectTo}?error=${encodeURIComponent(error.message)}`);
  }

  if (recipe.status === "published" && recipe.current_version_id) {
    await supabase
      .from("recipe_versions")
      .update({ published_at: null })
      .eq("id", recipe.current_version_id);
  }

  revalidatePath("/recipe/admin/approvals");
  revalidatePath("/recipe/admin/approvals/history");
  revalidatePath("/recipe/admin/history");
  revalidatePath("/recipe");
  redirect(`${redirectTo}?success=1`);
}
