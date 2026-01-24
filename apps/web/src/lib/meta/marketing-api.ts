const GRAPH_API_VERSION = "v22.0"
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

export interface MetaApiConfig {
  accessToken: string
  adAccountId: string
  pixelId?: string
  pageId?: string
}

export interface CampaignCreateParams {
  name: string
  objective: "OUTCOME_SALES" | "OUTCOME_LEADS" | "OUTCOME_TRAFFIC"
  status?: "ACTIVE" | "PAUSED"
  dailyBudget?: number
  lifetimeBudget?: number
  specialAdCategories?: string[]
}

export interface AdSetCreateParams {
  campaignId: string
  name: string
  targeting: {
    geoLocations?: { countries: string[] }
    ageMin?: number
    ageMax?: number
    genders?: number[]
    interests?: Array<{ id: string; name: string }>
  }
  optimizationGoal: "CONVERSIONS" | "LINK_CLICKS" | "LEAD_GENERATION"
  billingEvent: "IMPRESSIONS" | "LINK_CLICKS"
  bidStrategy: "LOWEST_COST_WITHOUT_CAP" | "COST_CAP" | "BID_CAP"
  bidAmount?: number
  dailyBudget?: number
  startTime?: Date
  endTime?: Date
  pixelId: string
  conversionEvent: string
}

export interface AdCreativeParams {
  name: string
  imageUrl: string
  headline: string
  description: string
  linkUrl: string
  callToAction: "LEARN_MORE" | "SHOP_NOW" | "SIGN_UP" | "CONTACT_US"
  pageId: string
}

export interface AdCreateParams {
  adSetId: string
  creativeId: string
  name: string
  trackingSpecs?: Array<{
    action_type: string[]
    fb_pixel: string[]
  }>
}

export interface InsightsParams {
  datePreset?: "today" | "yesterday" | "last_7d" | "last_30d"
  timeRange?: { since: string; until: string }
  fields?: string[]
  level?: "campaign" | "adset" | "ad"
}

export class MetaMarketingClient {
  private config: MetaApiConfig

  constructor(config: MetaApiConfig) {
    this.config = config
  }

  private get adAccountId() {
    return `act_${this.config.adAccountId}`
  }

  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "DELETE" = "GET",
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = new URL(`${GRAPH_API_BASE}${endpoint}`)
    url.searchParams.set("access_token", this.config.accessToken)

    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    }

    if (body && method === "POST") {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url.toString(), options)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        `Meta API Error: ${data.error?.message || "Unknown error"}`
      )
    }

    return data
  }

  // Campaign Operations
  async createCampaign(params: CampaignCreateParams): Promise<{ id: string }> {
    return this.request(`/${this.adAccountId}/campaigns`, "POST", {
      name: params.name,
      objective: params.objective,
      status: params.status || "PAUSED",
      special_ad_categories: params.specialAdCategories || [],
      ...(params.dailyBudget && {
        daily_budget: Math.round(params.dailyBudget * 100),
      }),
      ...(params.lifetimeBudget && {
        lifetime_budget: Math.round(params.lifetimeBudget * 100),
      }),
    })
  }

  async getCampaigns(): Promise<{
    data: Array<{
      id: string
      name: string
      status: string
      objective: string
    }>
  }> {
    return this.request(
      `/${this.adAccountId}/campaigns?fields=id,name,status,objective`
    )
  }

  async updateCampaignStatus(
    campaignId: string,
    status: "ACTIVE" | "PAUSED"
  ): Promise<{ success: boolean }> {
    return this.request(`/${campaignId}`, "POST", { status })
  }

  // Ad Set Operations
  async createAdSet(params: AdSetCreateParams): Promise<{ id: string }> {
    return this.request(`/${this.adAccountId}/adsets`, "POST", {
      name: params.name,
      campaign_id: params.campaignId,
      status: "PAUSED",
      targeting: {
        geo_locations: params.targeting.geoLocations,
        age_min: params.targeting.ageMin || 18,
        age_max: params.targeting.ageMax || 65,
        genders: params.targeting.genders,
        interests: params.targeting.interests,
      },
      optimization_goal: params.optimizationGoal,
      billing_event: params.billingEvent,
      bid_strategy: params.bidStrategy,
      ...(params.bidAmount && { bid_amount: params.bidAmount }),
      ...(params.dailyBudget && {
        daily_budget: Math.round(params.dailyBudget * 100),
      }),
      start_time: params.startTime?.toISOString(),
      end_time: params.endTime?.toISOString(),
      promoted_object: {
        pixel_id: params.pixelId,
        custom_event_type: params.conversionEvent,
      },
    })
  }

  async getAdSets(campaignId: string): Promise<{
    data: Array<{
      id: string
      name: string
      status: string
      daily_budget: string
    }>
  }> {
    return this.request(
      `/${campaignId}/adsets?fields=id,name,status,daily_budget`
    )
  }

  // Ad Creative Operations
  async createAdCreative(params: AdCreativeParams): Promise<{ id: string }> {
    return this.request(`/${this.adAccountId}/adcreatives`, "POST", {
      name: params.name,
      object_story_spec: {
        page_id: params.pageId,
        link_data: {
          image_url: params.imageUrl,
          link: params.linkUrl,
          message: params.description,
          name: params.headline,
          call_to_action: {
            type: params.callToAction,
            value: { link: params.linkUrl },
          },
        },
      },
    })
  }

  // Ad Operations
  async createAd(params: AdCreateParams): Promise<{ id: string }> {
    return this.request(`/${this.adAccountId}/ads`, "POST", {
      name: params.name,
      adset_id: params.adSetId,
      creative: { creative_id: params.creativeId },
      status: "PAUSED",
      tracking_specs: params.trackingSpecs,
    })
  }

  async updateAdStatus(
    adId: string,
    status: "ACTIVE" | "PAUSED"
  ): Promise<{ success: boolean }> {
    return this.request(`/${adId}`, "POST", { status })
  }

  // Insights Operations
  async getInsights(
    objectId: string,
    params: InsightsParams = {}
  ): Promise<{
    data: Array<{
      impressions: string
      reach: string
      clicks: string
      spend: string
      ctr: string
      cpc: string
      actions?: Array<{ action_type: string; value: string }>
      action_values?: Array<{ action_type: string; value: string }>
    }>
  }> {
    const fields =
      params.fields?.join(",") ||
      "impressions,reach,clicks,spend,actions,action_values,ctr,cpc"

    let endpoint = `/${objectId}/insights?fields=${fields}`

    if (params.datePreset) {
      endpoint += `&date_preset=${params.datePreset}`
    }

    if (params.timeRange) {
      endpoint += `&time_range=${JSON.stringify(params.timeRange)}`
    }

    if (params.level) {
      endpoint += `&level=${params.level}`
    }

    return this.request(endpoint)
  }

  // Validation
  async validateAccessToken(): Promise<{
    data: {
      app_id: string
      type: string
      application: string
      expires_at: number
      is_valid: boolean
      scopes: string[]
    }
  }> {
    return this.request(
      `/debug_token?input_token=${this.config.accessToken}`
    )
  }
}

