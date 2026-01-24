/**
 * マルチチャネル統合メトリクスサービス
 * Meta、Google Ads、その他チャネルの指標を統合して管理
 */

export type AdChannel = 'meta' | 'google_ads' | 'tiktok' | 'line' | 'yahoo'

export interface ChannelMetrics {
  channel: AdChannel
  campaignId: string
  campaignName: string
  date: string
  impressions: number
  clicks: number
  conversions: number
  spend: number
  revenue?: number
  ctr: number
  cvr: number
  cpa: number
  roas?: number
}

export interface UnifiedMetrics {
  date: string
  totalSpend: number
  totalImpressions: number
  totalClicks: number
  totalConversions: number
  totalRevenue?: number
  avgCTR: number
  avgCVR: number
  avgCPA: number
  avgROAS?: number
  byChannel: Record<AdChannel, {
    spend: number
    impressions: number
    clicks: number
    conversions: number
    revenue?: number
    shareOfSpend: number
    cpa: number
  }>
}

export interface CrossChannelPerformance {
  channel: AdChannel
  displayName: string
  metrics: {
    spend: number
    conversions: number
    cpa: number
    cvr: number
    roas?: number
  }
  trend: 'up' | 'down' | 'stable'
  recommendation?: string
}

export interface ChannelAllocation {
  channel: AdChannel
  currentBudget: number
  recommendedBudget: number
  changePercent: number
  reason: string
}

/**
 * チャネル表示名
 */
export const channelDisplayNames: Record<AdChannel, string> = {
  meta: 'Meta広告',
  google_ads: 'Google広告',
  tiktok: 'TikTok広告',
  line: 'LINE広告',
  yahoo: 'Yahoo!広告',
}

/**
 * 複数チャネルの指標を統合
 */
