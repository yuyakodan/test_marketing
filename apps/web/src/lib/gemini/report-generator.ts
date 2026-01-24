import { generateJSON, generateText } from './client'

export interface WeeklyReportData {
  period: {
    start: string
    end: string
  }
  summary: {
    totalSpend: number
    totalImpressions: number
    totalClicks: number
    totalConversions: number
    avgCTR: number
    avgCVR: number
    avgCPA: number
  }
  weekOverWeek: {
    spendChange: number
    impressionsChange: number
    clicksChange: number
    conversionsChange: number
    ctrChange: number
    cvrChange: number
    cpaChange: number
  }
  topPerformers: Array<{
    name: string
    type: 'ad' | 'lp' | 'combination'
    cvr: number
    cpa: number
    conversions: number
  }>
  underperformers: Array<{
    name: string
    type: 'ad' | 'lp' | 'combination'
    cvr: number
    cpa: number
    issue: string
  }>
  abTestResults: Array<{
    testName: string
    winner: string | null
    confidence: number
    improvement: number
    status: 'significant' | 'testing' | 'inconclusive'
  }>
  optimizationActions: Array<{
    action: string
    target: string
    reason: string
    timestamp: string
  }>
}

export interface GeneratedReport {
  title: string
  executiveSummary: string
  sections: Array<{
    title: string
    content: string
    highlights: string[]
  }>
  keyInsights: string[]
  recommendations: string[]
  nextWeekPriorities: string[]
  risks: string[]
}

/**
 * 週次レポートを自動生成
 */
export async function generateWeeklyReport(
  data: WeeklyReportData
): Promise<GeneratedReport> {
  const prompt = `
あなたはデジタルマーケティングのレポート作成専門家です。
以下のデータを元に、経営層・マーケティングチーム向けの週次レポートを作成してください。

## 期間
${data.period.start} 〜 ${data.period.end}

## サマリー
- 広告費: ¥${data.summary.totalSpend.toLocaleString()}（前週比 ${data.weekOverWeek.spendChange > 0 ? '+' : ''}${data.weekOverWeek.spendChange.toFixed(1)}%）
- インプレッション: ${data.summary.totalImpressions.toLocaleString()}（前週比 ${data.weekOverWeek.impressionsChange > 0 ? '+' : ''}${data.weekOverWeek.impressionsChange.toFixed(1)}%）
- クリック数: ${data.summary.totalClicks.toLocaleString()}（前週比 ${data.weekOverWeek.clicksChange > 0 ? '+' : ''}${data.weekOverWeek.clicksChange.toFixed(1)}%）
- コンバージョン: ${data.summary.totalConversions}（前週比 ${data.weekOverWeek.conversionsChange > 0 ? '+' : ''}${data.weekOverWeek.conversionsChange.toFixed(1)}%）
- CTR: ${data.summary.avgCTR.toFixed(2)}%（前週比 ${data.weekOverWeek.ctrChange > 0 ? '+' : ''}${data.weekOverWeek.ctrChange.toFixed(2)}pt）
- CVR: ${data.summary.avgCVR.toFixed(2)}%（前週比 ${data.weekOverWeek.cvrChange > 0 ? '+' : ''}${data.weekOverWeek.cvrChange.toFixed(2)}pt）
- CPA: ¥${data.summary.avgCPA.toLocaleString()}（前週比 ${data.weekOverWeek.cpaChange > 0 ? '+' : ''}${data.weekOverWeek.cpaChange.toFixed(1)}%）

## トップパフォーマー
${data.topPerformers.map((p, i) => `${i + 1}. ${p.name}（${p.type}）- CVR: ${p.cvr.toFixed(2)}%, CPA: ¥${p.cpa.toLocaleString()}, CV: ${p.conversions}`).join('\n')}

## 要改善項目
${data.underperformers.map((p, i) => `${i + 1}. ${p.name}（${p.type}）- ${p.issue}`).join('\n')}

## A/Bテスト結果
${data.abTestResults.map((t, i) => `${i + 1}. ${t.testName}: ${t.status === 'significant' ? `勝者=${t.winner}（信頼度${t.confidence.toFixed(1)}%、改善${t.improvement.toFixed(1)}%）` : t.status === 'testing' ? 'テスト継続中' : '有意差なし'}`).join('\n')}

## 今週の最適化アクション
${data.optimizationActions.map((a, i) => `${i + 1}. ${a.action}（${a.target}）- ${a.reason}`).join('\n')}

## 出力形式（JSON）
{
  "title": "週次マーケティングレポート: ${data.period.start}〜${data.period.end}",
  "executiveSummary": "エグゼクティブサマリー（3-4文で全体像を要約）",
  "sections": [
    {
      "title": "パフォーマンスハイライト",
      "content": "詳細な説明",
      "highlights": ["ハイライト1", "ハイライト2"]
    },
    {
      "title": "A/Bテスト進捗",
      "content": "詳細な説明",
      "highlights": ["ハイライト1", "ハイライト2"]
    },
    {
      "title": "最適化アクション",
      "content": "詳細な説明",
      "highlights": ["ハイライト1", "ハイライト2"]
    }
  ],
  "keyInsights": ["重要なインサイト1", "インサイト2", "インサイト3"],
  "recommendations": ["推奨アクション1", "アクション2", "アクション3"],
  "nextWeekPriorities": ["来週の優先事項1", "優先事項2"],
  "risks": ["注意すべきリスク1", "リスク2"]
}
`

  return generateJSON<GeneratedReport>({
    prompt,
    temperature: 0.5,
  })
}

