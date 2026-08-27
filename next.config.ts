import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // デフォルトの1MBだと、レシピ一括アップロード(平均約300KB/ファイル)が数件で
      // 上限に達してしまう(2026-08-27、40,000件規模のレシピ移行に向けた調査で判明)。
      // Vercelのプラットフォーム側の上限が4.5MB/リクエストで固定のため、それに収まる
      // 範囲で最大まで引き上げる(フォームの他フィールド分の余裕を見て4MBに設定)。
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