// Helper function to create client from environment variables
export function createMetaClient(): MetaMarketingClient {
  const accessToken = process.env.META_ACCESS_TOKEN
  const adAccountId = process.env.META_AD_ACCOUNT_ID

  if (!accessToken || !adAccountId) {
    throw new Error("Meta API credentials not configured")
  }

  return new MetaMarketingClient({
    accessToken,
    adAccountId,
    pixelId: process.env.META_PIXEL_ID,
    pageId: process.env.META_PAGE_ID,
  })
}

// Convenience wrapper class for common operations
export class MetaMarketingAPI {
  private client: MetaMarketingClient | null = null

  private getClient(): MetaMarketingClient {
    if (!this.client) {
      this.client = createMetaClient()
    }
    return this.client
  }

  async getCampaignInsights(
    campaignId: string,
    since: string,
    until: string
  ): Promise<
    Array<{
      impressions: string
      reach: string
      clicks: string
      spend: string
      ctr: string
      cpc: string
      actions?: Array<{ action_type: string; value: string }>
      action_values?: Array<{ action_type: string; value: string }>
    }>
  > {
    const result = await this.getClient().getInsights(campaignId, {
      timeRange: { since, until },
    })
    return result.data
  }

  async getAdSetInsights(
    campaignId: string,
    since: string,
    until: string
  ): Promise<
    Array<{
      adset_id: string
      impressions: string
      reach: string
      clicks: string
      spend: string
    }>
  > {
    const result = await this.getClient().getInsights(campaignId, {
      timeRange: { since, until },
      level: 'adset',
      fields: ['adset_id', 'impressions', 'reach', 'clicks', 'spend'],
    })
    return result.data as unknown as Array<{
      adset_id: string
      impressions: string
      reach: string
      clicks: string
      spend: string
    }>
  }

  async getAdInsights(
    campaignId: string,
    since: string,
    until: string
  ): Promise<
    Array<{
      ad_id: string
      impressions: string
      reach: string
      clicks: string
      spend: string
      actions?: Array<{ action_type: string; value: string }>
    }>
  > {
    const result = await this.getClient().getInsights(campaignId, {
      timeRange: { since, until },
      level: 'ad',
      fields: ['ad_id', 'impressions', 'reach', 'clicks', 'spend', 'actions'],
    })
    return result.data as unknown as Array<{
      ad_id: string
      impressions: string
      reach: string
      clicks: string
      spend: string
      actions?: Array<{ action_type: string; value: string }>
    }>
  }

  async pauseAd(adId: string): Promise<void> {
    await this.getClient().updateAdStatus(adId, 'PAUSED')
  }

  async activateAd(adId: string): Promise<void> {
    await this.getClient().updateAdStatus(adId, 'ACTIVE')
  }

  async pauseCampaign(campaignId: string): Promise<void> {
    await this.getClient().updateCampaignStatus(campaignId, 'PAUSED')
  }

  async activateCampaign(campaignId: string): Promise<void> {
    await this.getClient().updateCampaignStatus(campaignId, 'ACTIVE')
  }
}
