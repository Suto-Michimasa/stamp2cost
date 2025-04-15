# Stamp2Cost

SlackのリアクションをトリガーにGoogle Spreadsheetに出社記録を自動で記入するGoogle Apps Scriptアプリケーションです。

## 機能概要

- Slackの特定チャンネルで特定のスタンプ（`:syussya:`）が押されたときに、出社記録としてスプレッドシートに記録
- リアクションを付けたユーザー、リアクションが付けられたメッセージの情報を取得
- スプレッドシートに日時とユーザー情報を保存

## 技術スタック

- TypeScript
- Google Apps Script
- Slack API
- esbuild (バンドルツール)
- clasp (Google Apps Scriptのコマンドラインツール)

## 前提条件

- Node.js (v14以上)
- pnpm
- Google アカウント
- Slack ワークスペースの管理者権限またはアプリ作成権限

## 環境構築

1. リポジトリをクローン

```bash
git clone [リポジトリURL]
cd stamp2cost
```

2. 依存パッケージをインストール

```bash
pnpm install
```

3. Google Apps Scriptにログイン

```bash
pnpm dlx @google/clasp login
```

4. Google Apps Scriptプロジェクトを作成

```bash
pnpm dlx @google/clasp create --type standalone
```

この操作で、`.clasp.json`ファイルが自動的に作成されます。このファイルには、スクリプトIDが含まれています。


```json
{
  "scriptId": "対象としたいファイルのスクリプトID",
  "rootDir": "dist"
}
```

## 環境変数の設定

1. `setScriptProperties` 関数を使って設定する方法（開発時のみ）

スクリプトをデプロイした後、一度だけ `setScriptProperties` 関数を実行して必要な環境変数を設定します。

2. Google Apps Scriptエディタで手動設定（推奨）

- `clasp open` でスクリプトエディタを開く
- 「⚙️ > プロジェクトの設定 > スクリプトのプロパティ」から以下の項目を設定
  - `TARGET_CHANNEL_ID`: 監視するSlackチャンネルID
  - `SPREADSHEET_ID`: 記録するGoogleスプレッドシートのID
  - `SLACK_TOKEN`: SlackのAPIトークン（xoxp-から始まるもの）

## 開発方法

1. TypeScriptファイルを編集（`src/main.ts`）

2. ビルド

```bash
pnpm run build
```

3. Google Apps Scriptにプッシュ

```bash
pnpm run push
```

4. スクリプトエディタを開く

```bash
pnpm run open
```

## デプロイ

デプロイはビルド、プッシュ、公開を一度に行えます：

```bash
pnpm run deploy
```

### デプロイIDを使用した固定URL展開

デプロイIDを指定すると、固定のURLでデプロイできます。これにより、常に同じエンドポイントURLが維持されます。

1. 初回デプロイを行い、デプロイIDを取得

```bash
clasp deploy
```

出力されるデプロイIDをメモしておきます（例: `AKfycbzIxlRk5m_4Exx...`）

2. 以降のデプロイでは、このIDを指定

```bash
clasp deploy -i YOUR_DEPLOYMENT_ID
```

## Slack APIの設定

1. [Slack API](https://api.slack.com/apps) でアプリを作成
2. 「Event Subscriptions」を有効化
3. Request URLにデプロイしたGoogle Apps ScriptのWebアプリケーションURLを設定
4. 以下のイベントを購読：
   - `reaction_added`
5. Bot User OAuth Tokenを取得し、環境変数 `SLACK_TOKEN` に設定


## 注意事項

- 本番環境では常にスクリプトプロパティを使用してください。
- スクリプトID（`.clasp.json`に含まれる）やデプロイIDをコードに含めたり、公開リポジトリにコミットしたりしないでください。 
