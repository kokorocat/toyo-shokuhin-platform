// 選択中の発注先店舗IDをlocalStorageに保持する(CartContextと同じ永続化パターン)。
// カタログ画面(店舗選択+商品選択)から確認画面まで、ページ遷移をまたいで状態を引き継ぐために使う。
const STORAGE_KEY = "ordering-bulk-order-stores-v1";

export function getSelectedStoreIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function setSelectedStoreIds(ids: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
}

export function clearSelectedStoreIds(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
}
