import { NextResponse } from 'next/server'
import { generateBannerConcepts, generateABTestVariations, type BannerConcept } from '@/lib/gemini/banner-generator'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'generate_concepts': {
        const {
          productName,
          productDescription,
          targetAudience,
          uniqueSellingPoints,
          campaignGoal,
          previousPerformance,
          count,
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

        const concepts = await generateBannerConcepts({
          productName,
          productDescription,
          targetAudience,
          uniqueSellingPoints: uniqueSellingPoints || [],
          campaignGoal: campaignGoal || 'conversion',
          previousPerformance,
          count,
        })

        return NextResponse.json({
          success: true,
          data: concepts,
        })
      }

      case 'generate_variations': {
        const { originalConcept, testElement, count } = body

        if (!originalConcept || !testElement) {
          return NextResponse.json(
            {
              success: false,
              error: 'originalConcept and testElement are required',
            },
            { status: 400 }
          )
        }

        const variations = await generateABTestVariations(
          originalConcept as BannerConcept,
          testElement,
          count || 3
        )

        return NextResponse.json({
          success: true,
          data: variations,
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Banner generation failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
