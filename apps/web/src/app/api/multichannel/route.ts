import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  aggregateUnifiedMetrics,
  analyzeChannelPerformance,
  optimizeChannelAllocation,
  generateTimeSeriesData,
  type ChannelMetrics,
  type AdChannel,
} from '@/lib/multichannel/unified-metrics'
import { googleAdsClient, initializeGoogleAdsFromEnv } from '@/lib/google-ads/client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const action = searchParams.get('action') || 'unified'
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // デフォルトで過去7日間
    const end = endDate || new Date().toISOString().split('T')[0]
    const start = startDate || (() => {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      return d.toISOString().split('T')[0]
    })()

    const supabase = await createClient()

    // Supabaseからチャネルメトリクスを取得
    let query = supabase
      .from('channel_metrics')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: dbMetrics, error } = await query

    if (error) {
      console.warn('channel_metrics table may not exist:', error.message)
    }

    // DBからのデータをChannelMetrics形式に変換
    const channelMetrics: ChannelMetrics[] = (dbMetrics || []).map((m) => ({
      channel: m.channel as AdChannel,
      campaignId: m.campaign_id,
      campaignName: m.campaign_name || '',
      date: m.date,
      impressions: m.impressions || 0,
      clicks: m.clicks || 0,
      conversions: m.conversions || 0,
      spend: m.spend || 0,
      revenue: m.revenue || undefined,
      ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
      cvr: m.clicks > 0 ? (m.conversions / m.clicks) * 100 : 0,
      cpa: m.conversions > 0 ? m.spend / m.conversions : 0,
      roas: m.spend > 0 && m.revenue ? m.revenue / m.spend : undefined,
    }))

    // Google Adsからも取得を試みる
    try {
      initializeGoogleAdsFromEnv()
      if (googleAdsClient.isConfigured()) {
        const googleMetrics = await googleAdsClient.getCampaignMetrics(start, end)

        for (const gm of googleMetrics) {
          channelMetrics.push({
            channel: 'google_ads',
            campaignId: gm.campaignId,
            campaignName: '', // 別途取得が必要
            date: gm.date,
            impressions: gm.impressions,
            clicks: gm.clicks,
            conversions: gm.conversions,
            spend: gm.cost,
            revenue: gm.conversionsValue || undefined,
            ctr: gm.ctr * 100,
            cvr: gm.conversionRate * 100,
            cpa: gm.costPerConversion,
            roas: gm.cost > 0 && gm.conversionsValue > 0 ? gm.conversionsValue / gm.cost : undefined,
          })
        }
      }
    } catch (googleError) {
      console.warn('Google Ads data fetch failed:', googleError)
    }

    switch (action) {
      case 'unified': {
        const unified = aggregateUnifiedMetrics(channelMetrics)
        return NextResponse.json({
          success: true,
          data: unified,
        })
      }

      case 'performance': {
        // 前期間のデータも取得
        const prevStart = (() => {
          const d = new Date(start)
          const diff = Math.ceil((new Date(end).getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
          d.setDate(d.getDate() - diff)
          return d.toISOString().split('T')[0]
        })()

        let prevQuery = supabase
          .from('channel_metrics')
          .select('*')
          .gte('date', prevStart)
          .lt('date', start)

        if (projectId) {
          prevQuery = prevQuery.eq('project_id', projectId)
        }

        const { data: prevDbMetrics } = await prevQuery

        const prevMetrics: ChannelMetrics[] = (prevDbMetrics || []).map((m) => ({
          channel: m.channel as AdChannel,
          campaignId: m.campaign_id,
          campaignName: m.campaign_name || '',
          date: m.date,
          impressions: m.impressions || 0,
          clicks: m.clicks || 0,
          conversions: m.conversions || 0,
          spend: m.spend || 0,
          revenue: m.revenue || undefined,
          ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
          cvr: m.clicks > 0 ? (m.conversions / m.clicks) * 100 : 0,
          cpa: m.conversions > 0 ? m.spend / m.conversions : 0,
          roas: m.spend > 0 && m.revenue ? m.revenue / m.spend : undefined,
        }))

        const performance = analyzeChannelPerformance(channelMetrics, prevMetrics)
        return NextResponse.json({
          success: true,
          data: performance,
        })
      }

      case 'timeseries': {
        const groupBy = (searchParams.get('group_by') as 'day' | 'week' | 'month') || 'day'
        const timeseries = generateTimeSeriesData(channelMetrics, groupBy)
        return NextResponse.json({
          success: true,
          data: timeseries,
        })
      }

      case 'allocation': {
        const totalBudget = Number(searchParams.get('total_budget')) || 1000000
        const targetCPA = Number(searchParams.get('target_cpa')) || 5000

        // 前期間のデータも取得してパフォーマンス分析
        const prevStart = (() => {
          const d = new Date(start)
          const diff = Math.ceil((new Date(end).getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
          d.setDate(d.getDate() - diff)
          return d.toISOString().split('T')[0]
        })()

        let prevQuery = supabase
          .from('channel_metrics')
          .select('*')
          .gte('date', prevStart)
          .lt('date', start)

        if (projectId) {
          prevQuery = prevQuery.eq('project_id', projectId)
        }

        const { data: prevDbMetrics } = await prevQuery

        const prevMetrics: ChannelMetrics[] = (prevDbMetrics || []).map((m) => ({
          channel: m.channel as AdChannel,
          campaignId: m.campaign_id,
          campaignName: m.campaign_name || '',
          date: m.date,
          impressions: m.impressions || 0,
          clicks: m.clicks || 0,
          conversions: m.conversions || 0,
          spend: m.spend || 0,
          revenue: m.revenue || undefined,
          ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
          cvr: m.clicks > 0 ? (m.conversions / m.clicks) * 100 : 0,
          cpa: m.conversions > 0 ? m.spend / m.conversions : 0,
          roas: m.spend > 0 && m.revenue ? m.revenue / m.spend : undefined,
        }))

        const performance = analyzeChannelPerformance(channelMetrics, prevMetrics)
        const allocation = optimizeChannelAllocation(performance, totalBudget, {
          minBudgetPerChannel: 50000,
          maxBudgetPerChannel: 500000,
          targetCPA,
        })

        return NextResponse.json({
          success: true,
          data: {
            performance,
            allocation,
            totalBudget,
          },
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Multichannel API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'sync_google_ads': {
        initializeGoogleAdsFromEnv()

        if (!googleAdsClient.isConfigured()) {
          return NextResponse.json(
            { success: false, error: 'Google Ads not configured' },
            { status: 400 }
          )
        }

        const { startDate, endDate, projectId } = body

        const campaigns = await googleAdsClient.getCampaigns()
        const metrics = await googleAdsClient.getCampaignMetrics(startDate, endDate)

        const supabase = await createClient()

        // メトリクスをDBに保存
        const records = metrics.map((m) => {
          const campaign = campaigns.find((c) => c.id === m.campaignId)
          return {
            project_id: projectId,
            channel: 'google_ads' as AdChannel,
            campaign_id: m.campaignId,
            campaign_name: campaign?.name || '',
            date: m.date,
            impressions: m.impressions,
            clicks: m.clicks,
            conversions: m.conversions,
            spend: m.cost,
            revenue: m.conversionsValue || null,
          }
        })

        // Upsert（既存データがあれば更新）
        const { error } = await supabase
          .from('channel_metrics')
          .upsert(records, {
            onConflict: 'project_id,channel,campaign_id,date',
          })

        if (error) {
          throw error
        }

        return NextResponse.json({
          success: true,
          message: `Synced ${records.length} Google Ads metrics records`,
          data: {
            campaignsCount: campaigns.length,
            metricsCount: metrics.length,
          },
        })
      }

      case 'upload_conversion': {
        initializeGoogleAdsFromEnv()

        if (!googleAdsClient.isConfigured()) {
          return NextResponse.json(
            { success: false, error: 'Google Ads not configured' },
            { status: 400 }
          )
        }

        const { conversionActionId, gclid, conversionDateTime, conversionValue } = body

        if (!conversionActionId || !gclid || !conversionDateTime) {
          return NextResponse.json(
            { success: false, error: 'conversionActionId, gclid, and conversionDateTime are required' },
            { status: 400 }
          )
        }

        await googleAdsClient.uploadOfflineConversion(
          conversionActionId,
          gclid,
          conversionDateTime,
          conversionValue
        )

        return NextResponse.json({
          success: true,
          message: 'Conversion uploaded successfully',
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Multichannel POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
