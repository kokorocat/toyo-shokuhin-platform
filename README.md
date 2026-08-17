# toyo-shokuhin-platform

東洋食品グループ(東洋食品/昭和食品/大阪惣菜)業務システムリプレイス。GAS製の複数システムをNext.js + Supabaseで再構築する。

## 対象システム

1. 広域ポータル(共通認証・入口)
2. HACCP管理システム
3. 販促物受発注システム
4. レシピ閲覧システム
5. 店舗・従業員マスター(共通DB)
6. 人事労務管理システム

仕様の詳細は各システムの本番移行実装仕様書、および全体構成書を参照。

## スタック

- Next.js (App Router) / TypeScript / Tailwind CSS
- Supabase (PostgreSQL / Auth / RLS / Storage)
- Vercel

## セットアップ

```bash
npm install
cp .env.local.example .env.local  # 実際のキーは別途共有
npm run dev
```

## Supabase

- プロジェクト: `toyo-shokuhin-platform` (ap-northeast-1)
- マイグレーション: `supabase/migrations/` に時系列で管理。Supabase側への適用と同じ内容をここにも保持し、本番反映の履歴をGitで追跡する
- 直接本番DBへ手動変更を加えない。変更は必ずマイグレーションファイルを追加する形で行う

### 現状(共通マスター基盤のみ)

- companies / blocks / areas / stores / employees / employee_assignments
- user_profiles / roles / system_applications / user_access_scopes / audit_logs
- 会社単位のデータ分離をRLS(`private.user_company_ids()` 等のヘルパー関数)で実装済み(SELECTのみ)
- 各システム固有のテーブル(商品・レシピ・回答記録・人事機微情報等)は未着手。実装順序は全体構成書の5章を参照

### 未実装(次のフェーズ)

- INSERT/UPDATE/DELETE のRLSポリシー、および業務ロジックを伴うサーバー側API
- Supabase Authのログインフロー・セッション管理
- 各業務システムのテーブル・画面
