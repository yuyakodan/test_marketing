/**
 * Google Ads API クライアント
 * Google Ads APIと連携してキャンペーン管理、指標取得を行う
 */

export interface GoogleAdsConfig {
  developerToken: string
  clientId: string
  clientSecret: string
  refreshToken: string
  customerId: string
  loginCustomerId?: string // MCC account
}

export interface GoogleAdsCampaign {
  id: string
  name: string
  status: 'ENABLED' | 'PAUSED' | 'REMOVED'
  advertisingChannelType: 'SEARCH' | 'DISPLAY' | 'SHOPPING' | 'VIDEO' | 'PERFORMANCE_MAX'
  biddingStrategy: string
  budget: {
    id: string
    amount: number
    deliveryMethod: 'STANDARD' | 'ACCELERATED'
  }
  targetCpa?: number
  targetRoas?: number
  startDate?: string
  endDate?: string
}

export interface GoogleAdsMetrics {
  campaignId: string
  date: string
  impressions: number
  clicks: number
  conversions: number
  conversionsValue: number
  cost: number
  ctr: number
  averageCpc: number
  conversionRate: number
  costPerConversion: number
}

export interface GoogleAdsAdGroup {
  id: string
  campaignId: string
  name: string
  status: 'ENABLED' | 'PAUSED' | 'REMOVED'
  cpcBidMicros?: number
}

export interface GoogleAdsAd {
  id: string
  adGroupId: string
  type: 'RESPONSIVE_SEARCH_AD' | 'RESPONSIVE_DISPLAY_AD' | 'VIDEO_AD' | 'IMAGE_AD'
  status: 'ENABLED' | 'PAUSED' | 'REMOVED'
  headlines?: string[]
  descriptions?: string[]
  finalUrls: string[]
}

class GoogleAdsClient {
  private config: GoogleAdsConfig | null = null
  private accessToken: string | null = null
  private tokenExpiry: Date | null = null

  private readonly BASE_URL = 'https://googleads.googleapis.com/v17'

  /**
   * クライアントを初期化
   */
  initialize(config: GoogleAdsConfig): void {
    this.config = config
  }

  /**
   * 設定済みかチェック
   */
  isConfigured(): boolean {
    return this.config !== null
  }

  /**
   * アクセストークンを取得/更新
   */
  private async getAccessToken(): Promise<string> {
    if (!this.config) {
      throw new Error('Google Ads client not initialized')
    }

    // トークンが有効な場合は再利用
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken
    }

