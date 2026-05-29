# Vercel Deploy Guide

MORNING FLOW AI をVercelへ公開し、iPhoneから確認するための手順です。

## 1. 事前確認

本番ビルドが成功することを確認します。

```powershell
npm.cmd run build
```

## 2. GitHubへアップロード

Vercelで公開するには、通常はGitHubリポジトリへこのプロジェクトをアップロードします。

アップロードしないもの:

- `.env`
- `node_modules`
- `.npm-cache`

アップロードするもの:

- `src`
- `api`
- `scripts`
- `dist` はVercel側で再生成されるため必須ではありません
- `package.json`
- `package-lock.json`
- `vercel.json`
- `README.md`

## 3. VercelでImport

1. [Vercel](https://vercel.com/) にログイン
2. `Add New...` → `Project`
3. GitHubリポジトリを選択
4. Framework Preset が `Vite` になっていることを確認
5. Build Command を確認

```text
npm run build
```

6. Output Directory を確認

```text
dist
```

## 4. 環境変数を設定

Vercelの Project Settings → Environment Variables で以下を追加します。

```text
OPENAI_API_KEY
```

値には OpenAI API キーを入れます。

任意でモデルも設定できます。

```text
OPENAI_MODEL=gpt-5.4-mini
```

設定対象は、まず以下すべてに入れてください。

- Production
- Preview
- Development

## 5. Deploy

`Deploy` を押します。

成功すると、以下のようなURLが発行されます。

```text
https://your-project-name.vercel.app
```

## 6. iPhoneで確認

1. iPhoneのSafariまたはChromeでVercelのURLを開く
2. マイクの許可を求められたら許可
3. 音声入力を試す
4. AI整理を押す

## 7. 注意点

- iPhoneで音声入力を使うには、ブラウザのマイク許可が必要です。
- OpenAI APIを使うため、Vercel側の `OPENAI_API_KEY` が必須です。
- `.env` はローカル専用です。VercelにはEnvironment Variablesで設定します。
- APIキーを `VITE_` で始まる名前にしないでください。ブラウザ側へ公開される可能性があります。
- Vercelへアップロードしないファイルは `.vercelignore` にまとめています。

## 8. 参考

- VercelのVite対応では、ViteプロジェクトをFramework Presetとして扱えます。
- Vercel Functionsは、プロジェクト直下の `api` ディレクトリ内の関数をデプロイできます。
