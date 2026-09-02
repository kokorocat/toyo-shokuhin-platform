"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="mt-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white print:hidden"
    >
      印刷 / PDF保存
    </button>
  );
}
