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
    <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="rounded-l-lg px-2.5 py-1.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-50 active:bg-slate-100"
        aria-label="数量を減らす"
      >
        −
      </button>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))}
        className="w-12 border-x border-slate-300 py-1.5 text-center text-sm tabular-nums"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="rounded-r-lg px-2.5 py-1.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-50 active:bg-slate-100"
        aria-label="数量を増やす"
      >
        ＋
      </button>
    </div>
  );
}
