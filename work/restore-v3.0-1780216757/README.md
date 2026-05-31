# MORNING FLOW AI

MORNING FLOW AI v3.0 は、朝に話すだけで予定、買い物、連絡忘れを整理する個人利用向けAIアプリです。

## 現在のバージョン

Version 3.0

## 主な機能

- 音声入力とテキスト入力
- OpenAI API による朝のAI整理
- 今日やること、目的、優先順位、推奨タイムスケジュール生成
- 買い物リストのAIカテゴリ分け、数量・単位保持、編集、削除、共有文作成
- 電話、LINE、メール、SNS返信の連絡忘れチェック
- Googleカレンダー登録前確認
- Appleカレンダー用 `.ics` 出力
- v3専用の個人プロファイルlocalStorage保存

## 安全方針

- v2.x の共有localStorageキーは読み込みません。
- v3.0 の保存キーは `morning-flow-ai:v3:owner:{ownerId}:...` に分離されています。
- Googleカレンダーは自動再接続しません。
- Googleログイン時は毎回アカウント選択を要求します。
- Googleカレンダーへ直接登録する前に確認画面を表示します。

## ローカル起動

1. `.env.example` をコピーして `.env` を作成
2. `.env` に必要なキーを設定

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.4-mini
VITE_GOOGLE_CLIENT_ID=Google OAuth Client ID
```

3. 起動

```powershell
npm.cmd run dev
```

4. ブラウザで開く

```text
http://127.0.0.1:5173/
```

## 本番ビルド

```powershell
npm.cmd run build
```

## リリース

```powershell
npm.cmd run release
```
