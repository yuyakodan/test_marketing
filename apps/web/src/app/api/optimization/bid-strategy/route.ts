import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  optimizeBidStrategies,
  simulateStrategyChange,
  calculateBidAdjustment,
  type CampaignBidData,
  type BidStrategy,
} from '@/lib/optimization/bid-strategy'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const targetCPA = Number(searchParams.get('target_cpa')) || 5000
    const targetROAS = Number(searchParams.get('target_roas')) || 3.0

    const supabase = await createClient()

    // キャンペーンデータを取得
    let query = supabase
      .from('campaigns')
      .select(`
        id,
        name,
        status,
        daily_budget,
        bid_strategy,
        bid_amount,
        metrics (
          impressions,
          clicks,
          conversions,
          spend,
          revenue
        )
      `)
      .eq('status', 'active')

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: campaigns, error } = await query

    if (error) {
      throw error
    }

    // CampaignBidData形式に変換
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bidData: CampaignBidData[] = (campaigns || []).map((campaign: any) => {
      const metrics = campaign.metrics || []
      const totalImpressions = metrics.reduce((sum: number, m: { impressions: number }) => sum + (m.impressions || 0), 0)
      const totalClicks = metrics.reduce((sum: number, m: { clicks: number }) => sum + (m.clicks || 0), 0)
      const totalConversions = metrics.reduce((sum: number, m: { conversions: number }) => sum + (m.conversions || 0), 0)
      const totalSpend = metrics.reduce((sum: number, m: { spend: number }) => sum + (m.spend || 0), 0)
      const totalRevenue = metrics.reduce((sum: number, m: { revenue?: number }) => sum + (m.revenue || 0), 0)

      return {
        id: campaign.id,
        name: campaign.name,
        currentStrategy: (campaign.bid_strategy as BidStrategy) || 'lowest_cost',
        currentBidAmount: campaign.bid_amount || undefined,
        performance: {
          spend: totalSpend,
          impressions: totalImpressions,
          clicks: totalClicks,
          conversions: totalConversions,
          revenue: totalRevenue || undefined,
          ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
          cvr: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
          cpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
          roas: totalSpend > 0 && totalRevenue > 0 ? totalRevenue / totalSpend : undefined,
        },
        dailyBudget: campaign.daily_budget || 10000,
        deliveryStatus: 'active',
        learningPhaseInfo: totalConversions < 50 ? {
          isLearning: true,
          conversionsNeeded: 50 - totalConversions,
          currentConversions: totalConversions,
        } : undefined,
      }
    })

    // 入札戦略を最適化
    const result = optimizeBidStrategies(bidData, {
      targetCPA,
      targetROAS,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Bid strategy optimization failed:', error)
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
      case 'simulate': {
        const { campaign, newStrategy, newBidAmount } = body

        if (!campaign || !newStrategy) {
          return NextResponse.json(
            { success: false, error: 'campaign and newStrategy are required' },
            { status: 400 }
          )
        }

        const simulation = simulateStrategyChange(
          campaign as CampaignBidData,
          newStrategy as BidStrategy,
          newBidAmount
        )

        return NextResponse.json({
          success: true,
          data: simulation,
        })
      }

      case 'calculate_adjustment': {
        const { currentBid, targetCPA, actualCPA, maxChangePercent } = body

        if (currentBid === undefined || targetCPA === undefined || actualCPA === undefined) {
          return NextResponse.json(
            { success: false, error: 'currentBid, targetCPA, and actualCPA are required' },
            { status: 400 }
          )
        }

        const adjustment = calculateBidAdjustment(
          currentBid,
          targetCPA,
          actualCPA,
          maxChangePercent
        )

        return NextResponse.json({
          success: true,
          data: adjustment,
        })
      }

      case 'apply': {
        const { campaignId, strategy, bidAmount } = body

        if (!campaignId || !strategy) {
          return NextResponse.json(
            { success: false, error: 'campaignId and strategy are required' },
            { status: 400 }
          )
        }

        const supabase = await createClient()

        // キャンペーンの入札戦略を更新
        const { error: updateError } = await supabase
          .from('campaigns')
          .update({
            bid_strategy: strategy,
            bid_amount: bidAmount || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', campaignId)

        if (updateError) {
          throw updateError
        }

        // 最適化ログを記録
        await supabase.from('optimization_logs').insert({
          action_type: 'bid_strategy_change',
          target_type: 'campaign',
          target_id: campaignId,
          changes: {
            new_strategy: strategy,
            new_bid_amount: bidAmount,
          },
          reason: `入札戦略を${strategy}に変更`,
        })

        // TODO: Meta APIを通じて実際のキャンペーン設定を更新

        return NextResponse.json({
          success: true,
          message: `Campaign ${campaignId} bid strategy updated to ${strategy}`,
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Bid strategy action failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
