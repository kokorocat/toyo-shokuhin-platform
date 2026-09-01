// OM-30 商品一覧(仕様書10章 商品管理)。
// 商品の追加・編集・非表示化(物理削除はしない)を行う起点画面。過去注文はスナップショットを
// 保持するため、ここでの編集・非表示化は既存のorder_linesに影響しない(スキーマ側で担保済み)。
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal/get-portal-context";
import { isOrderingAdminRole } from "@/app/ordering/admin/guard";
import { toggleProductStatus } from "./actions";
import { Banner } from "@/components/Banner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { SubmitButton } from "@/components/SubmitButton";
import { OrderingAdminChrome } from "@/app/ordering/admin/OrderingAdminChrome";

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  const value = Array.isArray(v) ? v[0] : v;
  return value && value.length > 0 ? value : undefined;
}

const TYPE_LABELS: Record<string, string> = {
  normal_pop: "通常POP",
  price_input_pop: "価格入POP",
  viking_price: "バイキングプライス",
  normal_seal: "通常シール",
  seal_price_list: "シール価格表掲載品",
  laminate: "ラミネート",
  other: "その他",
};

type ProductListRow = {
  id: string;
  name: string;
  product_type: string;
  unit_price: number;
  lot_size: number;
  status: string;
  is_recommended: boolean;
  display_order: number;
  product_categories: { name: string } | { name: string }[] | null;
};

function categoryName(row: ProductListRow): string {
  const cat = row.product_categories;
  if (!cat) return "-";
  return Array.isArray(cat) ? (cat[0]?.name ?? "-") : cat.name;
}

export default async function OrderingAdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const ctx = await getPortalContext();

  if (!ctx || !isOrderingAdminRole(ctx.roleCode ?? null)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-slate-500">
          権限がありません。管理者権限を持つアカウントで再ログインしてください。
        </p>
      </div>
    );
  }

  const errorMessage = first(sp.error);
  const successMessage = first(sp.success);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, product_type, unit_price, lot_size, status, is_recommended, display_order, product_categories(name)"
    )
    .order("display_order");

  const products = (data ?? []) as ProductListRow[];

  return (
    <OrderingAdminChrome activePath="/ordering/admin/products" displayName={ctx.displayName}>
      <PageHeader
        backHref="/ordering"
        backLabel="カタログに戻る"
        title="商品一覧"
        subtitle="登録済みの販促物商品の管理(追加・編集・公開/非表示の切り替え)"
      />

      {successMessage && (
        <div className="mb-4">
          <Banner variant="success">保存しました。</Banner>
        </div>
      )}
      {errorMessage && (
        <div className="mb-4">
          <Banner variant="error">{errorMessage}</Banner>
        </div>
      )}
      {error && (
        <div className="mb-4">
          <Banner variant="error">商品の取得に失敗しました: {error.message}</Banner>
        </div>
      )}

      <div className="mb-4 flex items-center justify-end">
        <Link
          href="/ordering/admin/products/new"
          className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-600"
        >
          ＋ 新規商品を追加
        </Link>
      </div>

      {products.length === 0 ? (
        <EmptyState message="登録されている商品がありません。「＋ 新規商品を追加」から商品を登録してください。" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="whitespace-nowrap px-3 py-2.5">商品名</th>
                <th className="whitespace-nowrap px-3 py-2.5">カテゴリ</th>
                <th className="whitespace-nowrap px-3 py-2.5">タイプ</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">単価</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">ロット数</th>
                <th className="whitespace-nowrap px-3 py-2.5">おすすめ</th>
                <th className="whitespace-nowrap px-3 py-2.5">状態</th>
                <th className="whitespace-nowrap px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product, idx) => {
                const isActive = product.status === "active";
                const nextStatus = isActive ? "hidden" : "active";
                return (
                  <tr key={product.id} className={`transition-colors hover:bg-blue-50/50 ${idx % 2 === 1 ? "bg-slate-50/60" : ""}`}>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/ordering/admin/products/${product.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {product.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{categoryName(product)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                      {TYPE_LABELS[product.product_type] ?? product.product_type}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-600">
                      ¥{product.unit_price.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-600">{product.lot_size}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {product.is_recommended && (
                        <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                          おすすめ
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {isActive ? "公開中" : "非表示"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <form action={toggleProductStatus}>
                        <input type="hidden" name="product_id" value={product.id} />
                        <input type="hidden" name="next_status" value={nextStatus} />
                        <SubmitButton
                          className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
                            isActive
                              ? "border-red-200 bg-white text-red-600 hover:bg-red-50"
                              : "border-green-200 bg-white text-green-600 hover:bg-green-50"
                          }`}
                          pendingText="処理中..."
                        >
                          {isActive ? "非表示にする" : "公開する"}
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </OrderingAdminChrome>
  );
}
