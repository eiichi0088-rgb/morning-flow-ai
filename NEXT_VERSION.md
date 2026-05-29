# NEXT VERSION

次回予定バージョン: Version 1.7

## 開発テーマ候補

タスク編集と並び替え

## 目的

AIが整理した計画を、ユーザーが朝の短い時間で微調整できるようにする。

## 優先候補

1. やることリストの編集
2. タスクの並び替え
3. 成功条件の編集
4. AIコーチカードの履歴活用

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
