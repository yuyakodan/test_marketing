# test_marketing

Miyabi自律型開発フレームワークによるプロジェクト

## セットアップ

```bash
npm install
```

## 開発

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# テスト実行
npm test

# テスト（watchモード）
npm run test:watch

# カバレッジ付きテスト
npm run test:coverage

# Lint
npm run lint

# 型チェック
npm run typecheck
```

## Miyabi コマンド

```bash
# プロジェクト状態確認
npx miyabi status

# 自動モード起動
npx miyabi auto --max-issues 5

# テスト実行
npx miyabi test

# デプロイ
npx miyabi deploy
```

## プロジェクト構造

```
test_marketing/
├── .github/
│   ├── workflows/          # GitHub Actions
│   └── ISSUE_TEMPLATE/     # Issue テンプレート
├── .ai/
│   ├── logs/               # 実行ログ
│   ├── parallel-reports/   # 並列実行レポート
│   └── knowledge-base/     # ナレッジベース
├── .claude/
│   ├── agents/             # Agent定義
│   ├── commands/           # カスタムコマンド
│   └── mcp-servers/        # MCP Server設定
├── src/                    # ソースコード
├── tests/                  # テスト
├── dist/                   # ビルド出力
└── package.json
```

## ライセンス

MIT
