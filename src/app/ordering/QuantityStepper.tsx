"use client";

export function QuantityStepper({
  value,
  min = 1,
  onChange,
}: {
  value: number;
  min?: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center rounded-lg border border-slate-300">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="px-3.5 py-2 text-base font-medium text-slate-500 transition-colors hover:bg-slate-50 active:bg-slate-100"
        aria-label="数量を減らす"
      >
        −
      </button>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))}
        className="w-14 border-x border-slate-300 py-2 text-center text-sm"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="px-3.5 py-2 text-base font-medium text-slate-500 transition-colors hover:bg-slate-50 active:bg-slate-100"
        aria-label="数量を増やす"
      >
        ＋
      </button>
    </div>
  );
}
