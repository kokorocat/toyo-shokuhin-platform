import Link from "next/link";
import { INSPECTION_CATEGORIES } from "./constants";

const INPUT =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20";

export function unansweredYmList(answeredMonths: Set<string>, today: string, fromYm = "2026-04"): string[] {
  const out: string[] = [];
  const [fromY, fromM] = fromYm.split("-").map(Number);
  const [toY, toM] = today.slice(0, 7).split("-").map(Number);
  let y = fromY;
  let m = fromM;
  while (y < toY || (y === toY && m <= toM)) {
    const key = `${y}-${String(m).padStart(2, "0")}-01`;
    if (!answeredMonths.has(key)) out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export function UnansweredMonthBanner({
  months,
  hrefBase,
}: {
  months: string[];
  hrefBase: string;
}) {
  if (months.length === 0) return null;
  const sep = hrefBase.includes("?") ? "&" : "?";
  return (
    <div className="rounded-lg border-2 border-orange-400 bg-orange-50 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-lg font-bold text-orange-700">未回答の月があります！</p>
        <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">{months.length}件</span>
      </div>
      <p className="mt-1 text-xs text-orange-800">
        食品衛生自主点検票が未回答の月です。月を選択すると、入力欄に年月が自動反映されます。
        {/* 要確認: 保存処理は現行どおり当月固定（actions.ts 未変更）。年月は表示用。 */}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {months.map((ym) => {
          const [y, mo] = ym.split("-");
          return (
            <Link
              key={ym}
              href={`${hrefBase}${sep}ym=${ym}`}
              className="rounded-full border border-orange-400 bg-white px-3 py-1 text-sm font-medium text-orange-800 hover:bg-orange-100"
            >
              {y}年{Number(mo)}月
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function InspectionHeaderFields({
  year,
  month,
  submittedOn,
  storeName,
}: {
  year: string;
  month: string;
  submittedOn: string;
  storeName: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-orange-100 bg-orange-50 px-5 py-3">
        <h2 className="text-base font-bold text-orange-800">上部情報</h2>
      </div>
      <div className="grid grid-cols-1 gap-3 px-5 py-5 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">年（必須）</label>
          <input name="display_year" type="number" defaultValue={year} className={INPUT} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">月（必須）</label>
          <input name="display_month" type="number" defaultValue={month} min={1} max={12} className={INPUT} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">提出日（必須）</label>
          <input name="display_submitted_on" type="date" defaultValue={submittedOn} className={INPUT} />
        </div>
        <div className="sm:col-span-3">
          <label className="mb-1 block text-xs font-medium text-slate-600">店舗名（必須）</label>
          <input name="display_store_name" type="text" defaultValue={storeName} readOnly className={`${INPUT} bg-slate-50`} />
        </div>
      </div>
    </div>
  );
}

export function InspectionItemsTable() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center bg-sky-100 px-4 py-2 text-xs font-bold text-sky-900">
        <span className="w-12">No</span>
        <span className="flex-1">主たる点検事項・質問</span>
        <span className="w-36 text-center">判定（必須）</span>
      </div>
      {INSPECTION_CATEGORIES.flatMap((category) =>
        category.items.map((q) => ({
          no: q.code.replace("q", "").replace("_", "-"),
          title: category.title,
          text: q.text,
          code: q.code,
        }))
      ).map((row) => (
        <div key={row.code} className="flex items-center border-t border-slate-100 px-4 py-3">
          <span className="w-12 text-sm font-bold text-slate-500">{row.no}</span>
          <div className="min-w-0 flex-1 pr-2">
            <p className="text-sm font-bold text-slate-800">{row.title}</p>
            <p className="text-xs text-slate-600">{row.text}</p>
          </div>
          <div className="flex w-36 justify-center gap-2">
            <label className="cursor-pointer rounded-full border-2 border-green-300 px-4 py-1.5 text-sm font-bold text-green-600 has-[:checked]:border-green-600 has-[:checked]:bg-green-50 has-[:checked]:text-green-700">
              <input type="radio" name={`answer_${row.code}`} value="good" required className="sr-only" />
              良
            </label>
            <label className="cursor-pointer rounded-full border-2 border-red-300 px-4 py-1.5 text-sm font-bold text-red-500 has-[:checked]:border-red-600 has-[:checked]:bg-red-50 has-[:checked]:text-red-700">
              <input type="radio" name={`answer_${row.code}`} value="needs_improvement" required className="sr-only" />
              否
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}
