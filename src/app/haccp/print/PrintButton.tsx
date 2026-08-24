"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
    >
      この画面を印刷/PDF保存
    </button>
  );
}
