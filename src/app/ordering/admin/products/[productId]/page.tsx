// OM-30 商品編集(仕様書10章)。
// 商品を編集しても過去のorder_lines(注文明細)は発注時点のスナップショットを保持するため
// 影響しない(スキーマがこれを担保済み)。物理削除・非表示切替はこの画面では扱わず、
// 商品一覧(toggleProductStatus)側の責務とする。
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isOrderingAdminRole } from "@/app/ordering/admin/guard";
import { updateProduct } from "@/app/ordering/admin/products/actions";
import { PageHeader } from "@/components/PageHeader";
import { Banner } from "@/components/Banner";

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  normal_pop: "通常POP",
  price_input_pop: "価格入POP",
  viking_price: "バイキングプライス",
  normal_seal: "通常シール",
  seal_price_list: "シール価格表掲載品",
  laminate: "ラミネート",
  other: "その他",
};

const PRODUCT_TYPE_ORDER = [
  "normal_pop",
  "price_input_pop",
  "viking_price",
  "normal_seal",
  "seal_price_list",
  "laminate",
  "other",
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: "公開中", className: "bg-green-100 text-green-700" },
  hidden: { label: "非表示", className: "bg-slate-100 text-slate-500" },
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const labelClass = "mb-1.5 block text-xs font-medium text-slate-600";

type CategoryRow = {
  id: string;
  parent_id: string | null;
  name: string;
  display_order: number;
  status: string;
};

type SealSizeRow = {
  id: string;
  faces: number;
  width_mm: number;
  height_mm: number;
  note: string | null;
};

// 大分類→中分類→小分類の階層をインデント付きの1階層セレクトに展開する。
// parent_idチェーンで再帰するためlevelの値に依存しない。
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

function sealSizeLabel(s: SealSizeRow): string {
  const base = `${s.faces}面付 ${s.width_mm}×${s.height_mm}mm`;
  return s.note ? `${base}(${s.note})` : base;
}

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { productId } = await params;
  const sp = await searchParams;
  const ctx = await getPortalContext();

  if (!isOrderingAdminRole(ctx?.roleCode ?? null)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">
          権限がありません。管理者アカウントで再度ログインしてください。
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select(
      "id, category_id, product_type, name, description, unit_price, lot_size, seal_size_id, is_recommended, recommend_badge, status"
    )
    .eq("id", productId)
    .maybeSingle();

  // 存在しないID(削除済み想定・URL直指定含む)はnotFoundとして扱う。
  if (!product) notFound();

  const [{ data: categories }, { data: sealSizes }] = await Promise.all([
    supabase
      .from("product_categories")
      .select("id, parent_id, name, display_order, status")
      .order("display_order"),
    supabase.from("seal_sizes").select("id, faces, width_mm, height_mm, note").order("faces"),
  ]);

  const categoryOptions = flattenCategories((categories as CategoryRow[]) ?? []);
  const sealSizeOptions = (sealSizes as SealSizeRow[]) ?? [];

  const statusBadge = STATUS_BADGE[product.status] ?? STATUS_BADGE.hidden;

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6">
      <PageHeader
        backHref="/ordering/admin/products"
        backLabel="商品一覧に戻る"
        title={`商品を編集: ${product.name}`}
      />

      <div className="mb-4 flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${statusBadge.className}`}
        >
          {statusBadge.label}
        </span>
        <p className="text-xs text-slate-400">
          ※公開・非表示の切り替えは商品一覧画面から行ってください。
        </p>
      </div>

      {sp.error && (
        <div className="mb-4">
          <Banner variant="error">{sp.error}</Banner>
        </div>
      )}

      <form action={updateProduct} className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">商品情報</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">
          <input type="hidden" name="product_id" value={product.id} />

          <div className="sm:col-span-2">
            <label htmlFor="name" className={labelClass}>
              商品名 <span className="text-red-600">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={product.name}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="category_id" className={labelClass}>
              カテゴリ
            </label>
            <select
              id="category_id"
              name="category_id"
              defaultValue={product.category_id ?? ""}
              className={inputClass}
            >
              <option value="">（未分類）</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="product_type" className={labelClass}>
              商品タイプ <span className="text-red-600">*</span>
            </label>
            <select
              id="product_type"
              name="product_type"
              required
              defaultValue={product.product_type}
              className={inputClass}
            >
              {PRODUCT_TYPE_ORDER.map((t) => (
                <option key={t} value={t}>
                  {PRODUCT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="description" className={labelClass}>
              説明
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={product.description ?? ""}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="unit_price" className={labelClass}>
              単価(円) <span className="text-red-600">*</span>
            </label>
            <input
              id="unit_price"
              name="unit_price"
              type="number"
              min={0}
              step={1}
              required
              defaultValue={product.unit_price}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="lot_size" className={labelClass}>
              ロット数 <span className="text-red-600">*</span>
            </label>
            <input
              id="lot_size"
              name="lot_size"
              type="number"
              min={1}
              step={1}
              required
              defaultValue={product.lot_size}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="seal_size_id" className={labelClass}>
              シールサイズ
            </label>
            <select
              id="seal_size_id"
              name="seal_size_id"
              defaultValue={product.seal_size_id ?? ""}
              className={inputClass}
            >
              <option value="">（指定なし）</option>
              {sealSizeOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {sealSizeLabel(s)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              ※商品タイプが「通常シール」の場合のみ使用されます。
            </p>
          </div>

          <div>
            <label htmlFor="recommend_badge" className={labelClass}>
              おすすめバッジ文言
            </label>
            <input
              id="recommend_badge"
              name="recommend_badge"
              type="text"
              defaultValue={product.recommend_badge ?? ""}
              placeholder="例: 人気No.1"
              className={inputClass}
            />
          </div>

          <div className="flex items-center sm:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="is_recommended"
                defaultChecked={product.is_recommended}
                className="h-4 w-4 rounded border-slate-300 text-blue-800 focus:ring-blue-500/20"
              />
              おすすめ商品として表示する
            </label>
          </div>

          <div className="flex items-center gap-2 sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 active:bg-blue-950"
            >
              更新する
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
