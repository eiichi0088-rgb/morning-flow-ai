# CHANGELOG

このファイルには MORNING FLOW AI の各バージョンの変更内容を記録します。

## Version 1.0 - 2026-05-29

- 音声入力による文字起こしMVPを作成
- 大きなマイクボタン、認識中表示、文字起こし欄、やり直し、次へ進むボタンを追加
- スマホファーストの未来的UIを実装

## Version 1.2 - 2026-05-29

- ローカル解析で今日の目的、目標、TODO、優先順位、推奨スケジュール、AIアドバイスを生成
- サンプル入力ボタンを追加
- ガラスUIと未来的なカードUIを強化

## Version 1.3 - 2026-05-29

- OpenAI API による実入力のAI整理に対応
- AI処理を `src/services/aiPlanner.ts` に分離
- 仕事・健康・家族・学習の4カテゴリー分類を追加
- `.env` によるAPIキー管理を追加
- `morning-flow-ai-v1.3.zip` として保存

## Version 1.4 - 2026-05-29

- 昨日の振り返り画面を追加
- 前回保存した計画をLocalStorageから表示
- 完了・一部完了・未達成の達成チェックを追加
- 達成率とAI振り返りメッセージを追加
- 未完了タスクを今日のやることへ繰り越す機能を追加
- LocalStorage保存処理を `src/services/reflectionStorage.ts` に分離
- `morning-flow-ai-v1.4.zip` として保存

## Version 1.5 - 2026-05-29

- `PROJECT_RULES.md` を作成
- アプリ理念、開発ルール、デザインルール、バージョン管理、リリースルール、禁止事項、ロードマップを整理
- 開発者モードとして現在バージョン、次回予定バージョン、未実装機能、優先順位を記録
- release 実行時に build、ZIP作成、CHANGELOG更新、VERSION確認を自動実行
- `scripts/verify-version.ps1` を追加
- 画面表示を `v1.5` に更新
- `morning-flow-ai-v1.5.zip` として保存

## Version 1.6 - 2026-05-29

- AI Morning Coach を追加
- 朝の気分選択を追加
- 今日の最重要ミッションを生成
- 今日の3つの集中項目を表示
- AI朝のアドバイスを表示
- 今日の成功条件を生成して保存
- 気分とAIコーチ提案を保存データに含める構造へ拡張
- `NEXT_VERSION.md` を作成
- Vercel公開準備として `api/plan.mjs`、`vercel.json`、`.vercelignore`、README、公開手順を追加
- GitHub/Vercel運用ルールを `PROJECT_RULES.md` と `VERSIONING.md` に反映
- GitHub自動commit/push用の `scripts/git-release.ps1` を追加
- 画面表示を `v1.6` に更新
- `morning-flow-ai-v1.6.zip` として保存
