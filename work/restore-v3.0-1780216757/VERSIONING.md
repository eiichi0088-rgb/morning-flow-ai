# MORNING FLOW AI Versioning Rules

1. Version 2.x 系は Version 2.6 で終了。
2. 次の更新は必ず Version 3.x とする。
3. 画面表示、`package.json`、CHANGELOG、VERSIONING、ZIP名を同じバージョンに統一する。
4. ZIP名は `morning-flow-ai-vX.Y.zip` とする。
5. 新機能追加後は必ず `npm.cmd run build` を実行する。
6. ビルド成功後に同じバージョン番号でZIP保存する。
7. ZIPには `node_modules` と `.env` を含めない。
8. ZIPには `dist` を含める。
9. 開発完了時は `CHANGELOG.md` に変更内容を記録する。
10. 可能な限り `npm.cmd run release` で `build -> zip -> changelog -> version確認` をまとめて実行する。
11. v3.x の最優先方針は「他人が使っても自分の予定や買い物リストが表示されない、安全な個人利用アプリ」。
12. Googleカレンダーは自動再接続しない。毎回アカウント選択と登録前確認を行う。
13. GitHubへcommitする場合のメッセージは対象バージョン名に合わせる。Version 3.0 は `MORNING FLOW AI v3.0`。

## Version 3.0 完了記録 - 2026-05-31

- 画面表示: v3.0
- ZIP: morning-flow-ai-v3.0.zip
- 次回予定: Version 3.1
- v3専用の個人プロファイル保存へ移行
- Googleカレンダー登録前確認と手動ログインを維持
- 買い物リスト、連絡忘れチェック、朝のAI整理を統合

## 次回予定

- Version 3.1: Googleログイン後のアプリユーザーID化、DB保存、API認証、レート制限を追加
