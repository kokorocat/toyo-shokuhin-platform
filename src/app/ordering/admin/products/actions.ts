"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PRODUCT_TYPES = new Set([
  "normal_pop",
  "price_input_pop",
  "viking_price",
  "normal_seal",
  "seal_price_list",
  "laminate",
  "other",
]);

type ParsedProductForm =
  | { error: string }
  | {
      values: {
        category_id: string | null;
        product_type: string;
        name: string;
        description: string | null;
        unit_price: number;
        lot_size: number;
        seal_size_id: string | null;
        is_recommended: boolean;
        recommend_badge: string | null;
      };
    };

function parseProductForm(formData: FormData): ParsedProductForm {
  const productType = String(formData.get("product_type") ?? "");
  if (!PRODUCT_TYPES.has(productType)) {
    return { error: "商品タイプが不正です" };
  }
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "商品名を入力してください" };
  }
  const unitPrice = Number(formData.get("unit_price") ?? 0);
  const lotSize = Number(formData.get("lot_size") ?? 1);
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    return { error: "単価が不正です" };
  }
  if (!Number.isFinite(lotSize) || lotSize < 1) {
    return { error: "ロット数が不正です" };
  }

  return {
    values: {
      category_id: String(formData.get("category_id") ?? "") || null,
      product_type: productType,
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      unit_price: Math.round(unitPrice),
      lot_size: Math.round(lotSize),
      seal_size_id: String(formData.get("seal_size_id") ?? "") || null,
      is_recommended: formData.get("is_recommended") === "on",
      recommend_badge: String(formData.get("recommend_badge") ?? "").trim() || null,
    },
  };
}

export async function createProduct(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = parseProductForm(formData);
  if ("error" in parsed) {
    redirect(`/ordering/admin/products/new?error=${encodeURIComponent(parsed.error)}`);
  }

  const { error } = await supabase.from("products").insert(parsed.values);
  if (error) {
    redirect(`/ordering/admin/products/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/ordering/admin/products");
  revalidatePath("/ordering");
  redirect("/ordering/admin/products?success=1");
}

export async function updateProduct(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const productId = String(formData.get("product_id") ?? "");
  if (!productId) redirect("/ordering/admin/products");

  const parsed = parseProductForm(formData);
  if ("error" in parsed) {
    redirect(`/ordering/admin/products/${productId}?error=${encodeURIComponent(parsed.error)}`);
  }

  const { error } = await supabase.from("products").update(parsed.values).eq("id", productId);
  if (error) {
    redirect(`/ordering/admin/products/${productId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/ordering/admin/products");
  revalidatePath("/ordering");
  redirect("/ordering/admin/products?success=1");
}

export async function toggleProductStatus(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const productId = String(formData.get("product_id") ?? "");
  const nextStatus = String(formData.get("next_status") ?? "");
  if (!productId || (nextStatus !== "active" && nextStatus !== "hidden")) {
    redirect("/ordering/admin/products");
  }

  // 物理削除はしない(過去注文の履歴・スナップショットに影響させないため)。非表示化のみ行う。
  const { error } = await supabase.from("products").update({ status: nextStatus }).eq("id", productId);
  if (error) {
    redirect(`/ordering/admin/products?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/ordering/admin/products");
  revalidatePath("/ordering");
  redirect("/ordering/admin/products?success=1");
}