export function aggregateUnifiedMetrics(
  channelMetrics: ChannelMetrics[]
): UnifiedMetrics {
  // 日付でグループ化（最新の日付を使用）
  const latestDate = channelMetrics.reduce((latest, m) => {
    return m.date > latest ? m.date : latest
  }, '')

  const filteredMetrics = channelMetrics.filter((m) => m.date === latestDate)

  // 総計を計算
  const totals = filteredMetrics.reduce(
    (acc, m) => ({
      spend: acc.spend + m.spend,
      impressions: acc.impressions + m.impressions,
      clicks: acc.clicks + m.clicks,
      conversions: acc.conversions + m.conversions,
      revenue: acc.revenue + (m.revenue || 0),
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }
  )

  // チャネル別の集計
  const byChannel: UnifiedMetrics['byChannel'] = {} as UnifiedMetrics['byChannel']

  const channels: AdChannel[] = ['meta', 'google_ads', 'tiktok', 'line', 'yahoo']

  for (const channel of channels) {
    const channelData = filteredMetrics.filter((m) => m.channel === channel)

    const channelTotals = channelData.reduce(
      (acc, m) => ({
        spend: acc.spend + m.spend,
        impressions: acc.impressions + m.impressions,
        clicks: acc.clicks + m.clicks,
        conversions: acc.conversions + m.conversions,
        revenue: acc.revenue + (m.revenue || 0),
      }),
      { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }
    )

    byChannel[channel] = {
      spend: channelTotals.spend,
      impressions: channelTotals.impressions,
      clicks: channelTotals.clicks,
      conversions: channelTotals.conversions,
      revenue: channelTotals.revenue || undefined,
      shareOfSpend: totals.spend > 0 ? (channelTotals.spend / totals.spend) * 100 : 0,
      cpa: channelTotals.conversions > 0 ? channelTotals.spend / channelTotals.conversions : 0,
    }
  }

  return {
    date: latestDate,
    totalSpend: totals.spend,
    totalImpressions: totals.impressions,
    totalClicks: totals.clicks,
    totalConversions: totals.conversions,
    totalRevenue: totals.revenue || undefined,
    avgCTR: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    avgCVR: totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0,
    avgCPA: totals.conversions > 0 ? totals.spend / totals.conversions : 0,
    avgROAS: totals.spend > 0 && totals.revenue > 0 ? totals.revenue / totals.spend : undefined,
    byChannel,
  }
}

/**
 * クロスチャネルパフォーマンス分析
 */
export function analyzeChannelPerformance(
  currentMetrics: ChannelMetrics[],
  previousMetrics: ChannelMetrics[]
): CrossChannelPerformance[] {
  const channels: AdChannel[] = ['meta', 'google_ads', 'tiktok', 'line', 'yahoo']
  const results: CrossChannelPerformance[] = []

  for (const channel of channels) {
    const current = currentMetrics.filter((m) => m.channel === channel)
    const previous = previousMetrics.filter((m) => m.channel === channel)

    if (current.length === 0) continue

    const currentTotals = aggregateChannelData(current)
    const previousTotals = aggregateChannelData(previous)

    // トレンドを判定
    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (previousTotals.conversions > 0) {
      const conversionChange =
        ((currentTotals.conversions - previousTotals.conversions) / previousTotals.conversions) * 100

      if (conversionChange > 10) trend = 'up'
      else if (conversionChange < -10) trend = 'down'
    }

    // 推奨事項を生成
    let recommendation: string | undefined

    const cpa = currentTotals.conversions > 0
      ? currentTotals.spend / currentTotals.conversions
      : 0

    if (cpa > 10000) {
      recommendation = 'CPAが高いため、ターゲティングの見直しを推奨'
    } else if (trend === 'down') {
      recommendation = 'パフォーマンスが低下傾向。クリエイティブの更新を検討'
    } else if (trend === 'up' && currentTotals.conversions > 50) {
      recommendation = '好調なため、予算増額を検討'
    }

    results.push({
      channel,
      displayName: channelDisplayNames[channel],
      metrics: {
        spend: currentTotals.spend,
        conversions: currentTotals.conversions,
        cpa,
        cvr: currentTotals.clicks > 0
          ? (currentTotals.conversions / currentTotals.clicks) * 100
          : 0,
        roas: currentTotals.spend > 0 && currentTotals.revenue > 0
          ? currentTotals.revenue / currentTotals.spend
          : undefined,
      },
      trend,
      recommendation,
    })
  }

  // CPAの低い順にソート
  return results.sort((a, b) => a.metrics.cpa - b.metrics.cpa)
}

/**
 * チャネル間の予算配分を最適化
 */
export function optimizeChannelAllocation(
  performances: CrossChannelPerformance[],
  totalBudget: number,
  config: {
    minBudgetPerChannel: number
    maxBudgetPerChannel: number
    targetCPA: number
  }
): ChannelAllocation[] {
  // CPAが低いチャネルにより多くの予算を配分
  const activeChannels = performances.filter((p) => p.metrics.conversions > 0)

  if (activeChannels.length === 0) {
    return []
  }

  // パフォーマンススコアを計算（CPAが低いほど高スコア）
  const scored = activeChannels.map((p) => {
    const cpaScore = p.metrics.cpa > 0
      ? Math.max(0, (config.targetCPA / p.metrics.cpa) * 10)
      : 5

    const trendScore = p.trend === 'up' ? 3 : p.trend === 'stable' ? 1 : -2

    return {
      channel: p.channel,
      currentBudget: p.metrics.spend,
      score: cpaScore + trendScore,
    }
  })

  const totalScore = scored.reduce((sum, s) => sum + s.score, 0)

  // スコアに基づいて予算を配分
  return scored.map((s) => {
    const idealBudget = totalScore > 0
      ? (s.score / totalScore) * totalBudget
      : totalBudget / scored.length

    const newBudget = Math.max(
      config.minBudgetPerChannel,
      Math.min(config.maxBudgetPerChannel, idealBudget)
    )

    const change = newBudget - s.currentBudget
    const changePercent = s.currentBudget > 0
      ? (change / s.currentBudget) * 100
      : 0

    let reason = ''
    if (changePercent > 20) {
      reason = '高パフォーマンスのため予算増額推奨'
    } else if (changePercent < -20) {
      reason = 'パフォーマンス改善余地あり、予算削減推奨'
    } else {
      reason = '現状維持'
    }

    return {
      channel: s.channel,
      currentBudget: Math.round(s.currentBudget),
      recommendedBudget: Math.round(newBudget),
      changePercent: Math.round(changePercent),
      reason,
    }
  })
}

/**
 * チャネルデータを集計
 */
function aggregateChannelData(metrics: ChannelMetrics[]) {
  return metrics.reduce(
    (acc, m) => ({
      spend: acc.spend + m.spend,
      impressions: acc.impressions + m.impressions,
      clicks: acc.clicks + m.clicks,
      conversions: acc.conversions + m.conversions,
      revenue: acc.revenue + (m.revenue || 0),
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }
  )
}

/**
 * チャネル別の時系列データを生成
 */
export function generateTimeSeriesData(
  metrics: ChannelMetrics[],
  groupBy: 'day' | 'week' | 'month' = 'day'
): Array<{
  date: string
  channels: Record<AdChannel, { spend: number; conversions: number; cpa: number }>
}> {
  // 日付でグループ化
  const byDate = new Map<string, ChannelMetrics[]>()

  for (const metric of metrics) {
    let dateKey = metric.date

    if (groupBy === 'week') {
      const d = new Date(metric.date)
      d.setDate(d.getDate() - d.getDay())
      dateKey = d.toISOString().split('T')[0]
    } else if (groupBy === 'month') {
      dateKey = metric.date.substring(0, 7) + '-01'
    }

    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, [])
    }
    byDate.get(dateKey)!.push(metric)
  }

  // 結果を生成
  const result: Array<{
    date: string
    channels: Record<AdChannel, { spend: number; conversions: number; cpa: number }>
  }> = []

  const channels: AdChannel[] = ['meta', 'google_ads', 'tiktok', 'line', 'yahoo']

  for (const [date, dayMetrics] of Array.from(byDate.entries()).sort()) {
    const channelsData: Record<AdChannel, { spend: number; conversions: number; cpa: number }> =
      {} as Record<AdChannel, { spend: number; conversions: number; cpa: number }>

    for (const channel of channels) {
      const channelMetrics = dayMetrics.filter((m) => m.channel === channel)
      const totals = aggregateChannelData(channelMetrics)

      channelsData[channel] = {
        spend: totals.spend,
        conversions: totals.conversions,
        cpa: totals.conversions > 0 ? totals.spend / totals.conversions : 0,
      }
    }

    result.push({ date, channels: channelsData })
  }

  return result
}

