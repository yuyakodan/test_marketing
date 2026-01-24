import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MetaMarketingAPI } from '@/lib/meta/marketing-api'

// Vercel Cron: 毎時実行
// vercel.json で設定: { "crons": [{ "path": "/api/cron/collect-metrics", "schedule": "0 * * * *" }] }

export const runtime = 'nodejs'
export const maxDuration = 60

interface MetricsData {
  campaign_id: string
  ad_set_id?: string
  ad_id?: string
  lp_variant_id?: string
  combination_id?: string
  date: string
  impressions: number
  clicks: number
  spend: number
  reach: number
  conversions: number
  conversion_value: number
}

export async function GET(request: Request) {
  // Vercel Cron認証チェック
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // 開発環境では認証をスキップ
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const supabase = await createClient()
    const metaApi = new MetaMarketingAPI()

    // アクティブなキャンペーンを取得
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, meta_campaign_id, project_id')
      .eq('status', 'ACTIVE')

    if (campaignsError) {
      throw new Error(`Failed to fetch campaigns: ${campaignsError.message}`)
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active campaigns to collect metrics for',
        collected: 0,
      })
    }

    const collectedMetrics: MetricsData[] = []
    const today = new Date().toISOString().split('T')[0]

    for (const campaign of campaigns) {
      if (!campaign.meta_campaign_id) continue

      try {
        // Meta APIから指標取得
        const insights = await metaApi.getCampaignInsights(
          campaign.meta_campaign_id,
          today,
          today
        )

        if (insights && insights.length > 0) {
          const insight = insights[0]

          const metricsData: MetricsData = {
            campaign_id: campaign.id,
            date: today,
            impressions: parseInt(insight.impressions || '0'),
            clicks: parseInt(insight.clicks || '0'),
            spend: parseFloat(insight.spend || '0'),
            reach: parseInt(insight.reach || '0'),
            conversions: 0, // actionsから計算
            conversion_value: 0,
          }

          // アクションからCV数を計算
          if (insight.actions) {
            const purchaseAction = insight.actions.find(
              (a: { action_type: string; value: string }) =>
                a.action_type === 'purchase' ||
                a.action_type === 'lead' ||
                a.action_type === 'complete_registration'
            )
            if (purchaseAction) {
              metricsData.conversions = parseInt(purchaseAction.value || '0')
            }
          }

          // CV値を計算
          if (insight.action_values) {
            const purchaseValue = insight.action_values.find(
              (a: { action_type: string; value: string }) => a.action_type === 'purchase'
            )
            if (purchaseValue) {
              metricsData.conversion_value = parseFloat(purchaseValue.value || '0')
            }
          }

          collectedMetrics.push(metricsData)
        }

        // 広告セットレベルの指標も取得
        const adSetInsights = await metaApi.getAdSetInsights(
          campaign.meta_campaign_id,
          today,
          today
        )

        if (adSetInsights && adSetInsights.length > 0) {
          for (const adSetInsight of adSetInsights) {
            // 広告セットIDからDB上のad_setを検索
            const { data: adSet } = await supabase
              .from('ad_sets')
              .select('id')
              .eq('meta_ad_set_id', adSetInsight.adset_id)
              .single()

            if (adSet) {
              collectedMetrics.push({
                campaign_id: campaign.id,
                ad_set_id: adSet.id,
                date: today,
                impressions: parseInt(adSetInsight.impressions || '0'),
                clicks: parseInt(adSetInsight.clicks || '0'),
                spend: parseFloat(adSetInsight.spend || '0'),
                reach: parseInt(adSetInsight.reach || '0'),
                conversions: 0,
                conversion_value: 0,
              })
            }
          }
        }
      } catch (error) {
        console.error(`Failed to collect metrics for campaign ${campaign.id}:`, error)
        // 個別キャンペーンのエラーは続行
      }
    }

    // メトリクスをSupabaseに保存（upsert）
    if (collectedMetrics.length > 0) {
      const { error: insertError } = await supabase
        .from('metrics')
        .upsert(
          collectedMetrics.map((m) => ({
            ...m,
            collected_at: new Date().toISOString(),
          })),
          {
            onConflict: 'campaign_id,ad_set_id,ad_id,date',
          }
        )

      if (insertError) {
        throw new Error(`Failed to save metrics: ${insertError.message}`)
      }
    }

    // 最適化チェックを実行
    await checkOptimization(supabase, campaigns)

    return NextResponse.json({
      success: true,
      message: `Collected metrics for ${campaigns.length} campaigns`,
      collected: collectedMetrics.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Metrics collection failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// 最適化チェック: 負けパターンの自動停止
async function checkOptimization(
  supabase: Awaited<ReturnType<typeof createClient>>,
  campaigns: Array<{ id: string; meta_campaign_id: string | null; project_id: string }>
) {
  for (const campaign of campaigns) {
    // 過去7日間のメトリクスを取得
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: metrics } = await supabase
      .from('metrics')
      .select('*')
      .eq('campaign_id', campaign.id)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])

    if (!metrics || metrics.length < 7) {
      // データ不足、スキップ
      continue
    }

    // 組み合わせ別のパフォーマンスを集計
    const { data: combinations } = await supabase
      .from('ad_lp_combinations')
      .select('id, ad_id, lp_variant_id, status')
      .eq('status', 'active')

    if (!combinations) continue

    // 統計的有意性チェックと自動最適化
    // TODO: jstatを使った本格的な統計処理
    // 現在は単純なCVR比較で判定

    const combinationMetrics = new Map<
      string,
      { clicks: number; conversions: number }
    >()

    for (const metric of metrics) {
      if (metric.combination_id) {
        const existing = combinationMetrics.get(metric.combination_id) || {
          clicks: 0,
          conversions: 0,
        }
        existing.clicks += metric.clicks
        existing.conversions += metric.conversions
        combinationMetrics.set(metric.combination_id, existing)
      }
    }

    // 最低クリック数100以上の組み合わせを評価
    const eligibleCombinations = Array.from(combinationMetrics.entries())
      .filter(([, data]) => data.clicks >= 100)
      .map(([id, data]) => ({
        id,
        cvr: data.conversions / data.clicks,
        clicks: data.clicks,
        conversions: data.conversions,
      }))
      .sort((a, b) => b.cvr - a.cvr)

    if (eligibleCombinations.length < 2) continue

    // 最も成績の悪い組み合わせを停止候補に
    const worst = eligibleCombinations[eligibleCombinations.length - 1]
    const best = eligibleCombinations[0]

    // CVRが50%以上低い場合は自動停止
    if (worst.cvr < best.cvr * 0.5 && worst.clicks >= 100) {
      await supabase
        .from('ad_lp_combinations')
        .update({ status: 'paused' })
        .eq('id', worst.id)

      // 最適化ログを記録
      await supabase.from('optimization_logs').insert({
        project_id: campaign.project_id,
        action_type: 'auto_pause',
        target_type: 'combination',
        target_id: worst.id,
        reason: `CVR ${(worst.cvr * 100).toFixed(2)}% is significantly lower than best ${(best.cvr * 100).toFixed(2)}%`,
        metrics_snapshot: {
          worst_cvr: worst.cvr,
          best_cvr: best.cvr,
          worst_clicks: worst.clicks,
          worst_conversions: worst.conversions,
        },
      })
    }
  }
}

// POST: 手動実行用
export async function POST(request: Request) {
  return GET(request)
}
