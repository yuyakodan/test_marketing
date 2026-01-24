import jstat from 'jstat'

/**
 * A/Bテストの統計的有意性を判定するライブラリ
 * 2群比率のZ検定を使用
 */

export interface ABTestResult {
  /** 統計的に有意かどうか */
  isSignificant: boolean
  /** 信頼度（0-100%） */
  confidence: number
  /** p値 */
  pValue: number
  /** Z値 */
  zScore: number
  /** 改善率（%） */
  improvement: number
  /** 勝者（A or B or null） */
  winner: 'A' | 'B' | null
  /** 必要追加サンプル数（有意でない場合） */
  requiredSamples?: number
}

export interface VariantData {
  /** サンプル数（クリック数など） */
  samples: number
  /** 成功数（コンバージョン数など） */
  successes: number
}

/**
 * 2群比率のZ検定を実行
 * @param variantA コントロール群のデータ
 * @param variantB 実験群のデータ
 * @param confidenceLevel 信頼水準（デフォルト0.95 = 95%）
 * @returns A/Bテスト結果
 */
export function performABTest(
  variantA: VariantData,
  variantB: VariantData,
  confidenceLevel: number = 0.95
): ABTestResult {
  const nA = variantA.samples
  const nB = variantB.samples
  const xA = variantA.successes
  const xB = variantB.successes

  // 最低サンプル数チェック
  const MIN_SAMPLES = 100
  if (nA < MIN_SAMPLES || nB < MIN_SAMPLES) {
    return {
      isSignificant: false,
      confidence: 0,
      pValue: 1,
      zScore: 0,
      improvement: calculateImprovement(xA / nA, xB / nB),
      winner: null,
      requiredSamples: Math.max(MIN_SAMPLES - nA, MIN_SAMPLES - nB, 0),
    }
  }

  // 成功率（CVR）を計算
  const pA = xA / nA
  const pB = xB / nB

  // プール成功率
  const pooledP = (xA + xB) / (nA + nB)

  // 標準誤差
  const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / nA + 1 / nB))

  // Z値を計算
  const zScore = se > 0 ? (pB - pA) / se : 0

  // p値を計算（両側検定）
  const pValue = 2 * (1 - jstat.normal.cdf(Math.abs(zScore), 0, 1))

  // 信頼度（1 - p値）
  const confidence = (1 - pValue) * 100

  // 有意性判定
  const alpha = 1 - confidenceLevel
  const isSignificant = pValue < alpha

  // 改善率
  const improvement = calculateImprovement(pA, pB)

  // 勝者判定
  let winner: 'A' | 'B' | null = null
  if (isSignificant) {
    winner = pB > pA ? 'B' : 'A'
  }

  // 必要追加サンプル数を計算（有意でない場合）
  let requiredSamples: number | undefined
  if (!isSignificant && improvement !== 0) {
    requiredSamples = calculateRequiredSampleSize(pA, pB, alpha)
  }

  return {
    isSignificant,
    confidence,
    pValue,
    zScore,
    improvement,
    winner,
    requiredSamples,
  }
}

/**
 * 改善率を計算
 */
function calculateImprovement(baseRate: number, testRate: number): number {
  if (baseRate === 0) return 0
  return ((testRate - baseRate) / baseRate) * 100
}

/**
 * 必要サンプルサイズを計算
 * 検出力80%を想定
 */
function calculateRequiredSampleSize(
  p1: number,
  p2: number,
  alpha: number = 0.05,
  power: number = 0.8
): number {
  const zAlpha = jstat.normal.inv(1 - alpha / 2, 0, 1)
  const zBeta = jstat.normal.inv(power, 0, 1)
  const pooledP = (p1 + p2) / 2
  const effect = Math.abs(p2 - p1)

  if (effect === 0) return Infinity

  const numerator = 2 * pooledP * (1 - pooledP) * Math.pow(zAlpha + zBeta, 2)
  const denominator = Math.pow(effect, 2)

  return Math.ceil(numerator / denominator)
}

/**
 * 複数バリアントの比較
 * 各バリアントをコントロール（最初のバリアント）と比較
 */
