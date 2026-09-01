import Link from "next/link";
import type { ReactNode } from "react";

const TABS = [
  { href: "/haccp/admin", label: "店舗管理", match: (p: string) => p === "/haccp/admin" },
  { href: "/haccp/admin/employees", label: "従業員管理", match: (p: string) => p.startsWith("/haccp/admin/employees") },
  { href: "/haccp/admin/stores", label: "HACCP回答状況", match: (p: string) => p.startsWith("/haccp/admin/stores") },
  { href: "/haccp/admin/maintenance", label: "保守・診断", match: (p: string) => p.startsWith("/haccp/admin/maintenance") },
] as const;

export function HaccpAdminChrome({
  title,
  subtitle,
  activePath,
  children,
}: {
  title: string;
  subtitle?: string;
  activePath: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      <header className="bg-gradient-to-r from-teal-700 to-teal-500 px-4 py-4 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-lg font-bold">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-teal-100">{subtitle}</p>}
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Link href="/" className="text-sm text-teal-700 hover:underline">
          ← ポータルTOPに戻る
        </Link>
        {children}
      </div>
    </div>
  );
}

export function HaccpAdminTabs({ activePath, query = "" }: { activePath: string; query?: string }) {
  const qs = query ? `?${query}` : "";
  return (
    <nav className="mt-5 flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const active = tab.match(activePath);
        return (
          <Link
            key={tab.href}
            href={`${tab.href}${qs}`}
            className={
              active
                ? "rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white"
                : "rounded-lg border border-teal-300 bg-white px-4 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function HaccpKpiRow({
  storeCount,
  employeeCount,
  needsCheck,
  loginLabel,
}: {
  storeCount: number | string;
  employeeCount: number | string;
  needsCheck: number | string;
  loginLabel: string;
}) {
  const cards = [
    { label: "店舗数", value: storeCount },
    { label: "在籍従業員", value: employeeCount },
    { label: "要確認", value: needsCheck },
    { label: "ログイン", value: loginLabel },
  ];
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-teal-100 border-t-4 border-t-teal-600 bg-white p-4">
          <p className="text-xs text-slate-500">{c.label}</p>
          <p className="mt-1 truncate text-xl font-bold tabular-nums text-slate-900">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