    // リフレッシュトークンで新しいアクセストークンを取得
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.config.refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`)
    }

    const data = await response.json()
    this.accessToken = data.access_token
    this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000)

    return this.accessToken!
  }

  /**
   * Google Ads APIリクエストを実行
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: object
  ): Promise<T> {
    if (!this.config) {
      throw new Error('Google Ads client not initialized')
    }

    const accessToken = await this.getAccessToken()

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': this.config.developerToken,
      'Content-Type': 'application/json',
    }

    if (this.config.loginCustomerId) {
      headers['login-customer-id'] = this.config.loginCustomerId
    }

    const url = `${this.BASE_URL}/customers/${this.config.customerId}${endpoint}`

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Google Ads API error: ${JSON.stringify(error)}`)
    }

    return response.json()
  }

  /**
   * Google Ads Query Language (GAQL) でクエリを実行
   */
  private async query<T>(gaql: string): Promise<T[]> {
    const response = await this.request<{ results: T[] }>(
      '/googleAds:searchStream',
      'POST',
      { query: gaql }
    )

    return response.results || []
  }

  /**
   * キャンペーン一覧を取得
   */
  async getCampaigns(): Promise<GoogleAdsCampaign[]> {
    const gaql = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.bidding_strategy_type,
        campaign_budget.id,
        campaign_budget.amount_micros,
        campaign_budget.delivery_method,
        campaign.target_cpa.target_cpa_micros,
        campaign.target_roas.target_roas,
        campaign.start_date,
        campaign.end_date
      FROM campaign
      WHERE campaign.status != 'REMOVED'
      ORDER BY campaign.name
    `

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await this.query<any>(gaql)

    return results.map((row) => ({
      id: row.campaign.id,
      name: row.campaign.name,
      status: row.campaign.status,
      advertisingChannelType: row.campaign.advertisingChannelType,
      biddingStrategy: row.campaign.biddingStrategyType,
      budget: {
        id: row.campaignBudget.id,
        amount: row.campaignBudget.amountMicros / 1000000,
        deliveryMethod: row.campaignBudget.deliveryMethod,
      },
      targetCpa: row.campaign.targetCpa?.targetCpaMicros
        ? row.campaign.targetCpa.targetCpaMicros / 1000000
        : undefined,
      targetRoas: row.campaign.targetRoas?.targetRoas,
      startDate: row.campaign.startDate,
      endDate: row.campaign.endDate,
    }))
  }

  /**
   * キャンペーンの指標を取得
   */
  async getCampaignMetrics(
    startDate: string,
    endDate: string,
    campaignIds?: string[]
  ): Promise<GoogleAdsMetrics[]> {
    let whereClause = `
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND campaign.status != 'REMOVED'
    `

    if (campaignIds && campaignIds.length > 0) {
      whereClause += ` AND campaign.id IN (${campaignIds.join(',')})`
    }

    const gaql = `
      SELECT
        campaign.id,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.conversions_value,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions_from_interactions_rate,
        metrics.cost_per_conversion
      FROM campaign
      ${whereClause}
      ORDER BY segments.date DESC
    `

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await this.query<any>(gaql)

    return results.map((row) => ({
      campaignId: row.campaign.id,
      date: row.segments.date,
      impressions: row.metrics.impressions || 0,
      clicks: row.metrics.clicks || 0,
      conversions: row.metrics.conversions || 0,
      conversionsValue: row.metrics.conversionsValue || 0,
      cost: (row.metrics.costMicros || 0) / 1000000,
      ctr: row.metrics.ctr || 0,
      averageCpc: (row.metrics.averageCpc || 0) / 1000000,
      conversionRate: row.metrics.conversionsFromInteractionsRate || 0,
      costPerConversion: (row.metrics.costPerConversion || 0) / 1000000,
    }))
  }

  /**
   * 広告グループ一覧を取得
   */
  async getAdGroups(campaignId?: string): Promise<GoogleAdsAdGroup[]> {
    let whereClause = 'WHERE ad_group.status != \'REMOVED\''

    if (campaignId) {
      whereClause += ` AND campaign.id = ${campaignId}`
    }

    const gaql = `
      SELECT
        ad_group.id,
        campaign.id,
        ad_group.name,
        ad_group.status,
        ad_group.cpc_bid_micros
      FROM ad_group
      ${whereClause}
      ORDER BY ad_group.name
    `

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await this.query<any>(gaql)

    return results.map((row) => ({
      id: row.adGroup.id,
      campaignId: row.campaign.id,
      name: row.adGroup.name,
      status: row.adGroup.status,
      cpcBidMicros: row.adGroup.cpcBidMicros,
    }))
  }

  /**
   * 広告一覧を取得
   */
  async getAds(adGroupId?: string): Promise<GoogleAdsAd[]> {
    let whereClause = 'WHERE ad_group_ad.status != \'REMOVED\''

    if (adGroupId) {
      whereClause += ` AND ad_group.id = ${adGroupId}`
    }

    const gaql = `
      SELECT
        ad_group_ad.ad.id,
        ad_group.id,
        ad_group_ad.ad.type,
        ad_group_ad.status,
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions,
        ad_group_ad.ad.final_urls
      FROM ad_group_ad
      ${whereClause}
    `

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await this.query<any>(gaql)

    return results.map((row) => ({
      id: row.adGroupAd.ad.id,
      adGroupId: row.adGroup.id,
      type: row.adGroupAd.ad.type,
      status: row.adGroupAd.status,
      headlines: row.adGroupAd.ad.responsiveSearchAd?.headlines?.map(
        (h: { text: string }) => h.text
      ),
      descriptions: row.adGroupAd.ad.responsiveSearchAd?.descriptions?.map(
        (d: { text: string }) => d.text
      ),
      finalUrls: row.adGroupAd.ad.finalUrls || [],
    }))
  }

  /**
   * キャンペーンを更新
   */
  async updateCampaign(
    campaignId: string,
    updates: {
      name?: string
      status?: 'ENABLED' | 'PAUSED'
      budgetAmount?: number
      targetCpa?: number
      targetRoas?: number
    }
  ): Promise<void> {
    const operations = []

    if (updates.name || updates.status) {
      operations.push({
        updateOperation: {
          update: {
            resourceName: `customers/${this.config!.customerId}/campaigns/${campaignId}`,
            ...(updates.name && { name: updates.name }),
            ...(updates.status && { status: updates.status }),
          },
          updateMask: Object.keys(updates).filter(k => k !== 'budgetAmount').join(','),
        },
      })
    }

    if (operations.length > 0) {
      await this.request('/campaigns:mutate', 'POST', { operations })
    }
  }

  /**
   * キャンペーンを一時停止
   */
  async pauseCampaign(campaignId: string): Promise<void> {
    await this.updateCampaign(campaignId, { status: 'PAUSED' })
  }

  /**
   * キャンペーンを有効化
   */
  async enableCampaign(campaignId: string): Promise<void> {
    await this.updateCampaign(campaignId, { status: 'ENABLED' })
  }

  /**
   * コンバージョンアクション一覧を取得
   */
  async getConversionActions(): Promise<Array<{
    id: string
    name: string
    category: string
    status: string
  }>> {
    const gaql = `
      SELECT
        conversion_action.id,
        conversion_action.name,
        conversion_action.category,
        conversion_action.status
      FROM conversion_action
      WHERE conversion_action.status = 'ENABLED'
    `

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await this.query<any>(gaql)

    return results.map((row) => ({
      id: row.conversionAction.id,
      name: row.conversionAction.name,
      category: row.conversionAction.category,
      status: row.conversionAction.status,
    }))
  }

  /**
   * オフラインコンバージョンをアップロード
   */
  async uploadOfflineConversion(
    conversionActionId: string,
    gclid: string,
    conversionDateTime: string,
    conversionValue?: number,
    currencyCode: string = 'JPY'
  ): Promise<void> {
    const operations = [
      {
        create: {
          gclid,
          conversionAction: `customers/${this.config!.customerId}/conversionActions/${conversionActionId}`,
          conversionDateTime,
          conversionValue: conversionValue?.toString(),
          currencyCode,
        },
      },
    ]

    await this.request('/conversionUploads:uploadClickConversions', 'POST', {
      conversions: operations,
      partialFailure: true,
    })
  }
}

// シングルトンインスタンス
export const googleAdsClient = new GoogleAdsClient()

/**
 * 環境変数から設定を読み込んで初期化
 */
export function initializeGoogleAdsFromEnv(): void {
  const config: GoogleAdsConfig = {
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
    clientId: process.env.GOOGLE_ADS_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
    refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN || '',
    customerId: process.env.GOOGLE_ADS_CUSTOMER_ID || '',
    loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  }

  if (config.developerToken && config.clientId && config.clientSecret && config.refreshToken && config.customerId) {
    googleAdsClient.initialize(config)
  }
}