export function compareMultipleVariants(
  variants: Array<VariantData & { id: string; name: string }>,
  confidenceLevel: number = 0.95
): Array<{
  variantId: string
  variantName: string
  result: ABTestResult
}> {
  if (variants.length < 2) {
    return []
  }

  const control = variants[0]
  const results = []

  for (let i = 1; i < variants.length; i++) {
    const test = variants[i]
    const result = performABTest(control, test, confidenceLevel)
    results.push({
      variantId: test.id,
      variantName: test.name,
      result,
    })
  }

  return results
}

/**
 * ベイズ推定による勝率計算
 * より直感的な「Bが勝つ確率」を算出
 */
export function calculateWinProbability(
  variantA: VariantData,
  variantB: VariantData,
  simulations: number = 10000
): {
  probAWins: number
  probBWins: number
  probTie: number
} {
  const alphaA = variantA.successes + 1
  const betaA = variantA.samples - variantA.successes + 1
  const alphaB = variantB.successes + 1
  const betaB = variantB.samples - variantB.successes + 1

  let aWins = 0
  let bWins = 0

  for (let i = 0; i < simulations; i++) {
    const sampleA = jstat.beta.sample(alphaA, betaA)
    const sampleB = jstat.beta.sample(alphaB, betaB)

    if (sampleA > sampleB) {
      aWins++
    } else if (sampleB > sampleA) {
      bWins++
    }
  }

  return {
    probAWins: (aWins / simulations) * 100,
    probBWins: (bWins / simulations) * 100,
    probTie: ((simulations - aWins - bWins) / simulations) * 100,
  }
}

/**
 * 最適化アクションを推奨
 */
export interface OptimizationRecommendation {
  action: 'pause_loser' | 'continue_test' | 'declare_winner' | 'increase_traffic'
  targetVariantId?: string
  reason: string
  confidence: number
}

export function getOptimizationRecommendation(
  variants: Array<VariantData & { id: string; name: string }>,
  minDays: number = 7,
  testDays: number = 0
): OptimizationRecommendation {
  if (variants.length < 2) {
    return {
      action: 'continue_test',
      reason: 'バリアントが不足しています',
      confidence: 0,
    }
  }

  // 最低テスト期間チェック
  if (testDays < minDays) {
    return {
      action: 'continue_test',
      reason: `最低${minDays}日間のテストが必要です（現在${testDays}日）`,
      confidence: 0,
    }
  }

  // CVRでソート
  const sortedVariants = [...variants].sort((a, b) => {
    const cvrA = a.successes / a.samples
    const cvrB = b.successes / b.samples
    return cvrB - cvrA
  })

  const best = sortedVariants[0]
  const worst = sortedVariants[sortedVariants.length - 1]

  // 最良vs最悪でA/Bテスト
  const testResult = performABTest(
    { samples: worst.samples, successes: worst.successes },
    { samples: best.samples, successes: best.successes }
  )

  // 有意差があり、改善率が大きい場合
  if (testResult.isSignificant && testResult.confidence >= 95) {
    if (testResult.improvement >= 20) {
      // 20%以上の改善で負けパターンを停止推奨
      return {
        action: 'pause_loser',
        targetVariantId: worst.id,
        reason: `${worst.name}のCVRが有意に低い（改善率: ${testResult.improvement.toFixed(1)}%、信頼度: ${testResult.confidence.toFixed(1)}%）`,
        confidence: testResult.confidence,
      }
    } else {
      // 勝者を宣言
      return {
        action: 'declare_winner',
        targetVariantId: best.id,
        reason: `${best.name}が統計的に有意に優れています（信頼度: ${testResult.confidence.toFixed(1)}%）`,
        confidence: testResult.confidence,
      }
    }
  }

  // サンプル不足
  if (testResult.requiredSamples && testResult.requiredSamples > 0) {
    return {
      action: 'increase_traffic',
      reason: `有意差検出にはあと約${testResult.requiredSamples}サンプルが必要です`,
      confidence: testResult.confidence,
    }
  }

  return {
    action: 'continue_test',
    reason: 'まだ統計的に有意な差が検出されていません',
    confidence: testResult.confidence,
  }
}
