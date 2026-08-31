"use client";

import { useEffect, useState } from "react";
import { getSelectedStoreIds, setSelectedStoreIds } from "./selected-stores";

export function StoreSelector({ stores }: { stores: { id: string; name: string; store_code: string }[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(new Set(getSelectedStoreIds().filter((id) => stores.some((s) => s.id === id))));
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setSelectedStoreIds([...selected]);
  }, [selected, hydrated]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === stores.length ? new Set() : new Set(stores.map((s) => s.id))));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs font-medium text-slate-600">発注先店舗（{selected.size}店舗選択中）</label>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          {selected.size === stores.length ? "すべて解除" : "すべて選択"}
        </button>
      </div>
      <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
        {stores.map((s) => (
          <label
            key={s.id}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
          >
            <input
              type="checkbox"
              checked={selected.has(s.id)}
              onChange={() => toggle(s.id)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
            />
            <span>{s.store_code} {s.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
