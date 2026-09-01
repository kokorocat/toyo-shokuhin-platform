import Link from "next/link";
import { isRecipeAdminRole, isRecipeApprovalRole } from "./admin/guard";
import type { PortalContext } from "@/lib/portal/get-portal-context";

const TABS: { label: string; href: string; role: "all" | "admin" | "approval" }[] = [
  { label: "レシピ一覧", href: "/recipe", role: "all" },
  { label: "新規レシピ申請", href: "/recipe/admin/submit", role: "admin" },
  { label: "申請履歴", href: "/recipe/admin/history", role: "admin" },
  { label: "承認待ち一覧", href: "/recipe/admin/approvals", role: "approval" },
  { label: "承認履歴", href: "/recipe/admin/approvals/history", role: "approval" },
  { label: "承認済みレシピアップロード", href: "/recipe/admin/upload", role: "admin" },
  { label: "申請者管理", href: "/recipe/admin/submitters", role: "admin" },
];

function isTabVisible(role: "all" | "admin" | "approval", roleCode: string | null): boolean {
  if (role === "all") return true;
  if (role === "admin") return isRecipeAdminRole(roleCode);
  return isRecipeApprovalRole(roleCode);
}

export function RecipeHeader({ ctx }: { ctx: PortalContext | null }) {
  const roleLabel = ctx?.roleCode ?? "-";
  const groupLabel = ctx?.company?.name ?? ctx?.area?.name ?? "-";
  return (
    <div className="bg-slate-800 px-4 py-3 text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-600 text-sm font-bold">
            R
          </div>
          <span className="text-sm font-bold tracking-wide">レシピ閲覧システム</span>
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden text-xs text-white/80 sm:block">権限：{roleLabel}／グループ：{groupLabel}</p>
          <Link
            href="/"
            className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-700"
          >
            ポータルTOP
          </Link>
        </div>
      </div>
    </div>
  );
}

export function RecipeTabs({
  roleCode,
  activeHref,
}: {
  roleCode: string | null;
  activeHref: string;
}) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {TABS.filter((t) => isTabVisible(t.role, roleCode)).map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={
            activeHref === tab.href
              ? "rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white"
              : "rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
