/** 本日の日付(Asia/Tokyo基準、YYYY-MM-DD)。業務日はAsia/Tokyoを基準とする(仕様書「表示・対象日判定は日本時間」)。 */
export function todayInTokyo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