/**
 * レポートをマークダウン形式に変換
 */
export function reportToMarkdown(report: GeneratedReport): string {
  let md = `# ${report.title}\n\n`
  md += `## エグゼクティブサマリー\n${report.executiveSummary}\n\n`

  for (const section of report.sections) {
    md += `## ${section.title}\n${section.content}\n\n`
    if (section.highlights.length > 0) {
      md += `### ハイライト\n`
      md += section.highlights.map((h) => `- ${h}`).join('\n')
      md += '\n\n'
    }
  }

  md += `## 重要なインサイト\n`
  md += report.keyInsights.map((i) => `- ${i}`).join('\n')
  md += '\n\n'

  md += `## 推奨アクション\n`
  md += report.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')
  md += '\n\n'

  md += `## 来週の優先事項\n`
  md += report.nextWeekPriorities.map((p, i) => `${i + 1}. ${p}`).join('\n')
  md += '\n\n'

  if (report.risks.length > 0) {
    md += `## 注意事項・リスク\n`
    md += report.risks.map((r) => `⚠️ ${r}`).join('\n')
    md += '\n'
  }

  return md
}

/**
 * カスタムレポートを生成（指定したトピックにフォーカス）
 */
export async function generateCustomReport(
  data: WeeklyReportData,
  focus: 'creative_performance' | 'lp_optimization' | 'budget_efficiency' | 'audience_analysis'
): Promise<string> {
  const focusDescriptions: Record<string, string> = {
    creative_performance: 'クリエイティブ（バナー）のパフォーマンス詳細分析',
    lp_optimization: 'ランディングページの最適化状況と改善機会',
    budget_efficiency: '予算効率と投資対効果の分析',
    audience_analysis: 'ターゲットオーディエンスの反応分析',
  }

  const prompt = `
以下のデータを元に、「${focusDescriptions[focus]}」にフォーカスしたレポートを作成してください。

## データ
${JSON.stringify(data, null, 2)}

## 要件
- ${focusDescriptions[focus]}に特化した深い分析
- 具体的な数値と比較を含める
- 実行可能なアクションアイテムを提案
- マークダウン形式で出力

詳細なレポートを日本語で作成してください。
`

  return generateText({
    prompt,
    temperature: 0.5,
  })
}

/**
 * Slack通知用のサマリーを生成
 */
export async function generateSlackSummary(
  data: WeeklyReportData
): Promise<{
  headline: string
  keyMetrics: string
  topWin: string
  topConcern: string
  actionNeeded: string
}> {
  const prompt = `
週次マーケティングデータからSlack通知用の簡潔なサマリーを作成してください。

## データ
- 期間: ${data.period.start}〜${data.period.end}
- CV: ${data.summary.totalConversions}（${data.weekOverWeek.conversionsChange > 0 ? '+' : ''}${data.weekOverWeek.conversionsChange.toFixed(1)}%）
- CPA: ¥${data.summary.avgCPA.toLocaleString()}（${data.weekOverWeek.cpaChange > 0 ? '+' : ''}${data.weekOverWeek.cpaChange.toFixed(1)}%）
- トップ: ${data.topPerformers[0]?.name || 'N/A'}
- 要注意: ${data.underperformers[0]?.name || 'N/A'}

## 出力形式（JSON）
{
  "headline": "絵文字付きの一行サマリー",
  "keyMetrics": "主要指標を1-2行で",
  "topWin": "今週の成功ポイント",
  "topConcern": "注意が必要な点",
  "actionNeeded": "必要なアクション（あれば）"
}
`

  return generateJSON({
    prompt,
    temperature: 0.7,
  })
}
