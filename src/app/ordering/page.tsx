import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { EmptyState } from "@/components/EmptyState";
import { ProductRow, type CatalogProduct } from "./ProductRow";
import { CartBar } from "./CartBar";
import { OrderingStoreShell } from "./OrderingStoreShell";
import { todayInTokyo } from "@/lib/date";

export default async function OrderingCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; mid?: string }>;
}) {
  const { category, q, mid } = await searchParams;
  const ctx = await getPortalContext();

  if (!ctx?.store) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">
          店舗スコープを持つアカウントでログインしてください。
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: categories }, productsQuery] = await Promise.all([
    supabase
      .from("product_categories")
      .select("id, parent_id, level, name, display_order")
      .eq("status", "active")
      .order("display_order"),
    (() => {
      let query = supabase
        .from("products")
        .select(
          "id, category_id, name, description, product_type, unit_price, lot_size, min_order_qty, is_recommended, recommend_badge, display_order, seal_sizes(faces, width_mm, height_mm), product_images(storage_path, is_primary, display_order)"
        )
        .eq("status", "active")
        .order("display_order")
        .limit(200);
      if (mid) query = query.eq("category_id", mid);
      else if (category) query = query.eq("category_id", category);
      if (q) query = query.ilike("name", `%${q}%`);
      return query;
    })(),
  ]);

  const { data: products } = productsQuery;

  const topCategories = (categories ?? []).filter((c) => c.level === 1);
  const midCategories = (categories ?? []).filter((c) => c.level === 2 && (!category || c.parent_id === category));
  const selectedCat = (categories ?? []).find((c) => c.id === (mid || category));

  const catalogProducts: CatalogProduct[] = (products ?? []).map((p) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const images = ((p as any).product_images ?? []) as { storage_path: string; is_primary: boolean }[];
    const primary = images.find((i) => i.is_primary) ?? images[0];
    const imageUrl = primary
      ? supabase.storage.from("product-images").getPublicUrl(primary.storage_path).data.publicUrl
      : null;
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      product_type: p.product_type,
      unit_price: p.unit_price,
      lot_size: p.lot_size,
      min_order_qty: p.min_order_qty,
      is_recommended: p.is_recommended,
      recommend_badge: p.recommend_badge,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      seal_size: (p.seal_sizes as any) ?? null,
      imageUrl,
    };
  });

  return (
    <OrderingStoreShell activePath="/ordering" storeLabel={ctx.store.name}>
      <p className="mb-2 text-xs text-slate-500">カテゴリで絞り込み {selectedCat ? `選択中： ${selectedCat.name}` : ""}</p>

      <div className="mb-3 flex items-center gap-2">
        <form className="flex-1">
          {category && <input type="hidden" name="category" value={category} />}
          {mid && <input type="hidden" name="mid" value={mid} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="キーワード検索 (スペース区切りで複数ワードOK・販促物名/カテゴリ/ID)"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </form>
        <Link href="/ordering/cart" className="shrink-0 rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white">
          カート
        </Link>
      </div>

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        <Link
          href="/ordering"
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
            !category ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-600"
          }`}
        >
          すべて
        </Link>
        {topCategories.map((c) => (
          <Link
            key={c.id}
            href={`/ordering?category=${c.id}`}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
              category === c.id ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-600"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>
      {midCategories.length > 0 && (
        <div className="-mt-2 mb-4 flex gap-1.5 overflow-x-auto pb-1">
          {midCategories.map((c) => (
            <Link
              key={c.id}
              href={`/ordering?category=${c.parent_id ?? category ?? c.id}&mid=${c.id}`}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                mid === c.id ? "border-blue-600 bg-blue-50 text-blue-800" : "border-blue-300 bg-white text-blue-700"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-end gap-3 text-sm">
        <div>
          <label className="mb-1 block text-xs text-slate-500">発注日</label>
          <input type="date" defaultValue={todayInTokyo()} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">配送先</label>
          <select className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
            <option>{ctx.store.name} 既定配送先</option>
          </select>
        </div>
        {/* 要確認: 発注日・配送先はカート確定時の既存フィールドへ渡す想定。店舗住所帳テーブルは未整備。 */}
      </div>
      <p className="mb-3 text-xs text-slate-500">表示対象: {catalogProducts.length}件</p>

      {catalogProducts.length === 0 ? (
        <EmptyState message="該当する商品がありません。" />
      ) : (
        <div className="space-y-2">
          {catalogProducts.map((p) => (
            <ProductRow key={p.id} product={p} />
          ))}
        </div>
      )}

      <CartBar />
    </OrderingStoreShell>
  );
}
