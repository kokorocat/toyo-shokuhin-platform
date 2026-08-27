// 販促物受発注システムの管理者機能(OM-*)は、仕様書上「受注管理者」「商品管理者」
// 「全権限管理者」等の専用ロールを想定しているが、現状の共通ロールモデルにはこれらが
// 存在しないため、会社管理者・全権限管理者に加え、クライアントの組織図(営業層が複数
// エリアのレシピ・販促物を横断的に扱う)に基づきエリア管理者もアクセス許可する。
// 会社スコープの絞り込みはRLS側(private.is_ordering_admin_for_company)で行う。
const ORDERING_ADMIN_ROLES = new Set(["area_admin", "company_admin", "super_admin"]);

export function isOrderingAdminRole(roleCode: string | null): boolean {
  return roleCode !== null && ORDERING_ADMIN_ROLES.has(roleCode);
}
