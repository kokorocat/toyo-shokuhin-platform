// HM-*(管理者機能)は店舗スコープを持たない管理者ロール(会社管理者・エリア管理者・全権限管理者)のみ利用可能。
// システム保守ロールは原則データ閲覧不可(仕様書2「システム保守: 原則データ閲覧不可または必要最小限」)。
const HACCP_ADMIN_ROLES = new Set(["company_admin", "area_admin", "super_admin"]);

export function isHaccpAdminRole(roleCode: string | null): boolean {
  return roleCode !== null && HACCP_ADMIN_ROLES.has(roleCode);
}
