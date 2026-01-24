import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createMetaClient } from '@/lib/meta/marketing-api'

// GET: キャンペーン詳細取得
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        ad_sets (
          *,
          ads (*)
        ),
        metrics (*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Failed to fetch campaign:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// PATCH: キャンペーン更新
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    const { name, objective, daily_budget, status, sync_to_meta } = body

    // ローカルDB更新
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (objective !== undefined) updateData.objective = objective
    if (daily_budget !== undefined) updateData.daily_budget = daily_budget
    if (status !== undefined) updateData.status = status

    const { data, error } = await supabase
      .from('campaigns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Meta APIに同期
    if (sync_to_meta && data.meta_campaign_id) {
      try {
        const metaClient = createMetaClient()
        if (status === 'ACTIVE' || status === 'PAUSED') {
          await metaClient.updateCampaignStatus(data.meta_campaign_id, status)
        }
      } catch (metaError) {
        console.error('Failed to sync to Meta:', metaError)
        // Meta同期エラーは警告として記録するが、ローカル更新は成功とする
      }
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Failed to update campaign:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// DELETE: キャンペーン削除
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // 関連するad_sets, adsも削除（CASCADE設定があれば不要）
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted successfully',
    })
  } catch (error) {
    console.error('Failed to delete campaign:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
