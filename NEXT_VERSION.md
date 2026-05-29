# NEXT VERSION

次回予定バージョン: Version 2.1

## 開発テーマ候補

通知・リマインド

## 目的

朝に整理した重要タスクを、忘れず実行へつなげる。

## 優先候補

1. ブラウザ通知の検討
2. 重要タスクのリマインド表示
3. 今日の成功条件の再表示
4. 通知を増やしすぎないUX設計

## 開発前に読むファイル

1. `PROJECT_RULES.md`
2. `VERSIONING.md`
3. `CHANGELOG.md`
4. `NEXT_VERSION.md`

## Version 1.7以降の完了フロー

1. `npm.cmd run build`
2. `npm.cmd run release`
3. `git add .`
4. `git commit -m "Update MORNING FLOW AI to vX.X"`
5. `git push origin main`
6. Vercel自動デプロイ確認

Codexから自動commit/pushする場合:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\git-release.ps1
```
