import type { ReactNode } from "react";

export function StickyActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 py-3.5 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
        {children}
      </div>
    </div>
  );
}
