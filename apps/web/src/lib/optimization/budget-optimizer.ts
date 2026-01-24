/**
 * 予算自動再配分エンジン
 * パフォーマンスに基づいて予算を最適に配分
 */

export interface CombinationPerformance {
  id: string
  adId: string
  lpVariantId: string
  name: string
  currentBudget: number
  metrics: {
    impressions: number
    clicks: number
    conversions: number
    spend: number
    ctr: number
    cvr: number
    cpa: number
  }
  status: 'active' | 'paused' | 'testing'
}

export interface BudgetAllocation {
  combinationId: string
  currentBudget: number
  newBudget: number
  change: number
  changePercent: number
  reason: string
}

export interface BudgetOptimizationResult {
  totalBudget: number
  allocations: BudgetAllocation[]
  expectedImprovement: {
    cpaReduction: number
    conversionIncrease: number
  }
  summary: string
}

export interface BudgetOptimizationConfig {
  /** 最小予算（これ以下には下げない） */
  minBudget: number
  /** 最大予算（これ以上には上げない） */
  maxBudget: number
  /** 1回の変更での最大増減率 */
  maxChangePercent: number
  /** CPAの目標値 */
  targetCPA: number
  /** 予算再配分の戦略 */
  strategy: 'performance_based' | 'equal' | 'aggressive' | 'conservative'
}

const DEFAULT_CONFIG: BudgetOptimizationConfig = {
  minBudget: 1000,
  maxBudget: 100000,
  maxChangePercent: 30,
  targetCPA: 5000,
  strategy: 'performance_based',
}

/**
 * パフォーマンスに基づいて予算を再配分
 */
export function optimizeBudgetAllocation(
  combinations: CombinationPerformance[],
  totalBudget: number,
  config: Partial<BudgetOptimizationConfig> = {}
): BudgetOptimizationResult {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  // アクティブな組み合わせのみ対象
  const activeCombinations = combinations.filter((c) => c.status === 'active')

  if (activeCombinations.length === 0) {
    return {
      totalBudget,
      allocations: [],
      expectedImprovement: { cpaReduction: 0, conversionIncrease: 0 },
      summary: 'アクティブな組み合わせがありません',
    }
  }

  // 戦略に応じた配分を計算
  let allocations: BudgetAllocation[]

  switch (cfg.strategy) {
    case 'performance_based':
      allocations = calculatePerformanceBasedAllocation(
        activeCombinations,
        totalBudget,
        cfg
      )
      break
    case 'aggressive':
      allocations = calculateAggressiveAllocation(
        activeCombinations,
        totalBudget,
        cfg
      )
      break
    case 'conservative':
      allocations = calculateConservativeAllocation(
        activeCombinations,
        totalBudget,
        cfg
      )
      break
    case 'equal':
    default:
      allocations = calculateEqualAllocation(activeCombinations, totalBudget, cfg)
  }

  // 期待される改善を計算
  const expectedImprovement = calculateExpectedImprovement(
    activeCombinations,
    allocations
  )

  return {
    totalBudget,
    allocations,
    expectedImprovement,
    summary: generateSummary(allocations, expectedImprovement),
  }
}

/**
 * パフォーマンスベースの配分
 * CVRが高く、CPAが低い組み合わせに予算を集中
 */
function calculatePerformanceBasedAllocation(
  combinations: CombinationPerformance[],
  totalBudget: number,
  config: BudgetOptimizationConfig
): BudgetAllocation[] {
  // パフォーマンススコアを計算（CVRが高く、CPAが低いほど高スコア）
  const scored = combinations.map((c) => {
    const cvrScore = c.metrics.cvr * 10 // CVR 1% = 10点
    const cpaScore = c.metrics.cpa > 0 ? Math.max(0, (config.targetCPA / c.metrics.cpa) * 10) : 0
    const volumeScore = Math.min(c.metrics.conversions / 10, 5) // 最大5点
    const score = cvrScore + cpaScore + volumeScore

    return { combination: c, score }
  })

  // スコア合計
  const totalScore = scored.reduce((sum, s) => sum + s.score, 0)

  if (totalScore === 0) {
    // スコアがない場合は均等配分
    return calculateEqualAllocation(combinations, totalBudget, config)
  }

  // スコアに応じて予算を配分
  return scored.map(({ combination, score }) => {
    const idealBudget = (score / totalScore) * totalBudget
    const clampedBudget = Math.max(
      config.minBudget,
      Math.min(config.maxBudget, idealBudget)
    )

    // 変更幅を制限
    const maxChange = combination.currentBudget * (config.maxChangePercent / 100)
    const newBudget = Math.max(
      combination.currentBudget - maxChange,
      Math.min(combination.currentBudget + maxChange, clampedBudget)
    )

    const change = newBudget - combination.currentBudget
    const changePercent =
      combination.currentBudget > 0
        ? (change / combination.currentBudget) * 100
        : 0

    return {
      combinationId: combination.id,
      currentBudget: combination.currentBudget,
      newBudget: Math.round(newBudget),
      change: Math.round(change),
      changePercent,
      reason: generateAllocationReason(combination, score, changePercent),
    }
  })
}

