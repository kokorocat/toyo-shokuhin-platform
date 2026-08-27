import * as XLSX from "xlsx";

// クライアント提供の実サンプル(2026-08-27)2件を調査し、そうけん君/Teach me Bizが出力する
// レシピExcelは1シート目("店舗用レシピ (完)")の固定セル位置に呼出No.・商品名が入ることを確認した:
//   E3 = 呼出No.(エリアの略称を含む文字列。例:"Ｂ九州6001") — Q3 = 商品名(例:"大きなハンバーグ（大根おろしソース）")
// 呼出No.には既にエリアの略称が含まれているため、この値をそのままrecipe_codeとして使うと
// 「エリアが変われば同じ数字の呼出番号が存在する」という実際の運用(クライアント確認済み)でも
// 会社内で自然に一意になる(例:"Ｂ九州6001"と"Ｇ北九州6001"は別のコードとして扱われる)。
// ファイル名からの解析(parse-file-name.ts)には、この区別に必要なエリア情報が含まれないため、
// 40,000件規模の移行では使用しない(誤って別エリアの同一数字レシピを重複スキップしてしまう)。
const SHEET_NAME = "店舗用レシピ (完)";
const CALL_NO_CELL = "E3";
const NAME_CELL = "Q3";

export type ParsedRecipeFile = { code: string; name: string };

// xlsx/xlsのみ対応。読み取れない場合はnullを返す(ファイル名解析へのフォールバックは行わない —
// フォールバックするとエリア情報を失った状態で登録されてしまうため、手動確認に回す方が安全)。
export async function parseRecipeFileContent(file: File): Promise<ParsedRecipeFile | null> {
  if (!/\.(xlsx|xls)$/i.test(file.name)) return null;

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    // シート名が一致すればそれを優先し、無ければ1シート目にフォールバックする
    // (表紙・説明シートが1シート目に挿入されているファイルへの保険)。
    const sheet = workbook.Sheets[SHEET_NAME] ?? workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return null;

    const code = String(sheet[CALL_NO_CELL]?.v ?? "").trim();
    const name = String(sheet[NAME_CELL]?.v ?? "").trim();
    if (!code || !name) return null;

    // 呼出No.セルが(文字列ではなく)数値として保存されていた場合、エリアの略称が
    // 失われた状態("6001"のみ)になる。これをそのまま登録すると、この機能を作った目的
    // (エリア間の呼出番号重複を防ぐ)を静かに損なうため、数字のみの値は拒否して手動確認に回す。
    if (/^\d+$/.test(code)) return null;

    return { code, name };
  } catch (err) {
    console.error("[recipe] parseRecipeFileContent failed", file.name, err);
    return null;
  }
}
