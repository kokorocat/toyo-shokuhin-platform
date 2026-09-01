// 複数店舗一斉発注(仕様書2「複数店舗発注アカウント」「全店一斉発注アカウント」の実体)。
// 新しいロール軸は作らず、既にordering/admin配下へのアクセスを許可されている
// area_admin/company_admin/super_adminが、自社・自エリアの複数店舗へまとめて発注できるようにする
// (private.user_store_ids()経由でこれらのロールは元々複数店舗への書き込み権限を持っているため、
// 権限モデル自体は変更不要 — 単一店舗前提だったUIを複数店舗選択に対応させるだけでよい)。
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isOrderingAdminRole } from "@/app/ordering/admin/guard";
import { EmptyState } from "@/components/EmptyState";
import { AccessDenied } from "@/components/AccessDenied";
import { ProductRow, type CatalogProduct } from "@/app/ordering/ProductRow";
import { SubmitButton } from "@/components/SubmitButton";
import { BulkOrderBar } from "./BulkOrderBar";
import { StoreSelector } from "./StoreSelector";

export default async function BulkOrderCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ company_id?: string; category?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getPortalContext();

  if (!isOrderingAdminRole(ctx?.roleCode ?? null)) {
    return <AccessDenied message="この画面を表示する権限がありません。管理者権限を持つアカウントで再ログインしてください。" />;
  }

  const supabase = await createClient();

  const { data: companies } = await supabase.from("companies").select("id, name").eq("status", "active").order("name");
  const companyOptions = companies ?? [];
  const companyId = sp.company_id || (companyOptions.length === 1 ? companyOptions[0].id : "");

  let storeOptions: { id: string; name: string; store_code: string }[] = [];
  if (companyId) {
    const { data: stores } = await supabase
      .from("stores")
      .select("id, name, store_code")
      .eq("company_id", companyId)
      .eq("status", "active")
      .order("store_code");
    storeOptions = stores ?? [];
  }

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
      if (sp.category) query = query.eq("category_id", sp.category);
      if (sp.q) query = query.ilike("name", `%${sp.q}%`);
      return query;
    })(),
  ]);
  const { data: products } = productsQuery;

  const topCategories = (categories ?? []).filter((c) => c.level === 1);

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
      <Link href="/ordering/admin" className="text-sm text-blue-600 hover:underline">← 受発注管理TOPに戻る</Link>
      <h1 className="mt-2 mb-6 text-lg font-bold text-slate-800">複数店舗一斉発注</h1>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <form className="mb-3 flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="company_id" className="mb-1.5 block text-xs font-medium text-slate-600">会社</label>
            <select
              id="company_id"
              name="company_id"
              defaultValue={companyId}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">選択してください</option>
              {companyOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <SubmitButton className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
            切り替える
          </SubmitButton>
        </form>

        {companyId ? (
          <>
            {/* companyIdが変わるたびに選択状態をリセットするためkeyを付ける(会社をまたいだ
                古い選択がUIに残らないように)。storeOptionsが0件でも必ずマウントし、
                他社の古いlocalStorageの値をここで確実に除去する。 */}
            <StoreSelector key={companyId} stores={storeOptions} />
            {storeOptions.length === 0 && (
              <p className="mt-2 text-xs text-slate-400">この会社に店舗がありません。</p>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-400">会社を選択すると発注先の店舗を選べます。</p>
        )}
      </div>

      {companyId && (
        <>
          <div className="mb-3 flex items-center gap-2">
            <form className="flex-1">
              <input type="hidden" name="company_id" value={companyId} />
              <input
                type="search"
                name="q"
                defaultValue={sp.q}
                placeholder="商品名で検索"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </form>
          </div>

          <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
            <Link
              href={`/ordering/admin/bulk-order?company_id=${companyId}`}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                !sp.category ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              すべて
            </Link>
            {topCategories.map((c) => (
              <Link
                key={c.id}
                href={`/ordering/admin/bulk-order?company_id=${companyId}&category=${c.id}`}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  sp.category === c.id ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {c.name}
              </Link>
            ))}
          </div>

          {catalogProducts.length === 0 ? (
            <EmptyState message="該当する商品がありません。" />
          ) : (
            <div className="space-y-2">
              {catalogProducts.map((p) => (
                <ProductRow key={p.id} product={p} />
              ))}
            </div>
          )}

          <BulkOrderBar companyId={companyId} />
        </>
      )}
    </div>
  );
}
