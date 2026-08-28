import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ProductRow, type CatalogProduct } from "./ProductRow";
import { CartBar } from "./CartBar";

export default async function OrderingCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
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
          "id, category_id, name, description, product_type, unit_price, lot_size, min_order_qty, is_recommended, recommend_badge, display_order, seal_sizes(faces, width_mm, height_mm)"
        )
        .eq("status", "active")
        .order("display_order")
        .limit(200);
      if (category) query = query.eq("category_id", category);
      if (q) query = query.ilike("name", `%${q}%`);
      return query;
    })(),
  ]);

  const { data: products } = productsQuery;

  const topCategories = (categories ?? []).filter((c) => c.level === 1);
  const midCategories = category
    ? (categories ?? []).filter((c) => c.level === 2)
    : [];

  const catalogProducts: CatalogProduct[] = (products ?? []).map((p) => ({
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
  }));

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6 pb-28">
      <PageHeader
        backHref="/"
        backLabel="ポータルTOPに戻る"
        title="商品カタログ"
        subtitle={`${ctx.store.name}（${ctx.store.storeCode}）`}
      />

      <div className="mb-3 flex items-center gap-2">
        <form className="flex-1">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="商品名で検索"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </form>
        <Link
          href="/ordering/history"
          className="shrink-0 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          発注履歴
        </Link>
      </div>

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        <Link
          href="/ordering"
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            !category ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          すべて
        </Link>
        {topCategories.map((c) => (
          <Link
            key={c.id}
            href={`/ordering?category=${c.id}`}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              category === c.id ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>
      {midCategories.length > 0 && (
        <div className="-mt-2 mb-4 flex gap-1.5 overflow-x-auto pb-1">
          {midCategories.map((c) => (
            <span
              key={c.id}
              className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500"
            >
              {c.name}
            </span>
          ))}
        </div>
      )}

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
    </div>
  );
}
