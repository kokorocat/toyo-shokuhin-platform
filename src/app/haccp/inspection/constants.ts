// HC-30 食品衛生自主点検 8カテゴリ18項目
// クライアント提供の原紙(食品自主点検表原紙.xlsx, 2026-08-26受領)に基づく正式な設問。
// 原紙は月4ページ×○×グリッドの紙面レイアウトだが、クライアント指示により紙面をそのまま
// 再現するのではなく、旧GASシステムの画面構成(項目ごとに1回答、カテゴリ番号-項目番号表記)
// に合わせて構造化している。
export type InspectionQuestion = { code: string; text: string };
export type InspectionCategory = { no: string; title: string; items: InspectionQuestion[] };

export const INSPECTION_CATEGORIES: InspectionCategory[] = [
  {
    no: "1",
    title: "衛生マニュアル",
    items: [{ code: "q1", text: "衛生マニュアルの内容を従事者全員が理解しているか" }],
  },
  {
    no: "2",
    title: "POP（注意喚起等）の掲示",
    items: [
      { code: "q2", text: "巡達POPなどの掲示は出来ているか" },
    ],
  },
  {
    no: "3",
    title: "ラベル表示",
    items: [{ code: "q3", text: "ラベルの内容が商品名や原料と合っているか" }],
  },
  {
    no: "4",
    title: "手洗い",
    items: [
      { code: "q4_1", text: "手洗い器に汚れ・詰まりがないか" },
      { code: "q4_2", text: "手洗い液・アルコールが備えられているか" },
      { code: "q4_3", text: "手洗いが励行されているか" },
    ],
  },
  {
    no: "5",
    title: "ふきん・包丁・まな板・調理器具・機器",
    items: [
      { code: "q5_1", text: "使用後、洗浄消毒を行っているか" },
      { code: "q5_2", text: "衛生的に保管・管理できているか" },
      { code: "q5_3", text: "用途別(生肉・生魚・野菜・おかず用)に色分け区分できているか" },
      { code: "q5_4", text: "器具・野菜等の正しい使用法(希釈率・浸水時間)を守っているか" },
    ],
  },
  {
    no: "6",
    title: "冷蔵庫・冷凍庫・陳列ケース",
    items: [
      { code: "q6_1", text: "庫内は清潔に保たれているか" },
      { code: "q6_2", text: "上段=野菜・仕込み品、下段=肉魚の区分保管ができているか" },
      { code: "q6_3", text: "庫内温度を定期的にチェックしているか(温度管理表の有無)" },
    ],
  },
  {
    no: "7",
    title: "食品の取扱者",
    items: [
      { code: "q7_1", text: "手指に傷のある者はいないか" },
      { code: "q7_2", text: "下痢等の体調不良者はいないか" },
      { code: "q7_3", text: "個人衛生点検表によるチェックができているか" },
    ],
  },
  {
    no: "8",
    title: "営業許可証・食品衛生責任者",
    items: [
      { code: "q8_1", text: "営業許可証の有効期限内であることを確認しているか" },
      { code: "q8_2", text: "食品衛生責任者の氏名を掲示しているか" },
    ],
  },
];

export const INSPECTION_QUESTIONS: InspectionQuestion[] = INSPECTION_CATEGORIES.flatMap(
  (c) => c.items
);
