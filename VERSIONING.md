# MORNING FLOW AI Versioning Rules

1. 画面表示のバージョン番号とZIP保存のバージョン番号を一致させる。
2. ZIP名は `morning-flow-ai-vX.Y.zip` とする。
3. 新機能追加後は必ず `npm.cmd run build` を実行する。
4. ビルド成功後に同じバージョン番号でZIP保存する。
5. ZIPには `node_modules` と `.env` を含めない。
6. ZIPには `dist` を含める。
7. 開発完了時は `CHANGELOG.md` に変更内容を記録する。
8. 可能な限り `npm.cmd run release` で `build → zip → changelog → version確認` をまとめて実行する。
9. 開発前に `CHANGELOG.md` とこの `VERSIONING.md` を確認する。
10. 問題発生時は直前の安定版ZIPへ戻せる状態を維持する。
11. スマホファースト、音声入力最優先、Apple × Tesla × Notion の世界観を維持する。
12. Version 1.6以降の開発前は `PROJECT_RULES.md`、`VERSIONING.md`、`CHANGELOG.md` の順に確認する。
13. `NEXT_VERSION.md` がある場合は、開発前に必ず確認し、完了時に次回予定へ更新する。
14. Version 1.7以降は、release成功後にGitHubへcommit/pushし、Vercel自動デプロイを確認する。
15. build失敗、release失敗、VERSION確認失敗の状態ではpushしない。
16. ZIPはローカル安定版バックアップとして保存し、GitHubへ含めない。
17. GitHub認証が未完了の場合は、GitHub Desktopでサインインしてpushを1回完了してから自動pushへ移行する。

## Version 2.4 完了記録 - 2026-05-30

- 画面表示: v2.4
- ZIP: morning-flow-ai-v2.4.zip
- 次回予定: Version 2.5
- release は build、ZIP作成、CHANGELOG確認、VERSION確認を通過した状態で完了扱いにする