/**
 * 入札戦略最適化エンジン
 * パフォーマンスに基づいて最適な入札戦略を提案・調整
 */

export type BidStrategy =
  | 'lowest_cost' // 最低コスト（自動入札）
  | 'cost_cap' // コスト上限（CPA目標）
  | 'bid_cap' // 入札上限
  | 'target_cost' // 目標コスト
  | 'highest_value' // 最高価値

export interface BidStrategyConfig {
  strategy: BidStrategy
  bidAmount?: number // bid_cap, cost_cap用
  targetCPA?: number // cost_cap, target_cost用
  roasTarget?: number // highest_value用
}

export interface CampaignBidData {
  id: string
  name: string
  currentStrategy: BidStrategy
  currentBidAmount?: number
  performance: {
    spend: number
    impressions: number
    clicks: number
    conversions: number
    revenue?: number
    ctr: number
    cvr: number
    cpa: number
    roas?: number
  }
  dailyBudget: number
  deliveryStatus: 'active' | 'learning' | 'limited' | 'inactive'
  learningPhaseInfo?: {
    isLearning: boolean
    conversionsNeeded: number
    currentConversions: number
  }
}

export interface BidRecommendation {
  campaignId: string
  currentStrategy: BidStrategy
  recommendedStrategy: BidStrategy
  currentBidAmount?: number
  recommendedBidAmount?: number
  reason: string
  expectedImpact: string
  confidence: 'high' | 'medium' | 'low'
  priority: 'high' | 'medium' | 'low'
}

export interface BidOptimizationResult {
  recommendations: BidRecommendation[]
  summary: {
    totalCampaigns: number
    needsOptimization: number
    expectedCPAReduction: number
    expectedROASIncrease: number
  }
}

export interface BidOptimizationConfig {
  /** 目標CPA */
  targetCPA: number
  /** 目標ROAS */
  targetROAS?: number
  /** 入札変更の最大幅（%） */
  maxBidChangePercent: number
  /** 学習期間中のキャンペーンは除外 */
  excludeLearning: boolean
  /** 最低コンバージョン数（これ以下はデータ不足） */
  minConversions: number
  /** リスク許容度 */
  riskTolerance: 'conservative' | 'moderate' | 'aggressive'
}

const DEFAULT_CONFIG: BidOptimizationConfig = {
  targetCPA: 5000,
  targetROAS: 3.0,
  maxBidChangePercent: 20,
  excludeLearning: true,
  minConversions: 10,
  riskTolerance: 'moderate',
}

/**
 * キャンペーンの入札戦略を最適化
 */
export function optimizeBidStrategies(
  campaigns: CampaignBidData[],
  config: Partial<BidOptimizationConfig> = {}
): BidOptimizationResult {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  // 対象キャンペーンをフィルタリング
  const eligibleCampaigns = campaigns.filter((campaign) => {
    // 非アクティブは除外
    if (campaign.deliveryStatus === 'inactive') return false

    // 学習中除外オプション
    if (cfg.excludeLearning && campaign.learningPhaseInfo?.isLearning) {
      return false
    }

    // 最低コンバージョン数
    if (campaign.performance.conversions < cfg.minConversions) {
      return false
    }

    return true
  })

  // 各キャンペーンの推奨を生成
  const recommendations = eligibleCampaigns
    .map((campaign) => generateRecommendation(campaign, cfg))
    .filter((rec): rec is BidRecommendation => rec !== null)

  // サマリー計算
  const summary = calculateSummary(campaigns, recommendations, cfg)

  return {
    recommendations,
    summary,
  }
}

/**
 * 個別キャンペーンの推奨を生成
 */
