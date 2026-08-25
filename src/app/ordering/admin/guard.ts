// 販促物受発注システムの管理者機能(OM-*)は、仕様書上「受注管理者」「商品管理者」
// 「全権限管理者」等の専用ロールを想定しているが、現状の共通ロールモデルにはこれらが
// 存在しないため、暫定的に会社管理者・全権限管理者のみアクセス許可する。
const ORDERING_ADMIN_ROLES = new Set(["company_admin", "super_admin"]);

export function isOrderingAdminRole(roleCode: string | null): boolean {
  return roleCode !== null && ORDERING_ADMIN_ROLES.has(roleCode);
}
