# MORNING FLOW AI

MORNING FLOW AI は、朝に話すだけで頭の中を整理し、今日の行動を明確にするAIです。

## 現在のバージョン

Version 1.6

## 主な機能

- 音声入力
- 文字起こし
- OpenAI API によるAI整理
- 今日の目的、目標、TODO、優先順位、推奨スケジュール
- AI Morning Coach
- 昨日の振り返り
- LocalStorage保存
- スマホファーストUI

## ローカル起動

1. `.env.example` をコピーして `.env` を作成
2. `.env` にOpenAI APIキーを設定

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.4-mini
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

成功すると `dist` が作成されます。

## Vercel公開

このプロジェクトはVercel公開に対応しています。

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- API: `/api/plan`
- Config: `vercel.json`

環境変数 `OPENAI_API_KEY` はVercel側に設定してください。`.env` はアップロードやZIP保存に含めません。

詳しい公開手順は [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) を確認してください。

## リリース

```powershell
npm.cmd run release
```

release は以下を実行します。

1. build
2. ZIP作成
3. CHANGELOG更新
4. VERSION確認