function generateRecommendation(
  campaign: CampaignBidData,
  config: BidOptimizationConfig
): BidRecommendation | null {
  const { performance, currentStrategy, currentBidAmount } = campaign

  // パフォーマンス評価
  const cpaRatio = performance.cpa / config.targetCPA
  const roasRatio = config.targetROAS && performance.roas
    ? performance.roas / config.targetROAS
    : null

  // 推奨戦略を決定
  let recommendation: BidRecommendation | null = null

  // CPA目標を大幅に超過している場合
  if (cpaRatio > 1.5) {
    recommendation = {
      campaignId: campaign.id,
      currentStrategy,
      recommendedStrategy: 'cost_cap',
      currentBidAmount,
      recommendedBidAmount: calculateOptimalBidCap(campaign, config),
      reason: `CPAが目標の${Math.round(cpaRatio * 100)}%と大幅に超過`,
      expectedImpact: `CPAを${Math.round((cpaRatio - 1) * 50)}%削減見込み`,
      confidence: 'high',
      priority: 'high',
    }
  }
  // CPA目標をやや超過
  else if (cpaRatio > 1.2) {
    const newBidAmount = currentBidAmount
      ? currentBidAmount * (1 - config.maxBidChangePercent / 200)
      : config.targetCPA * 0.9

    recommendation = {
      campaignId: campaign.id,
      currentStrategy,
      recommendedStrategy: currentStrategy === 'lowest_cost' ? 'cost_cap' : currentStrategy,
      currentBidAmount,
      recommendedBidAmount: Math.round(newBidAmount),
      reason: `CPAが目標を${Math.round((cpaRatio - 1) * 100)}%超過`,
      expectedImpact: `入札調整によりCPAを10-15%改善見込み`,
      confidence: 'medium',
      priority: 'medium',
    }
  }
  // CPAが目標を大幅に下回っている（スケール余地あり）
  else if (cpaRatio < 0.7 && campaign.deliveryStatus === 'limited') {
    const newBidAmount = currentBidAmount
      ? currentBidAmount * (1 + config.maxBidChangePercent / 100)
      : config.targetCPA

    recommendation = {
      campaignId: campaign.id,
      currentStrategy,
      recommendedStrategy: 'bid_cap',
      currentBidAmount,
      recommendedBidAmount: Math.round(newBidAmount),
      reason: `CPAが目標の${Math.round(cpaRatio * 100)}%と効率的、配信制限中`,
      expectedImpact: `入札引き上げで配信量を20-30%増加見込み`,
      confidence: 'medium',
      priority: 'medium',
    }
  }
  // ROAS目標を下回っている
  else if (roasRatio !== null && roasRatio < 0.8) {
    recommendation = {
      campaignId: campaign.id,
      currentStrategy,
      recommendedStrategy: 'highest_value',
      currentBidAmount,
      reason: `ROASが目標の${Math.round(roasRatio * 100)}%`,
      expectedImpact: `価値最大化入札で収益効率を改善`,
      confidence: 'medium',
      priority: 'high',
    }
  }
  // 学習期間終了後、自動入札への移行を推奨
  else if (
    currentStrategy === 'bid_cap' &&
    performance.conversions >= 50 &&
    cpaRatio <= 1.1
  ) {
    recommendation = {
      campaignId: campaign.id,
      currentStrategy,
      recommendedStrategy: 'lowest_cost',
      currentBidAmount,
      reason: `十分なデータ（${performance.conversions}CV）が蓄積、自動入札が効果的`,
      expectedImpact: `自動最適化により配信効率が向上`,
      confidence: 'high',
      priority: 'low',
    }
  }

  return recommendation
}

/**
 * 最適な入札上限を計算
 */
function calculateOptimalBidCap(
  campaign: CampaignBidData,
  config: BidOptimizationConfig
): number {
  const { performance } = campaign

  // 現在のCPCと目標CPAから逆算
  const cpc = performance.clicks > 0
    ? performance.spend / performance.clicks
    : 100
  const cvr = performance.cvr / 100

  // 目標CPAを達成するための入札上限
  // CPA = CPC / CVR なので、CPC = CPA * CVR
  const idealBidCap = config.targetCPA * cvr

  // リスク許容度に応じて調整
  const riskMultiplier = {
    conservative: 0.8,
    moderate: 0.9,
    aggressive: 1.0,
  }[config.riskTolerance]

  return Math.round(idealBidCap * riskMultiplier)
}

/**
 * サマリーを計算
 */
function calculateSummary(
  allCampaigns: CampaignBidData[],
  recommendations: BidRecommendation[],
  config: BidOptimizationConfig
): BidOptimizationResult['summary'] {
  const needsOptimization = recommendations.length
  const totalCampaigns = allCampaigns.length

  // 期待されるCPA削減率を計算
  const highPriorityCount = recommendations.filter((r) => r.priority === 'high').length
  const mediumPriorityCount = recommendations.filter((r) => r.priority === 'medium').length

  // 推定改善率
  const expectedCPAReduction =
    highPriorityCount * 15 + mediumPriorityCount * 8

  // ROAS改善（価値最大化推奨がある場合）
  const hasHighValueRec = recommendations.some(
    (r) => r.recommendedStrategy === 'highest_value'
  )
  const expectedROASIncrease = hasHighValueRec ? 15 : 5

  return {
    totalCampaigns,
    needsOptimization,
    expectedCPAReduction: Math.min(expectedCPAReduction, 30), // 最大30%
    expectedROASIncrease,
  }
}

/**
 * 入札額の調整を計算
 */
