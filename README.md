# MORNING FLOW AI

MORNING FLOW AI は、朝に話すだけで頭の中を整理し、今日の行動を明確にするAIです。

## 現在のバージョン

Version 2.0

## 主な機能

- 音声入力
- 文字起こし
- 文字起こし内容の編集
- OpenAI API によるAI整理
- 今日の目的、目標、TODO、優先順位、推奨タイムスケジュール生成
- AI Morning Coach
- 昨日の振り返り
- Googleカレンダー自動連携
- Appleカレンダー用 `.ics` 出力
- LocalStorage保存
- スマホファーストUI

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

## Googleカレンダー連携

Google Cloud ConsoleでOAuthクライアントIDを作成し、`.env` の `VITE_GOOGLE_CLIENT_ID` に設定します。

ローカル確認時は、OAuthクライアントの承認済みJavaScript生成元に以下を追加してください。

```text
http://127.0.0.1:5173
```

Vercel公開後は、Vercelの本番URLも承認済みJavaScript生成元に追加してください。

アクセストークンはアプリ内の一時状態で扱い、`.env` やZIPには保存しません。

## 本番ビルド

```powershell
npm.cmd run build
```

成功すると `dist` が作成されます。

## リリース

```powershell
npm.cmd run release
```

release は以下を実行します。

1. build
2. ZIP作成
3. CHANGELOG更新
4. VERSION確認
