import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: クリエイティブ一覧取得
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('creatives')
      .select('*')
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

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Failed to fetch creatives:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// POST: クリエイティブ作成
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      name,
      project_id,
      type,
      image_url,
      headline,
      description,
      cta_type,
      link_url,
    } = body

    if (!name || !project_id) {
      return NextResponse.json(
        { success: false, error: 'Name and project_id are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('creatives')
      .insert({
        name,
        project_id,
        type: type || 'image',
        image_url,
        headline,
        description,
        cta_type: cta_type || 'LEARN_MORE',
        link_url,
        status: 'draft',
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
    console.error('Failed to create creative:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
