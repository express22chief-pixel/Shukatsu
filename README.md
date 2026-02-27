# 就活トラッカー

就活生向けの選考状況管理アプリです。本選考・インターンの進捗管理、カレンダー、OB/OG訪問記録、AIサポートが使えます。

## 機能

- 📋 企業の選考状況・進捗管理（本選考 / インターン）
- 📅 カレンダービューで面接日程を可視化
- 👥 OB/OG訪問の記録管理
- ✨ AIによるES添削・面接対策・就活相談
- ⚠️ 締め切りアラート
- ⬇️ CSVエクスポート

## セキュリティ設計

APIキーは `/api/chat`（Vercel Edge Function）でサーバーサイド管理しています。
クライアント（ブラウザ）にはAPIキーが一切公開されません。

## セットアップ

### 1. リポジトリをクローン

```bash
git clone https://github.com/あなたのユーザー名/shukatsu-tracker.git
cd shukatsu-tracker
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local` を編集：
```
ANTHROPIC_API_KEY=your_api_key_here
```

APIキーは https://console.anthropic.com で取得できます。

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:5173 を開きます。

> **Note:** ローカルでAIサポートをテストするには `vercel dev` コマンドが必要です（Edge Functionを動かすため）。
> `npm install -g vercel` でインストール後、`vercel dev` で起動してください。

## Vercelへのデプロイ

1. GitHubにプッシュ
2. [vercel.com](https://vercel.com) でリポジトリをインポート
3. **Settings > Environment Variables** で設定：
   - `ANTHROPIC_API_KEY` = あなたのAPIキー（`VITE_`プレフィックス不要）
4. デプロイ完了 🎉

## 技術スタック

- React 18 + Vite
- Vercel Edge Functions（APIプロキシ）
- Anthropic Claude API
