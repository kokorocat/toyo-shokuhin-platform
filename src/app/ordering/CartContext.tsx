"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItemDetail = Record<string, string>;

export type CartItem = {
  key: string;
  productId: string;
  name: string;
  productType: string;
  unitPrice: number;
  lotSize: number;
  quantity: number;
  detail: CartItemDetail;
  memo: string;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "key">) => void;
  updateQuantity: (key: string, quantity: number) => void;
  updateMemo: (key: string, memo: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  totalAmount: number;
  totalCount: number;
};

const STORAGE_KEY = "ordering-cart-v1";

const CartContext = createContext<CartContextValue | null>(null);

function loadInitial(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // localStorageはSSR側で読めないため、初回レンダーは空配列で揃えてハイドレーション不一致を避け、
    // マウント後にこのeffectで実際のカート内容を読み込む。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(loadInitial());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore storage errors (private mode, quota, etc.)
    }
  }, [items, hydrated]);

  const value = useMemo<CartContextValue>(() => {
    const addItem: CartContextValue["addItem"] = (item) => {
      setItems((prev) => {
        const key = `${item.productId}:${JSON.stringify(item.detail)}`;
        const existing = prev.find((p) => p.key === key);
        if (existing) {
          return prev.map((p) =>
            p.key === key ? { ...p, quantity: p.quantity + item.quantity } : p
          );
        }
        return [...prev, { ...item, key }];
      });
    };
    const updateQuantity: CartContextValue["updateQuantity"] = (key, quantity) => {
      setItems((prev) =>
        prev.map((p) => (p.key === key ? { ...p, quantity: Math.max(1, quantity) } : p))
      );
    };
    const updateMemo: CartContextValue["updateMemo"] = (key, memo) => {
      setItems((prev) => prev.map((p) => (p.key === key ? { ...p, memo } : p)));
    };
    const removeItem: CartContextValue["removeItem"] = (key) => {
      setItems((prev) => prev.filter((p) => p.key !== key));
    };
    const clear = () => setItems([]);

    const totalAmount = items.reduce((sum, i) => sum + i.unitPrice * i.lotSize * i.quantity, 0);
    const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);

    return { items, addItem, updateQuantity, updateMemo, removeItem, clear, totalAmount, totalCount };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
