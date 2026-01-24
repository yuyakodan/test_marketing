import { NextResponse } from 'next/server'
import {
  generateLPContent,
  generateLPVariant,
  analyzeLPPerformance,
  checkMessageConsistency,
  type LPStructure,
} from '@/lib/gemini/lp-generator'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'generate': {
        const {
          productName,
          productDescription,
          targetAudience,
          uniqueSellingPoints,
          conversionGoal,
          tone,
          adHeadline,
        } = body

        if (!productName || !productDescription || !targetAudience) {
          return NextResponse.json(
            {
              success: false,
              error: 'productName, productDescription, and targetAudience are required',
            },
            { status: 400 }
          )
        }

        const lpContent = await generateLPContent({
          productName,
          productDescription,
          targetAudience,
          uniqueSellingPoints: uniqueSellingPoints || [],
          conversionGoal: conversionGoal || 'form_submit',
          tone: tone || 'professional',
          adHeadline,
        })

        return NextResponse.json({
          success: true,
          data: lpContent,
        })
      }

      case 'generate_variant': {
        const { originalLP, testElement, hypothesis } = body

        if (!originalLP || !testElement) {
          return NextResponse.json(
            {
              success: false,
              error: 'originalLP and testElement are required',
            },
            { status: 400 }
          )
        }

        const variant = await generateLPVariant({
          originalLP: originalLP as LPStructure,
          testElement,
          hypothesis,
        })

        return NextResponse.json({
          success: true,
          data: variant,
        })
      }

      case 'analyze': {
        const { lpStructure, performance, heatmapInsights } = body

        if (!lpStructure || !performance) {
          return NextResponse.json(
            {
              success: false,
              error: 'lpStructure and performance are required',
            },
            { status: 400 }
          )
        }

        const analysis = await analyzeLPPerformance({
          lpStructure: lpStructure as LPStructure,
          performance,
          heatmapInsights,
        })

        return NextResponse.json({
          success: true,
          data: analysis,
        })
      }

      case 'check_consistency': {
        const { adContent, lpContent } = body

        if (!adContent || !lpContent) {
          return NextResponse.json(
            {
              success: false,
              error: 'adContent and lpContent are required',
            },
            { status: 400 }
          )
        }

        const consistency = await checkMessageConsistency(
          adContent,
          lpContent as LPStructure
        )

        return NextResponse.json({
          success: true,
          data: consistency,
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('LP generation failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
