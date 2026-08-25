// レシピ閲覧システムの管理機能(RV-30/RV-50)は、仕様書上「広域」「承認者」等の専用ロールを
// 想定しているが、現状の共通ロールモデルにはこれらが存在しないため、暫定的に会社管理者・
// 全権限管理者のみアクセス許可する。
const RECIPE_ADMIN_ROLES = new Set(["company_admin", "super_admin"]);

export function isRecipeAdminRole(roleCode: string | null): boolean {
  return roleCode !== null && RECIPE_ADMIN_ROLES.has(roleCode);
}
