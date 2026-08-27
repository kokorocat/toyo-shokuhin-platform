// ファイル名先頭の数字の並びを呼出番号(recipe_code)として扱う規約。
// 例: "0006_20260406_140146.xlsx" → コード"0006" / "0253.かしわ弁当B(G北九州).xlsx" → コード"0253"
// 区切り文字の有無に関わらず「先頭の数字の並び」だけをコードとして厳密に切り出す(区切り文字が
// 直後に無いファイル名 "0253かしわ弁当B.xlsx" のようなケースで、ファイル名全体をコードとして
// 誤登録してしまうことを防ぐため)。先頭が数字でないファイルはnullを返し、手動確認に回す。
// src/app/recipe/admin/upload/actions.ts(承認済みレシピアップロード)と
// src/app/recipe/admin/submit/actions.ts(新規レシピ申請)の両方から共有する。
export function parseFileName(fileName: string): { code: string; name: string } | null {
  const withoutExt = fileName.replace(/\.[^./]+$/, "");
  const match = withoutExt.match(/^(\d+)[_\-. 　]*(.*)$/);
  if (!match) return null;
  const code = match[1];
  const rest = match[2].trim();
  return { code, name: rest || withoutExt };
}
