import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: キャンペーン一覧取得
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('campaigns')
      .select(`
        *,
        ad_sets (
          id,
          name,
          status,
          daily_budget
        ),
        metrics (
          impressions,
          clicks,
          conversions,
          spend,
          date
        )
      `)
      .order('created_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    // メトリクスを集計
    const campaignsWithAggregatedMetrics = data?.map((campaign) => {
      const metrics = campaign.metrics || []
      const aggregated = metrics.reduce(
        (acc: { impressions: number; clicks: number; conversions: number; spend: number }, m: { impressions: number; clicks: number; conversions: number; spend: number }) => ({
          impressions: acc.impressions + (m.impressions || 0),
          clicks: acc.clicks + (m.clicks || 0),
          conversions: acc.conversions + (m.conversions || 0),
          spend: acc.spend + (m.spend || 0),
        }),
        { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
      )

      return {
        ...campaign,
        metrics: undefined,
        aggregatedMetrics: {
          ...aggregated,
          ctr: aggregated.impressions > 0
            ? (aggregated.clicks / aggregated.impressions) * 100
            : 0,
          cvr: aggregated.clicks > 0
            ? (aggregated.conversions / aggregated.clicks) * 100
            : 0,
          cpa: aggregated.conversions > 0
            ? aggregated.spend / aggregated.conversions
            : 0,
        },
      }
    })

    return NextResponse.json({
      success: true,
      data: campaignsWithAggregatedMetrics,
    })
  } catch (error) {
    console.error('Failed to fetch campaigns:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// POST: キャンペーン作成
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { name, project_id, objective, daily_budget, status } = body

    if (!name || !project_id) {
      return NextResponse.json(
        { success: false, error: 'Name and project_id are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        name,
        project_id,
        objective: objective || 'OUTCOME_LEADS',
        daily_budget: daily_budget || 0,
        status: status || 'DRAFT',
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Failed to create campaign:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
