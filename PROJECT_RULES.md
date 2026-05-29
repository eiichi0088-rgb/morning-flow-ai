# MORNING FLOW AI Project Rules

## アプリ理念

MORNING FLOW AI は単なるTODOアプリではない。

「朝、話すだけで頭の中を整理し、今日の行動を明確にするAI」である。

ユーザーは予定を管理したいのではなく、頭の中を整理したい。機能を増やすことより、朝の短い時間で行動が明確になる価値を優先する。

## 開発ルール

1. 現在の安定版を壊さない。
2. 開発前に `PROJECT_RULES.md`、`VERSIONING.md`、`CHANGELOG.md` を読む。
3. 新機能追加後は必ず `npm.cmd run build` を実行する。
4. 完了後は必ず `npm.cmd run release` を実行する。
5. build成功後のみ完了扱いにする。
6. 問題発生時は直前ZIPへ戻せる状態を維持する。
7. 操作数を増やさず、音声入力を最優先に保つ。
8. ユーザー価値を上げる改善を優先する。
9. Version 1.7以降は、可能な限りCodexが `build → release → ZIP作成 → git commit → git push` まで実行する。
10. GitHubは正式なソース管理場所、Vercelは公開環境として扱う。
11. GitHubへpushが成功した場合、Vercelの同じURLが自動更新される前提で進める。
12. GitHub認証が必要な場合は、先にGitHub Desktopでサインインとpushを1回完了させる。

## デザインルール

1. スマホファーストを維持する。
2. Appleの高級感、Teslaの未来感、Notionの整理感を意識する。
3. ガラスUI、柔らかい光、余白、静かな集中感を大切にする。
4. 朝に開きたくなる落ち着いた空気感を維持する。
5. 男女どちらでも違和感なく使えるミニマルな表現にする。
6. ボタンは大きく、片手操作しやすく、迷わないUIにする。

## バージョン管理ルール

1. 画面表示のバージョン番号とZIP保存のバージョン番号を一致させる。
2. ZIP名は `morning-flow-ai-vX.Y.zip` に統一する。
3. `package.json` の `version` と画面表示を一致させる。
4. ZIPには `node_modules` と `.env` を含めない。
5. ZIPには `dist` を含める。
6. 各バージョンの変更内容を `CHANGELOG.md` に記録する。

## リリースルール

開発完了時は以下を実行する。

```powershell
npm.cmd run build
npm.cmd run release
git add .
git commit -m "Update MORNING FLOW AI to vX.X"
git push origin main
```

`npm.cmd run release` は以下を自動実行する。

1. build
2. ZIP作成
3. CHANGELOG更新
4. VERSION確認

GitHubへpushする前に、必ずbuildとreleaseが成功していることを確認する。

GitHub認証後は、必要に応じて以下でcommit/pushを実行する。

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\git-release.ps1
```

## 禁止事項

1. `.env` やAPIキーをZIPやコードへ含めない。
2. `node_modules` をZIPへ含めない。
3. 直前の安定版ZIPを削除しない。
4. 音声入力を弱くする変更をしない。
5. スマホで使いにくいUIを追加しない。
6. ユーザーの朝の操作数をむやみに増やさない。
7. build失敗状態でpushしない。
8. ZIPファイルをGitHubへ含めない。

## 開発者モード

Developer Mode Marker

現在バージョン: Version 2.0

次回予定バージョン: Version 2.1

未実装機能:

- 振り返り内容のAI API連携強化
- 計画履歴一覧
- 通知・リマインド
- クラウド保存
- AIコーチ提案の履歴分析

優先順位:

1. 朝の入力から整理までの体験を短くする
2. 振り返りから今日への繰り越し精度を上げる
3. 保存データ構造をクラウド移行しやすく保つ
4. UIの静けさと高級感を維持する

## 今後のロードマップ

- Version 2.1: 通知・リマインド
- Version 2.2: クラウド保存と複数端末同期

## ソース管理と公開

- GitHubを正式なソース管理場所とする。
- Vercelを公開環境とする。
- `main` ブランチへpush後、Vercelが自動デプロイする。
- 公開URLは継続利用し、バージョンごとにURLを変更しない。
- `.env`、`node_modules`、`.npm-cache`、ZIPファイルはGitHubへ含めない。
