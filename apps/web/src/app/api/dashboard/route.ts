import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const days = parseInt(searchParams.get('days') || '7')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]

    // メトリクス集計
    let metricsQuery = supabase
      .from('metrics')
      .select('impressions, clicks, conversions, spend, date')
      .gte('date', startDateStr)
      .order('date', { ascending: true })

    if (projectId) {
      metricsQuery = metricsQuery.eq('project_id', projectId)
    }

    const { data: metrics, error: metricsError } = await metricsQuery

    if (metricsError) {
      throw metricsError
    }

    // 日別データに集計
    const dailyData = new Map<string, {
      impressions: number
      clicks: number
      conversions: number
      spend: number
    }>()

    for (const m of metrics || []) {
      const existing = dailyData.get(m.date) || {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
      }
      dailyData.set(m.date, {
        impressions: existing.impressions + (m.impressions || 0),
        clicks: existing.clicks + (m.clicks || 0),
        conversions: existing.conversions + (m.conversions || 0),
        spend: existing.spend + (m.spend || 0),
      })
    }

    // 総計算出
    const totals = {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: 0,
    }

    for (const data of dailyData.values()) {
      totals.impressions += data.impressions
      totals.clicks += data.clicks
      totals.conversions += data.conversions
      totals.spend += data.spend
    }

    const ctr = totals.impressions > 0
      ? (totals.clicks / totals.impressions) * 100
      : 0
    const cvr = totals.clicks > 0
      ? (totals.conversions / totals.clicks) * 100
      : 0
    const cpa = totals.conversions > 0
      ? totals.spend / totals.conversions
      : 0

    // アクティブキャンペーン数
    let campaignsQuery = supabase
      .from('campaigns')
      .select('id', { count: 'exact' })
      .eq('status', 'ACTIVE')

    if (projectId) {
      campaignsQuery = campaignsQuery.eq('project_id', projectId)
    }

    const { count: activeCampaigns } = await campaignsQuery

    // テスト中の組み合わせ数
    let combinationsQuery = supabase
      .from('ad_lp_combinations')
      .select('id', { count: 'exact' })
      .eq('status', 'active')

    if (projectId) {
      combinationsQuery = combinationsQuery.eq('project_id', projectId)
    }

    const { count: activeCombinations } = await combinationsQuery

    // 最近の最適化ログ
    let logsQuery = supabase
      .from('optimization_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (projectId) {
      logsQuery = logsQuery.eq('project_id', projectId)
    }

    const { data: recentLogs } = await logsQuery

    // 日別データを配列に変換
    const dailyArray = Array.from(dailyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        ...data,
        ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
        cvr: data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0,
      }))

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          impressions: totals.impressions,
          clicks: totals.clicks,
          conversions: totals.conversions,
          spend: totals.spend,
          ctr,
          cvr,
          cpa,
          activeCampaigns: activeCampaigns || 0,
          activeCombinations: activeCombinations || 0,
        },
        daily: dailyArray,
        recentLogs: recentLogs || [],
      },
    })
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
