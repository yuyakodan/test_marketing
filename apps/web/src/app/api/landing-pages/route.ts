import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: ランディングページ一覧取得
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('landing_pages')
      .select(`
        *,
        lp_variants (
          id,
          code,
          name,
          weight,
          status
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

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Failed to fetch landing pages:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// POST: ランディングページ作成
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      name,
      project_id,
      slug,
      conversion_type,
      content,
      create_default_variants,
    } = body

    if (!name || !project_id || !slug) {
      return NextResponse.json(
        { success: false, error: 'Name, project_id, and slug are required' },
        { status: 400 }
      )
    }

    // LP作成
    const { data: lp, error: lpError } = await supabase
      .from('landing_pages')
      .insert({
        name,
        project_id,
        slug,
        conversion_type: conversion_type || 'form_submit',
        content: content || {},
        status: 'draft',
      })
      .select()
      .single()

    if (lpError) {
      throw lpError
    }

    // デフォルトバリアント作成（A/B）
    if (create_default_variants !== false) {
      const variants = [
        { code: 'A', name: 'オリジナル', weight: 50 },
        { code: 'B', name: 'バリアントB', weight: 50 },
      ]

      const { error: variantError } = await supabase
        .from('lp_variants')
        .insert(
          variants.map((v) => ({
            landing_page_id: lp.id,
            code: v.code,
            name: v.name,
            weight: v.weight,
            content: content || {},
            status: 'active',
          }))
        )

      if (variantError) {
        console.error('Failed to create variants:', variantError)
      }
    }

    return NextResponse.json({
      success: true,
      data: lp,
    })
  } catch (error) {
    console.error('Failed to create landing page:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
