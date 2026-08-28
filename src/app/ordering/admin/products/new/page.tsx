// OM-30 商品新規追加(仕様書10章 商品管理)。
// 実際の登録処理はcreateProduct(src/app/ordering/admin/products/actions.ts)に一本化されており、
// このページはフォームの表示と選択肢(カテゴリ・シールサイズ)の取得のみを担当する。
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isOrderingAdminRole } from "@/app/ordering/admin/guard";
import { createProduct } from "@/app/ordering/admin/products/actions";
import { PageHeader } from "@/components/PageHeader";
import { Banner } from "@/components/Banner";
import { SubmitButton } from "@/components/SubmitButton";

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const LABEL_CLASS = "mb-1 block text-xs font-medium text-slate-600";

const PRODUCT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "normal_pop", label: "通常POP" },
  { value: "price_input_pop", label: "価格入POP" },
  { value: "viking_price", label: "バイキングプライス" },
  { value: "normal_seal", label: "通常シール" },
  { value: "seal_price_list", label: "シール価格表掲載品" },
  { value: "laminate", label: "ラミネート" },
  { value: "other", label: "その他" },
];

type CategoryRow = {
  id: string;
  parent_id: string | null;
  name: string;
  display_order: number;
  status: string;
};

type SealSizeOption = {
  id: string;
  faces: number;
  width_mm: number;
  height_mm: number;
  note: string | null;
};

function flattenCategories(categories: CategoryRow[]): { id: string; label: string }[] {
  const byParent = new Map<string | null, CategoryRow[]>();
  for (const c of categories) {
    const list = byParent.get(c.parent_id) ?? [];
    list.push(c);
    byParent.set(c.parent_id, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.display_order - b.display_order);
  }
  const result: { id: string; label: string }[] = [];
  function walk(parentId: string | null, depth: number) {
    for (const c of byParent.get(parentId) ?? []) {
      const prefix = depth === 0 ? "" : "　".repeat(depth) + "− ";
      const suffix = c.status === "hidden" ? "(非表示)" : "";
      result.push({ id: c.id, label: `${prefix}${c.name}${suffix}` });
      walk(c.id, depth + 1);
    }
  }
  walk(null, 0);
  return result;
}

function sealSizeLabel(s: SealSizeOption): string {
  const base = `${s.faces}面付 ${s.width_mm}×${s.height_mm}mm`;
  return s.note ? `${base}(${s.note})` : base;
}

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getPortalContext();

  if (!isOrderingAdminRole(ctx?.roleCode ?? null)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">
          この画面を表示する権限がありません。管理者権限を持つアカウントで再ログインしてください。
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: categories }, { data: sealSizes }] = await Promise.all([
    supabase
      .from("product_categories")
      .select("id, parent_id, name, display_order, status")
      .order("display_order"),
    supabase
      .from("seal_sizes")
      .select("id, faces, width_mm, height_mm, note")
      .order("faces", { ascending: true }),
  ]);

  const categoryOptions = flattenCategories((categories as CategoryRow[]) ?? []);
  const sealSizeOptions = (sealSizes ?? []) as SealSizeOption[];

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6">
      <PageHeader backHref="/ordering/admin/products" backLabel="商品一覧に戻る" title="商品を追加" />

      {sp.error && (
        <Banner variant="error" className="mb-5">
          {sp.error}
        </Banner>
      )}

      <form action={createProduct} className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">商品情報</h2>
        </div>

        <div className="grid grid-cols-1 gap-3.5 px-4 py-4 sm:grid-cols-2">
          <div>
            <label htmlFor="category_id" className={LABEL_CLASS}>カテゴリ</label>
            <select id="category_id" name="category_id" defaultValue="" className={INPUT_CLASS}>
              <option value="">未分類</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="product_type" className={LABEL_CLASS}>
              商品タイプ <span className="text-red-600">*</span>
            </label>
            <select id="product_type" name="product_type" required defaultValue="" className={INPUT_CLASS}>
              <option value="" disabled>選択してください</option>
              {PRODUCT_TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="name" className={LABEL_CLASS}>
              商品名 <span className="text-red-600">*</span>
            </label>
            <input id="name" name="name" type="text" required maxLength={200} className={INPUT_CLASS} />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="description" className={LABEL_CLASS}>説明</label>
            <textarea id="description" name="description" rows={3} className={`${INPUT_CLASS} resize-y`} />
          </div>

          <div>
            <label htmlFor="unit_price" className={LABEL_CLASS}>
              単価(円) <span className="text-red-600">*</span>
            </label>
            <input id="unit_price" name="unit_price" type="number" inputMode="numeric" min={0} step={1} required className={INPUT_CLASS} />
          </div>

          <div>
            <label htmlFor="lot_size" className={LABEL_CLASS}>
              ロット数 <span className="text-red-600">*</span>
            </label>
            <input id="lot_size" name="lot_size" type="number" inputMode="numeric" min={1} step={1} defaultValue={1} required className={INPUT_CLASS} />
          </div>

          <div>
            <label htmlFor="seal_size_id" className={LABEL_CLASS}>シールサイズ</label>
            <select id="seal_size_id" name="seal_size_id" defaultValue="" className={INPUT_CLASS}>
              <option value="">未選択(通常シール以外は不要)</option>
              {sealSizeOptions.map((s) => (
                <option key={s.id} value={s.id}>{sealSizeLabel(s)}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="recommend_badge" className={LABEL_CLASS}>おすすめバッジ文言</label>
            <input id="recommend_badge" name="recommend_badge" type="text" placeholder="例: おすすめ / 季節限定" maxLength={50} className={INPUT_CLASS} />
          </div>

          <div className="flex items-center gap-2 pt-4 sm:col-span-2">
            <input
              id="is_recommended"
              name="is_recommended"
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/40"
            />
            <label htmlFor="is_recommended" className="text-sm text-slate-700">
              おすすめ商品として表示する
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <Link
            href="/ordering/admin/products"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            キャンセル
          </Link>
          <SubmitButton
            className="rounded-full bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
            pendingText="登録中..."
          >
            登録する
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
