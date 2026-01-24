import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createMetaClient, type CampaignCreateParams, type AdSetCreateParams, type AdCreativeParams, type AdCreateParams } from '@/lib/meta/marketing-api'

// POST: Meta APIにキャンペーンを同期
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { action, campaign_id, ad_set_id, creative_id, ad_id } = body

    const metaClient = createMetaClient()

    switch (action) {
      case 'create_campaign': {
        // DBからキャンペーン情報を取得
        const { data: campaign, error } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', campaign_id)
          .single()

        if (error || !campaign) {
          return NextResponse.json(
            { success: false, error: 'Campaign not found' },
            { status: 404 }
          )
        }

        // Meta APIでキャンペーン作成
        const params: CampaignCreateParams = {
          name: campaign.name,
          objective: campaign.objective as CampaignCreateParams['objective'],
          status: 'PAUSED',
          dailyBudget: campaign.daily_budget,
        }

        const result = await metaClient.createCampaign(params)

        // meta_campaign_idを更新
        await supabase
          .from('campaigns')
          .update({ meta_campaign_id: result.id })
          .eq('id', campaign_id)

        return NextResponse.json({
          success: true,
          meta_campaign_id: result.id,
        })
      }

      case 'create_ad_set': {
        // DBから広告セット情報を取得
        const { data: adSet, error } = await supabase
          .from('ad_sets')
          .select('*, campaigns(*)')
          .eq('id', ad_set_id)
          .single()

        if (error || !adSet) {
          return NextResponse.json(
            { success: false, error: 'Ad set not found' },
            { status: 404 }
          )
        }

        if (!adSet.campaigns?.meta_campaign_id) {
          return NextResponse.json(
            { success: false, error: 'Campaign not synced to Meta yet' },
            { status: 400 }
          )
        }

        const params: AdSetCreateParams = {
          campaignId: adSet.campaigns.meta_campaign_id,
          name: adSet.name,
          targeting: adSet.targeting || {
            geoLocations: { countries: ['JP'] },
            ageMin: 18,
            ageMax: 65,
          },
          optimizationGoal: 'CONVERSIONS',
          billingEvent: 'IMPRESSIONS',
          bidStrategy: 'LOWEST_COST_WITHOUT_CAP',
          dailyBudget: adSet.daily_budget,
          pixelId: process.env.META_PIXEL_ID || '',
          conversionEvent: 'LEAD',
        }

        const result = await metaClient.createAdSet(params)

        // meta_ad_set_idを更新
        await supabase
          .from('ad_sets')
          .update({ meta_ad_set_id: result.id })
          .eq('id', ad_set_id)

        return NextResponse.json({
          success: true,
          meta_ad_set_id: result.id,
        })
      }

      case 'create_creative': {
        // DBからクリエイティブ情報を取得
        const { data: creative, error } = await supabase
          .from('creatives')
          .select('*')
          .eq('id', creative_id)
          .single()

        if (error || !creative) {
          return NextResponse.json(
            { success: false, error: 'Creative not found' },
            { status: 404 }
          )
        }

        const params: AdCreativeParams = {
          name: creative.name,
          imageUrl: creative.image_url,
          headline: creative.headline,
          description: creative.description,
          linkUrl: creative.link_url || 'https://example.com',
          callToAction: creative.cta_type || 'LEARN_MORE',
          pageId: process.env.META_PAGE_ID || '',
        }

        const result = await metaClient.createAdCreative(params)

        // meta_creative_idを更新
        await supabase
          .from('creatives')
          .update({ meta_creative_id: result.id })
          .eq('id', creative_id)

        return NextResponse.json({
          success: true,
          meta_creative_id: result.id,
        })
      }

      case 'create_ad': {
        // DBから広告情報を取得
        const { data: ad, error } = await supabase
          .from('ads')
          .select('*, ad_sets(*), creatives(*)')
          .eq('id', ad_id)
          .single()

        if (error || !ad) {
          return NextResponse.json(
            { success: false, error: 'Ad not found' },
            { status: 404 }
          )
        }

        if (!ad.ad_sets?.meta_ad_set_id) {
          return NextResponse.json(
            { success: false, error: 'Ad set not synced to Meta yet' },
            { status: 400 }
          )
        }

        if (!ad.creatives?.meta_creative_id) {
          return NextResponse.json(
            { success: false, error: 'Creative not synced to Meta yet' },
            { status: 400 }
          )
        }

        const params: AdCreateParams = {
          adSetId: ad.ad_sets.meta_ad_set_id,
          creativeId: ad.creatives.meta_creative_id,
          name: ad.name,
          trackingSpecs: process.env.META_PIXEL_ID
            ? [
                {
                  action_type: ['offsite_conversion'],
                  fb_pixel: [process.env.META_PIXEL_ID],
                },
              ]
            : undefined,
        }

        const result = await metaClient.createAd(params)

        // meta_ad_idを更新
        await supabase
          .from('ads')
          .update({ meta_ad_id: result.id })
          .eq('id', ad_id)

        return NextResponse.json({
          success: true,
          meta_ad_id: result.id,
        })
      }

      case 'activate_campaign': {
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('meta_campaign_id')
          .eq('id', campaign_id)
          .single()

        if (!campaign?.meta_campaign_id) {
          return NextResponse.json(
            { success: false, error: 'Campaign not synced to Meta' },
            { status: 400 }
          )
        }

        await metaClient.updateCampaignStatus(campaign.meta_campaign_id, 'ACTIVE')

        await supabase
          .from('campaigns')
          .update({ status: 'ACTIVE' })
          .eq('id', campaign_id)

        return NextResponse.json({ success: true })
      }

      case 'pause_campaign': {
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('meta_campaign_id')
          .eq('id', campaign_id)
          .single()

        if (!campaign?.meta_campaign_id) {
          return NextResponse.json(
            { success: false, error: 'Campaign not synced to Meta' },
            { status: 400 }
          )
        }

        await metaClient.updateCampaignStatus(campaign.meta_campaign_id, 'PAUSED')

        await supabase
          .from('campaigns')
          .update({ status: 'PAUSED' })
          .eq('id', campaign_id)

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Meta sync failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
