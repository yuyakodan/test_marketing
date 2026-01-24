import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: 広告×LP組み合わせ一覧取得
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const campaignId = searchParams.get('campaign_id')

    let query = supabase
      .from('ad_lp_combinations')
      .select(`
        *,
        ads (
          id,
          name,
          creatives (
            id,
            name,
            image_url,
            headline
          )
        ),
        lp_variants (
          id,
          code,
          name,
          landing_pages (
            id,
            name,
            slug
          )
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

    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    // メトリクスを集計してパフォーマンス計算
    const combinationsWithPerformance = data?.map((combo) => {
      const metrics = combo.metrics || []
      const aggregated = metrics.reduce(
        (acc: { impressions: number; clicks: number; conversions: number; spend: number }, m: { impressions: number; clicks: number; conversions: number; spend: number }) => ({
          impressions: acc.impressions + (m.impressions || 0),
          clicks: acc.clicks + (m.clicks || 0),
          conversions: acc.conversions + (m.conversions || 0),
          spend: acc.spend + (m.spend || 0),
        }),
        { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
      )

      const ctr = aggregated.impressions > 0
        ? (aggregated.clicks / aggregated.impressions) * 100
        : 0
      const cvr = aggregated.clicks > 0
        ? (aggregated.conversions / aggregated.clicks) * 100
        : 0
      const cpa = aggregated.conversions > 0
        ? aggregated.spend / aggregated.conversions
        : 0

      return {
        ...combo,
        metrics: undefined,
        performance: {
          ...aggregated,
          ctr,
          cvr,
          cpa,
        },
      }
    })

    return NextResponse.json({
      success: true,
      data: combinationsWithPerformance,
    })
  } catch (error) {
    console.error('Failed to fetch combinations:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// POST: 組み合わせを自動生成
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { project_id, campaign_id, ad_ids, lp_variant_ids } = body

    if (!project_id || !ad_ids?.length || !lp_variant_ids?.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'project_id, ad_ids, and lp_variant_ids are required',
        },
        { status: 400 }
      )
    }

    // マトリクス生成: すべての広告×LPバリアントの組み合わせ
    const combinations = []
    for (const adId of ad_ids) {
      for (const lpVariantId of lp_variant_ids) {
        combinations.push({
          project_id,
          campaign_id,
          ad_id: adId,
          lp_variant_id: lpVariantId,
          status: 'active',
          weight: Math.floor(100 / (ad_ids.length * lp_variant_ids.length)),
        })
      }
    }

    // 既存の組み合わせを確認して重複を避ける
    const { data: existing } = await supabase
      .from('ad_lp_combinations')
      .select('ad_id, lp_variant_id')
      .eq('project_id', project_id)

    const existingSet = new Set(
      existing?.map((e) => `${e.ad_id}-${e.lp_variant_id}`) || []
    )

    const newCombinations = combinations.filter(
      (c) => !existingSet.has(`${c.ad_id}-${c.lp_variant_id}`)
    )

    if (newCombinations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All combinations already exist',
        created: 0,
      })
    }

    const { data, error } = await supabase
      .from('ad_lp_combinations')
      .insert(newCombinations)
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data,
      created: data?.length || 0,
    })
  } catch (error) {
    console.error('Failed to create combinations:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
