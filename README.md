# MORNING FLOW AI

MORNING FLOW AI v3.1 は、Version 3.0 のSecurity & Stability Patchです。新機能追加ではなく、保存分離、買い物AI API、Vercel API Routeの安定化を目的にしています。

## 現在のバージョン

Version 3.1

## 主な確認点

- 画面表示は `MORNING FLOW AI v3.1`
- draft、shopping、contact、snapshotはすべて `morning-flow-ai:v3.1:user:{userProfileId}:...` に保存
- snapshotsは `morning-flow-ai:v3.1:user:{userProfileId}:snapshots` に固定
- 旧v2共有キー、旧v3 ownerキー、固定snapshotキーは起動時に読み込まない
- `/api/shopping` はVercel Node API Route形式
- Googleカレンダーは自動再接続せず、毎回アカウント選択と登録前確認を行う

## ローカル起動

1. `.env.example` をコピーして `.env` を作成
2. `.env` に必要なキーを設定

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_SHOPPING_MODEL=gpt-4o-mini
VITE_GOOGLE_CLIENT_ID=Google OAuth Client ID
```

3. 起動

```powershell
npm.cmd run dev
```

## build

```powershell
npm.cmd run build
```

## release

```powershell
npm.cmd run release
```

生成ZIP: `morning-flow-ai-v3.1.zip`