export function calculateBidAdjustment(
  currentBid: number,
  targetCPA: number,
  actualCPA: number,
  maxChangePercent: number = 20
): {
  newBid: number
  changePercent: number
  direction: 'increase' | 'decrease' | 'maintain'
} {
  if (actualCPA === 0) {
    return { newBid: currentBid, changePercent: 0, direction: 'maintain' }
  }

  const cpaRatio = actualCPA / targetCPA
  let changePercent = 0

  if (cpaRatio > 1.1) {
    // CPAが高い → 入札を下げる
    changePercent = -Math.min((cpaRatio - 1) * 50, maxChangePercent)
  } else if (cpaRatio < 0.9) {
    // CPAが低い → 入札を上げる余地あり
    changePercent = Math.min((1 - cpaRatio) * 30, maxChangePercent)
  }

  const newBid = Math.round(currentBid * (1 + changePercent / 100))

  return {
    newBid,
    changePercent,
    direction:
      changePercent > 0 ? 'increase' : changePercent < 0 ? 'decrease' : 'maintain',
  }
}

/**
 * 学習期間の推定残り日数を計算
 */
export function estimateLearningPeriodRemaining(
  currentConversions: number,
  dailyConversions: number,
  targetConversions: number = 50
): {
  daysRemaining: number
  isComplete: boolean
  progress: number
} {
  const conversionsNeeded = targetConversions - currentConversions
  const progress = Math.min((currentConversions / targetConversions) * 100, 100)

  if (conversionsNeeded <= 0) {
    return { daysRemaining: 0, isComplete: true, progress: 100 }
  }

  const daysRemaining =
    dailyConversions > 0 ? Math.ceil(conversionsNeeded / dailyConversions) : 999

  return {
    daysRemaining,
    isComplete: false,
    progress,
  }
}

/**
 * 戦略変更の影響をシミュレーション
 */
export function simulateStrategyChange(
  campaign: CampaignBidData,
  newStrategy: BidStrategy,
  newBidAmount?: number
): {
  estimatedCPA: number
  estimatedConversions: number
  estimatedSpend: number
  estimatedROAS?: number
  riskLevel: 'low' | 'medium' | 'high'
} {
  const { performance, dailyBudget } = campaign

  // 基本的な推定（実際にはもっと複雑なモデルが必要）
  let cpaMultiplier = 1
  let volumeMultiplier = 1
  let riskLevel: 'low' | 'medium' | 'high' = 'medium'

  switch (newStrategy) {
    case 'lowest_cost':
      // 自動入札は効率が高いがCPAは上がる可能性
      cpaMultiplier = 1.1
      volumeMultiplier = 1.2
      riskLevel = 'low'
      break

    case 'cost_cap':
      // CPA制限あり
      cpaMultiplier = newBidAmount && performance.cpa > 0
        ? Math.min(newBidAmount / performance.cpa, 1)
        : 0.9
      volumeMultiplier = 0.8 // 配信量は減る可能性
      riskLevel = 'low'
      break

    case 'bid_cap':
      // 入札上限
      cpaMultiplier = 1.0
      volumeMultiplier = newBidAmount && performance.cpa > 0
        ? newBidAmount / performance.cpa
        : 1.0
      riskLevel = 'medium'
      break

    case 'target_cost':
      // 目標コスト
      cpaMultiplier = newBidAmount && performance.cpa > 0
        ? newBidAmount / performance.cpa
        : 1.0
      volumeMultiplier = 1.0
      riskLevel = 'medium'
      break

    case 'highest_value':
      // 価値最大化
      cpaMultiplier = 1.2
      volumeMultiplier = 1.0
      riskLevel = 'high'
      break
  }

  const estimatedCPA = Math.round(performance.cpa * cpaMultiplier)
  const currentDailyConversions = performance.conversions / 7 // 7日間と仮定
  const estimatedConversions = Math.round(currentDailyConversions * 7 * volumeMultiplier)
  const estimatedSpend = estimatedCPA * estimatedConversions

  return {
    estimatedCPA,
    estimatedConversions,
    estimatedSpend: Math.min(estimatedSpend, dailyBudget * 7),
    estimatedROAS: performance.roas
      ? performance.roas * (performance.cpa / estimatedCPA)
      : undefined,
    riskLevel,
  }
}

/**
 * 入札戦略の日本語名を取得
 */
export function getBidStrategyDisplayName(strategy: BidStrategy): string {
  const names: Record<BidStrategy, string> = {
    lowest_cost: '最低コスト（自動入札）',
    cost_cap: 'コスト上限',
    bid_cap: '入札上限',
    target_cost: '目標コスト',
    highest_value: '最高価値',
  }
  return names[strategy]
}

/**
 * 入札戦略の説明を取得
 */
export function getBidStrategyDescription(strategy: BidStrategy): string {
  const descriptions: Record<BidStrategy, string> = {
    lowest_cost: '予算内で最も多くの結果を得られるよう自動で入札を調整',
    cost_cap: '指定したCPA上限を超えないよう入札を調整',
    bid_cap: '指定した入札上限で最大の結果を目指す',
    target_cost: '指定した目標CPAに近づくよう入札を調整',
    highest_value: '予算内で最も価値の高い結果を優先',
  }
  return descriptions[strategy]
}