/**
 * アグレッシブ配分
 * トップパフォーマーに大きく予算を集中
 */
function calculateAggressiveAllocation(
  combinations: CombinationPerformance[],
  totalBudget: number,
  config: BudgetOptimizationConfig
): BudgetAllocation[] {
  // CVRでソート
  const sorted = [...combinations].sort(
    (a, b) => b.metrics.cvr - a.metrics.cvr
  )

  // 上位20%に予算の60%、中位40%に30%、下位40%に10%
  const topCount = Math.max(1, Math.ceil(sorted.length * 0.2))
  const midCount = Math.ceil(sorted.length * 0.4)

  const topBudget = totalBudget * 0.6
  const midBudget = totalBudget * 0.3
  const bottomBudget = totalBudget * 0.1

  return sorted.map((combination, index) => {
    let newBudget: number

    if (index < topCount) {
      newBudget = topBudget / topCount
    } else if (index < topCount + midCount) {
      newBudget = midBudget / midCount
    } else {
      newBudget = bottomBudget / (sorted.length - topCount - midCount)
    }

    newBudget = Math.max(config.minBudget, Math.min(config.maxBudget, newBudget))

    const change = newBudget - combination.currentBudget
    const changePercent =
      combination.currentBudget > 0
        ? (change / combination.currentBudget) * 100
        : 0

    return {
      combinationId: combination.id,
      currentBudget: combination.currentBudget,
      newBudget: Math.round(newBudget),
      change: Math.round(change),
      changePercent,
      reason:
        index < topCount
          ? 'トップパフォーマーとして予算増加'
          : index < topCount + midCount
          ? '中位パフォーマンス'
          : '下位パフォーマンスのため予算削減',
    }
  })
}

/**
 * コンサバティブ配分
 * 現状の配分を維持しながら微調整
 */
function calculateConservativeAllocation(
  combinations: CombinationPerformance[],
  totalBudget: number,
  config: BudgetOptimizationConfig
): BudgetAllocation[] {
  // 現在の配分比率を維持しつつ、パフォーマンスに応じて±10%調整
  const currentTotal = combinations.reduce((sum, c) => sum + c.currentBudget, 0)

  return combinations.map((combination) => {
    const currentRatio =
      currentTotal > 0 ? combination.currentBudget / currentTotal : 1 / combinations.length
    const baseBudget = currentRatio * totalBudget

    // パフォーマンスに応じて調整（最大±10%）
    let adjustment = 0
    if (combination.metrics.cvr > 2) {
      adjustment = 0.1 // CVR > 2%なら+10%
    } else if (combination.metrics.cvr < 1) {
      adjustment = -0.1 // CVR < 1%なら-10%
    }

    const newBudget = Math.max(
      config.minBudget,
      Math.min(config.maxBudget, baseBudget * (1 + adjustment))
    )

    const change = newBudget - combination.currentBudget
    const changePercent =
      combination.currentBudget > 0
        ? (change / combination.currentBudget) * 100
        : 0

    return {
      combinationId: combination.id,
      currentBudget: combination.currentBudget,
      newBudget: Math.round(newBudget),
      change: Math.round(change),
      changePercent,
      reason:
        adjustment > 0
          ? '高CVRのため微増'
          : adjustment < 0
          ? '低CVRのため微減'
          : '現状維持',
    }
  })
}

/**
 * 均等配分
 */
function calculateEqualAllocation(
  combinations: CombinationPerformance[],
  totalBudget: number,
  config: BudgetOptimizationConfig
): BudgetAllocation[] {
  const equalBudget = totalBudget / combinations.length

  return combinations.map((combination) => {
    const newBudget = Math.max(
      config.minBudget,
      Math.min(config.maxBudget, equalBudget)
    )

    const change = newBudget - combination.currentBudget
    const changePercent =
      combination.currentBudget > 0
        ? (change / combination.currentBudget) * 100
        : 0

    return {
      combinationId: combination.id,
      currentBudget: combination.currentBudget,
      newBudget: Math.round(newBudget),
      change: Math.round(change),
      changePercent,
      reason: '均等配分',
    }
  })
}

