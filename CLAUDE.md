# CLAUDE.md - test_marketing

## プロジェクト概要

Miyabi自律型開発フレームワークによるプロジェクト

## 技術スタック

- **言語**: TypeScript 5.x
- **ランタイム**: Node.js 20+
- **テスト**: Vitest
- **Lint**: ESLint
- **フォーマッター**: Prettier

## 開発ルール

### コーディング規約

- 関数は小さく、単一責任
- 型は厳密に（`strict: true`）
- テストを先に書く（TDD）

### コミットメッセージ

```
<type>(<scope>): <subject>

types: feat, fix, docs, style, refactor, test, chore
```

### テスト

- 新機能には必ずテストを追加
- カバレッジ80%以上を維持
- `npm test` で全テストがパスすること

## Miyabi Agent設定

このプロジェクトは以下のAgentを使用:

- **CoordinatorAgent**: タスク統括
- **CodeGenAgent**: コード生成
- **ReviewAgent**: コードレビュー
- **TestAgent**: テスト実行
- **IssueAgent**: Issue管理
- **PRAgent**: PR作成
- **DeploymentAgent**: デプロイ

## 重要な注意事項

- `.env` ファイルは絶対にコミットしない
- `ANTHROPIC_API_KEY` は環境変数で管理
