// 店舗・従業員マスター管理(会社・店舗・従業員・ユーザー権限)は、hr/ordering/recipeと同様に
// 会社管理者・全権限管理者のみ暫定的にアクセス許可する(エリア管理者は対象外 — HACCPが
// エリア管理者にも開放しているのは店舗運用の監督が主目的のためで、会社・店舗そのものの
// 追加/変更を伴うマスター管理はより狭いロールに限定する)。
const MASTER_ADMIN_ROLES = new Set(["company_admin", "super_admin"]);

export function isMasterAdminRole(roleCode: string | null): boolean {
  return roleCode !== null && MASTER_ADMIN_ROLES.has(roleCode);
}

// 会社の新規作成、company_admin/super_adminロールの付与など、全権限管理者専用の操作向け。
export function isSuperAdminRole(roleCode: string | null): boolean {
  return roleCode === "super_admin";
}