/**
 * チャネル間のカニバリゼーション分析
 */
export function analyzeChannelOverlap(
  conversionPaths: Array<{
    userId: string
    touchpoints: Array<{ channel: AdChannel; timestamp: Date }>
    converted: boolean
  }>
): {
  overlapRate: number
  commonPaths: Array<{ path: AdChannel[]; count: number; conversionRate: number }>
  recommendations: string[]
} {
  // 複数チャネルを経由したユーザーの割合
  const multiChannelUsers = conversionPaths.filter((p) => {
    const uniqueChannels = new Set(p.touchpoints.map((t) => t.channel))
    return uniqueChannels.size > 1
  })

  const overlapRate = conversionPaths.length > 0
    ? (multiChannelUsers.length / conversionPaths.length) * 100
    : 0

  // よくあるパスを集計
  const pathCounts = new Map<string, { count: number; conversions: number }>()

  for (const path of conversionPaths) {
    const channelPath = path.touchpoints
      .map((t) => t.channel)
      .filter((c, i, arr) => arr.indexOf(c) === i) // 重複を除去
      .join(' → ')

    if (!pathCounts.has(channelPath)) {
      pathCounts.set(channelPath, { count: 0, conversions: 0 })
    }

    const existing = pathCounts.get(channelPath)!
    existing.count++
    if (path.converted) existing.conversions++
  }

  const commonPaths = Array.from(pathCounts.entries())
    .map(([path, data]) => ({
      path: path.split(' → ') as AdChannel[],
      count: data.count,
      conversionRate: data.count > 0 ? (data.conversions / data.count) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // 推奨事項を生成
  const recommendations: string[] = []

  if (overlapRate > 30) {
    recommendations.push('チャネル間の重複が多いため、統合的なアトリビューション分析を推奨')
  }

  const topPath = commonPaths[0]
  if (topPath && topPath.path.length > 1) {
    recommendations.push(
      `最も効果的なパス: ${topPath.path.map((c) => channelDisplayNames[c]).join(' → ')} (CVR: ${topPath.conversionRate.toFixed(1)}%)`
    )
  }

  return {
    overlapRate,
    commonPaths,
    recommendations,
  }
}
