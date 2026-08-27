// レシピ閲覧システムの管理者ロール構成は、2026-08-27にクライアントから実際のGAS画面
// スクリーンショットと共に確定した(旧: 2026-08-26の組織図のみに基づく暫定判断でarea_adminにも
// 開放していたが、これは誤りだったため撤回した — 詳細は20260827000003マイグレーションのコメント参照)。
// ・新規申請/申請履歴/承認済みレシピアップロード/ユーザー管理 = 広域(company_admin) + 全権限管理者(super_admin)
// ・承認待ち申請/承認履歴/メール通知管理 = 全権限管理者(super_admin)のみ
// ・ブロック長/エリア長/営業(area_admin)は自身の管轄エリアの閲覧のみ(RLSのrecipes_selectで対応済み、
//   管理機能への導線は一切持たない)。
const RECIPE_ADMIN_ROLES = new Set(["company_admin", "super_admin"]);

export function isRecipeAdminRole(roleCode: string | null): boolean {
  return roleCode !== null && RECIPE_ADMIN_ROLES.has(roleCode);
}

// 承認待ち申請/承認履歴/メール通知管理は全権限管理者のみ(広域は申請はできるが承認はできない)。
export function isRecipeApprovalRole(roleCode: string | null): boolean {
  return roleCode === "super_admin";
}