/**
 * 期待される改善を計算
 */
function calculateExpectedImprovement(
  combinations: CombinationPerformance[],
  allocations: BudgetAllocation[]
): { cpaReduction: number; conversionIncrease: number } {
  // 現在の加重平均CPA
  const currentTotalSpend = combinations.reduce(
    (sum, c) => sum + c.metrics.spend,
    0
  )
  const currentTotalConversions = combinations.reduce(
    (sum, c) => sum + c.metrics.conversions,
    0
  )
  const currentCPA =
    currentTotalConversions > 0 ? currentTotalSpend / currentTotalConversions : 0

  // 新配分での予想CPA（各組み合わせのCPAと新予算から推定）
  let expectedConversions = 0
  let expectedSpend = 0

  for (const allocation of allocations) {
    const combination = combinations.find(
      (c) => c.id === allocation.combinationId
    )
    if (!combination) continue

    const cvrRate = combination.metrics.cvr / 100
    const ctr = combination.metrics.ctr / 100
    const cpc =
      combination.metrics.clicks > 0
        ? combination.metrics.spend / combination.metrics.clicks
        : 100

    // 新予算でのクリック数とCV数を推定
    const estimatedClicks = allocation.newBudget / cpc
    const estimatedConversions = estimatedClicks * cvrRate

    expectedConversions += estimatedConversions
    expectedSpend += allocation.newBudget
  }

  const expectedCPA =
    expectedConversions > 0 ? expectedSpend / expectedConversions : currentCPA

  return {
    cpaReduction: currentCPA > 0 ? ((currentCPA - expectedCPA) / currentCPA) * 100 : 0,
    conversionIncrease:
      currentTotalConversions > 0
        ? ((expectedConversions - currentTotalConversions) / currentTotalConversions) * 100
        : 0,
  }
}

/**
 * 配分理由を生成
 */
function generateAllocationReason(
  combination: CombinationPerformance,
  score: number,
  changePercent: number
): string {
  if (changePercent > 20) {
    return `高パフォーマンス（スコア: ${score.toFixed(1)}）のため大幅増額`
  } else if (changePercent > 5) {
    return `良好なパフォーマンスのため増額`
  } else if (changePercent < -20) {
    return `低パフォーマンス（CVR: ${combination.metrics.cvr.toFixed(2)}%）のため大幅減額`
  } else if (changePercent < -5) {
    return `改善余地ありのため減額`
  } else {
    return '現状維持'
  }
}

/**
 * サマリーを生成
 */
function generateSummary(
  allocations: BudgetAllocation[],
  improvement: { cpaReduction: number; conversionIncrease: number }
): string {
  const increases = allocations.filter((a) => a.change > 0).length
  const decreases = allocations.filter((a) => a.change < 0).length
  const unchanged = allocations.filter((a) => a.change === 0).length

  let summary = `${allocations.length}件の組み合わせを最適化: `
  summary += `増額${increases}件、減額${decreases}件、維持${unchanged}件。`

  if (improvement.cpaReduction > 0) {
    summary += ` CPAを${improvement.cpaReduction.toFixed(1)}%削減、`
  }
  if (improvement.conversionIncrease > 0) {
    summary += `CV数を${improvement.conversionIncrease.toFixed(1)}%増加見込み。`
  }

  return summary
}

/**
 * 予算変更をシミュレーション
 */
export function simulateBudgetChange(
  combination: CombinationPerformance,
  newBudget: number
): {
  estimatedClicks: number
  estimatedConversions: number
  estimatedCPA: number
  estimatedROAS: number
} {
  const cpc =
    combination.metrics.clicks > 0
      ? combination.metrics.spend / combination.metrics.clicks
      : 100
  const cvrRate = combination.metrics.cvr / 100

  const estimatedClicks = newBudget / cpc
  const estimatedConversions = estimatedClicks * cvrRate
  const estimatedCPA = estimatedConversions > 0 ? newBudget / estimatedConversions : 0

  // ROASは売上/広告費（仮に1CV=10,000円として計算）
  const estimatedRevenue = estimatedConversions * 10000
  const estimatedROAS = newBudget > 0 ? estimatedRevenue / newBudget : 0

  return {
    estimatedClicks: Math.round(estimatedClicks),
    estimatedConversions: Math.round(estimatedConversions * 10) / 10,
    estimatedCPA: Math.round(estimatedCPA),
    estimatedROAS: Math.round(estimatedROAS * 100) / 100,
  }
}
