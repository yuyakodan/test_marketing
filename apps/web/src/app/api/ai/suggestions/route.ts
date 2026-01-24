import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateJSON } from '@/lib/gemini/client'

export interface AISuggestion {
  id: string
  type: 'banner' | 'lp' | 'targeting' | 'budget' | 'test'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  expectedImpact: string
  implementation: string[]
  dataSupport: string
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    const supabase = await createClient()

    // パフォーマンスデータを収集
    const data = await collectPerformanceData(supabase, projectId || undefined)

    // AIで提案を生成
    const suggestions = await generateSuggestions(data)

    return NextResponse.json({
      success: true,
      data: suggestions,
    })
  } catch (error) {
    console.error('Suggestions generation failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

async function collectPerformanceData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId?: string
) {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const dateStr = sevenDaysAgo.toISOString().split('T')[0]

  // メトリクス取得
  let metricsQuery = supabase
    .from('metrics')
    .select('impressions, clicks, conversions, spend')
    .gte('date', dateStr)

  if (projectId) {
    metricsQuery = metricsQuery.eq('project_id', projectId)
  }

  const { data: metrics } = await metricsQuery

  const totals = (metrics || []).reduce(
    (acc, m) => ({
      impressions: acc.impressions + (m.impressions || 0),
      clicks: acc.clicks + (m.clicks || 0),
      conversions: acc.conversions + (m.conversions || 0),
      spend: acc.spend + (m.spend || 0),
    }),
    { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
  )

  // 組み合わせパフォーマンス
  let combosQuery = supabase
    .from('ad_lp_combinations')
    .select(`
      id,
      status,
      ads ( name, creatives ( headline ) ),
      lp_variants ( name, code )
    `)

  if (projectId) {
    combosQuery = combosQuery.eq('project_id', projectId)
  }

  const { data: combinations } = await combosQuery

  // A/Bテスト状況
  let testsQuery = supabase
    .from('lp_variants')
    .select('id, code, name, status, weight')

  const { data: variants } = await testsQuery

  return {
    metrics: {
      ...totals,
      ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
      cvr: totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0,
      cpa: totals.conversions > 0 ? totals.spend / totals.conversions : 0,
    },
    combinations: combinations || [],
    variants: variants || [],
    activeCombinations: (combinations || []).filter((c: { status: string }) => c.status === 'active').length,
    activeTests: (variants || []).filter((v: { status: string }) => v.status === 'active').length,
  }
}

async function generateSuggestions(data: {
  metrics: {
    impressions: number
    clicks: number
    conversions: number
    spend: number
    ctr: number
    cvr: number
    cpa: number
  }
  combinations: unknown[]
  variants: unknown[]
  activeCombinations: number
  activeTests: number
}): Promise<AISuggestion[]> {
  const prompt = `
あなたはデジタルマーケティングの最適化コンサルタントです。
以下のパフォーマンスデータを分析し、具体的な改善提案を生成してください。

## 現在のパフォーマンス（過去7日間）
- インプレッション: ${data.metrics.impressions.toLocaleString()}
- クリック数: ${data.metrics.clicks.toLocaleString()}
- コンバージョン: ${data.metrics.conversions}
- 広告費: ¥${data.metrics.spend.toLocaleString()}
- CTR: ${data.metrics.ctr.toFixed(2)}%
- CVR: ${data.metrics.cvr.toFixed(2)}%
- CPA: ¥${data.metrics.cpa.toLocaleString()}

## 現在の状況
- アクティブな広告×LP組み合わせ: ${data.activeCombinations}
- 実行中のA/Bテスト: ${data.activeTests}

## 業界平均（参考）
- CTR: 2.5%
- CVR: 2.0%
- CPA: ¥8,000

## 提案の要件
1. データに基づいた具体的な提案
2. 実装可能なアクションを含める
3. 期待される効果を明示
4. 優先度を設定

## 出力形式（JSON配列）
[
  {
    "id": "suggestion_1",
    "type": "banner",
    "priority": "high",
    "title": "提案タイトル",
    "description": "詳細な説明",
    "expectedImpact": "CVRを15%改善、CPAを¥1,000削減など",
    "implementation": ["ステップ1", "ステップ2"],
    "dataSupport": "この提案を裏付けるデータ"
  }
]

5〜8個の提案を生成してください。
`

  const suggestions = await generateJSON<AISuggestion[]>({
    prompt,
    temperature: 0.6,
  })

  return suggestions
}

// POST: 特定の提案を実装するヘルパー
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { suggestion_id, action } = body

    // TODO: 提案を自動実装する機能
    // 例: バナー生成APIを呼び出す、LP バリアントを作成するなど

    return NextResponse.json({
      success: true,
      message: `Suggestion ${suggestion_id} action ${action} queued`,
    })
  } catch (error) {
    console.error('Suggestion implementation failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
