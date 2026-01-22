# AGENTS.md - サブエージェント向け指示

## 共有コンテキスト

このプロジェクトは Miyabi 自律型開発フレームワークを使用しています。

### プロジェクト情報

- **リポジトリ**: yuyakodan/test_marketing
- **言語**: TypeScript
- **テスト**: Vitest

### Agent間の連携ルール

1. **Issue → CodeGen**: Issueの要件を明確に伝達
2. **CodeGen → Review**: コード変更の意図を説明
3. **Review → PR**: レビュー結果をPR説明に反映
4. **Test → All**: テスト結果を全Agentに共有

### ラベル規約

優先度: `priority:P0-Critical`, `priority:P1-High`, `priority:P2-Medium`, `priority:P3-Low`
状態: `state:pending`, `state:analyzing`, `state:implementing`, `state:reviewing`, `state:done`
Agent: `agent:coordinator`, `agent:codegen`, `agent:review`, `agent:issue`, `agent:pr`, `agent:deployment`, `agent:test`

### 品質基準

- テストカバレッジ: 80%以上
- TypeScript: strict mode
- Lint: エラー0件

### コミュニケーション

- 問題発生時は即座に `state:blocked` ラベルを付与
- 完了時は `state:done` に更新
- 品質スコアを `quality:*` ラベルで記録
