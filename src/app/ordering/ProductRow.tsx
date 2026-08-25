"use client";

import { useState } from "react";
import { useCart } from "./CartContext";

export type CatalogProduct = {
  id: string;
  name: string;
  description: string | null;
  product_type: string;
  unit_price: number;
  lot_size: number;
  min_order_qty: number;
  is_recommended: boolean;
  recommend_badge: string | null;
  seal_size: { faces: number; width_mm: number; height_mm: number } | null;
};

const TYPE_LABELS: Record<string, string> = {
  normal_pop: "通常POP",
  price_input_pop: "価格入POP",
  viking_price: "バイキングプライス",
  normal_seal: "通常シール",
  seal_price_list: "シール価格表掲載品",
  laminate: "ラミネート",
  other: "その他",
};

export function ProductRow({ product }: { product: CatalogProduct }) {
  const cart = useCart();
  const [qty, setQty] = useState(product.min_order_qty || 1);
  const [added, setAdded] = useState(false);

  // 商品タイプ別の入力詳細(仕様書5〜6)
  const [priceProductName, setPriceProductName] = useState("");
  const [priceSpec, setPriceSpec] = useState("");
  const [priceTaxExcl, setPriceTaxExcl] = useState("");
  const [vikingCallNumber, setVikingCallNumber] = useState("");
  const [vikingProductName, setVikingProductName] = useState("");
  const [vikingPaper, setVikingPaper] = useState("");

  const requiresDetail = product.product_type === "price_input_pop" || product.product_type === "viking_price";
  const detailValid =
    product.product_type === "price_input_pop"
      ? priceProductName.trim() && priceSpec.trim() && priceTaxExcl.trim()
      : product.product_type === "viking_price"
        ? vikingCallNumber.trim() && vikingProductName.trim() && vikingPaper.trim()
        : true;

  function handleAdd() {
    if (!detailValid || qty < 1) return;
    const detail: Record<string, string> =
      product.product_type === "price_input_pop"
        ? { 商品名: priceProductName, 規格: priceSpec, 税抜価格: priceTaxExcl }
        : product.product_type === "viking_price"
          ? { 呼出番号: vikingCallNumber, 商品名: vikingProductName, 用紙: vikingPaper }
          : {};

    cart.addItem({
      productId: product.id,
      name: product.name,
      productType: product.product_type,
      unitPrice: product.unit_price,
      lotSize: product.lot_size,
      quantity: qty,
      detail,
      memo: "",
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex sm:items-start sm:gap-4 sm:p-4">
      {/* placeholder image box (no real image upload pipeline in this MVP) */}
      <div className="mb-3 flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300 sm:mb-0">
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18A1.5 1.5 0 0022.5 18.75V5.25A1.5 1.5 0 0021 3.75H3A1.5 1.5 0 001.5 5.25v13.5A1.5 1.5 0 003 20.25z" />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="bg-white font-semibold text-slate-900">{product.name}</p>
          {product.is_recommended && product.recommend_badge && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
              {product.recommend_badge}
            </span>
          )}
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            {TYPE_LABELS[product.product_type] ?? product.product_type}
          </span>
        </div>
        {product.description && <p className="mt-0.5 text-sm text-slate-500">{product.description}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
          <span className="font-bold text-red-600">
            {product.unit_price > 0 ? `${product.unit_price}円` : "無料"}
          </span>
          <span className="text-blue-600">
            {product.lot_size > 1 ? `ロット ${product.lot_size}枚/回` : "1枚単位"}
          </span>
          {product.seal_size && (
            <span className="text-blue-600">
              {product.seal_size.faces}面（{product.seal_size.width_mm}×{product.seal_size.height_mm}mm）
            </span>
          )}
        </div>

        {product.product_type === "price_input_pop" && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              value={priceProductName}
              onChange={(e) => setPriceProductName(e.target.value)}
              placeholder="商品名"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <input
              value={priceSpec}
              onChange={(e) => setPriceSpec(e.target.value)}
              placeholder="規格"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <input
              value={priceTaxExcl}
              onChange={(e) => setPriceTaxExcl(e.target.value)}
              placeholder="税抜価格"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        )}
        {product.product_type === "viking_price" && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              value={vikingCallNumber}
              onChange={(e) => setVikingCallNumber(e.target.value)}
              placeholder="呼出番号"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <input
              value={vikingProductName}
              onChange={(e) => setVikingProductName(e.target.value)}
              placeholder="商品名"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <input
              value={vikingPaper}
              onChange={(e) => setVikingPaper(e.target.value)}
              placeholder="用紙"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-300">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(product.min_order_qty || 1, q - 1))}
              className="px-3.5 py-2 text-base font-medium text-slate-500 transition-colors hover:bg-slate-50 active:bg-slate-100"
              aria-label="数量を減らす"
            >
              −
            </button>
            <input
              type="number"
              min={product.min_order_qty || 1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              className="w-14 border-x border-slate-300 py-2 text-center text-sm"
            />
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              className="px-3.5 py-2 text-base font-medium text-slate-500 transition-colors hover:bg-slate-50 active:bg-slate-100"
              aria-label="数量を増やす"
            >
              ＋
            </button>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={requiresDetail && !detailValid}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors ${
              added ? "bg-green-600" : "bg-blue-800 hover:bg-blue-900"
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {added ? "追加しました" : "カートに追加"}
          </button>
        </div>
      </div>
    </div>
  );
}
