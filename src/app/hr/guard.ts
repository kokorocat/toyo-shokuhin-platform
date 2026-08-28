// 人事労務管理システムMVPは、9ロール・6段階スコープ(仕様書2章)のうち
// 全権限管理者のみを暫定的に「人事責任者相当」としてアクセス許可する(2026-08-28: 人事部専用という
// クライアント要件と、/master/usersでcompany_adminが広く付与されうる実態を踏まえ、company_adminを除外)。
// 店舗責任者・店舗閲覧向けの自店舗限定参照、および9ロールの権限マトリクスは未実装。
const HR_ADMIN_ROLES = new Set(["super_admin"]);

export function isHrAdminRole(roleCode: string | null): boolean {
  return roleCode !== null && HR_ADMIN_ROLES.has(roleCode);
}
