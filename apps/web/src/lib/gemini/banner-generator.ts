import { generateJSON, generateText } from './client'

export interface BannerConcept {
  headline: string
  subheadline: string
  ctaText: string
  appeal: 'urgency' | 'benefit' | 'social_proof' | 'curiosity' | 'fear' | 'value'
  tone: 'professional' | 'casual' | 'urgent' | 'friendly' | 'luxurious'
  colorScheme: {
    primary: string
    secondary: string
    accent: string
    background: string
  }
  imagePrompt: string
}

export interface BannerVariation {
  id: string
  concept: BannerConcept
  score: number
  reasoning: string
}

export interface GenerateBannerConceptsOptions {
  productName: string
  productDescription: string
  targetAudience: string
  uniqueSellingPoints: string[]
  campaignGoal: 'awareness' | 'consideration' | 'conversion'
  previousPerformance?: {
    bestPerforming?: {
      headline: string
      ctr: number
      cvr: number
    }
    worstPerforming?: {
      headline: string
      ctr: number
      cvr: number
    }
  }
  count?: number
}

/**
 * AIを使ってバナーコンセプトを生成
 */
export async function generateBannerConcepts(
  options: GenerateBannerConceptsOptions
): Promise<BannerVariation[]> {
  const { count = 5 } = options

  const performanceContext = options.previousPerformance
    ? `
## 過去のパフォーマンス参考データ
- 最も成績の良いバナー: "${options.previousPerformance.bestPerforming?.headline}" (CTR: ${options.previousPerformance.bestPerforming?.ctr}%, CVR: ${options.previousPerformance.bestPerforming?.cvr}%)
- 最も成績の悪いバナー: "${options.previousPerformance.worstPerforming?.headline}" (CTR: ${options.previousPerformance.worstPerforming?.ctr}%, CVR: ${options.previousPerformance.worstPerforming?.cvr}%)

成功パターンを参考にしつつ、失敗パターンは避けてください。
`
    : ''

  const prompt = `
あなたはMeta広告（Facebook/Instagram）のバナークリエイティブを設計する専門家です。
以下の情報を元に、${count}個の異なるバナーコンセプトを生成してください。

## 商品・サービス情報
- 名前: ${options.productName}
- 説明: ${options.productDescription}
- ターゲット: ${options.targetAudience}
- USP: ${options.uniqueSellingPoints.join(', ')}
- キャンペーン目標: ${options.campaignGoal === 'awareness' ? '認知拡大' : options.campaignGoal === 'consideration' ? '検討促進' : 'コンバージョン獲得'}

${performanceContext}

## 要件
1. 各コンセプトは異なる訴求軸（urgency/benefit/social_proof/curiosity/fear/value）を使用
2. Meta広告のベストプラクティスに従う（見出しは40文字以内、サブ見出しは90文字以内）
3. CTAは明確で行動を促すもの
4. 画像生成用のプロンプトも含める（英語で、nanobanana proで使用）

## 出力形式（JSON配列）
[
  {
    "id": "concept_1",
    "concept": {
      "headline": "見出し（40文字以内）",
      "subheadline": "サブ見出し（90文字以内）",
      "ctaText": "CTAボタンテキスト",
      "appeal": "urgency",
      "tone": "urgent",
      "colorScheme": {
        "primary": "#hex",
        "secondary": "#hex",
        "accent": "#hex",
        "background": "#hex"
      },
      "imagePrompt": "English prompt for image generation"
    },
    "score": 85,
    "reasoning": "この訴求が効果的と考える理由"
  }
]
`

  const result = await generateJSON<BannerVariation[]>({
    prompt,
    temperature: 0.8,
  })

  return result
}

/**
 * 既存のバナーを改善提案
 */
export interface ImproveBannerOptions {
  currentHeadline: string
  currentDescription: string
  performance: {
    impressions: number
    clicks: number
    conversions: number
    ctr: number
    cvr: number
  }
  competitorExamples?: string[]
}

export async function suggestBannerImprovements(
  options: ImproveBannerOptions
): Promise<{
  suggestions: Array<{
    type: 'headline' | 'description' | 'visual' | 'cta'
    original: string
    improved: string
    expectedImpact: string
    confidence: number
  }>
  overallAssessment: string
}> {
  const prompt = `
あなたは広告クリエイティブの最適化専門家です。以下のバナー広告を分析し、改善提案を行ってください。

## 現在のバナー
- 見出し: "${options.currentHeadline}"
- 説明: "${options.currentDescription}"

## 現在のパフォーマンス
- インプレッション: ${options.performance.impressions.toLocaleString()}
- クリック数: ${options.performance.clicks.toLocaleString()}
- コンバージョン: ${options.performance.conversions}
- CTR: ${options.performance.ctr.toFixed(2)}%
- CVR: ${options.performance.cvr.toFixed(2)}%

${options.competitorExamples ? `## 競合の参考例\n${options.competitorExamples.map((e, i) => `${i + 1}. ${e}`).join('\n')}` : ''}

## 出力形式（JSON）
{
  "suggestions": [
    {
      "type": "headline",
      "original": "現在の見出し",
      "improved": "改善案",
      "expectedImpact": "期待される効果",
      "confidence": 75
    }
  ],
  "overallAssessment": "全体的な評価と改善の方向性"
}
`

  return generateJSON({
    prompt,
    temperature: 0.6,
  })
}

/**
 * nanobanana pro用の画像生成プロンプトを最適化
 */
export async function optimizeImagePrompt(
  basePrompt: string,
  style: 'professional' | 'playful' | 'minimalist' | 'bold' | 'elegant'
): Promise<string> {
  const styleGuides: Record<string, string> = {
    professional: 'clean, corporate, trustworthy, blue tones, minimal',
    playful: 'vibrant, colorful, fun, dynamic, energetic',
    minimalist: 'simple, clean, white space, modern, subtle',
    bold: 'high contrast, strong colors, impactful, attention-grabbing',
    elegant: 'sophisticated, luxurious, gold accents, refined, premium',
  }

  const prompt = `
You are an expert at crafting prompts for AI image generation (like nanobanana pro / Stable Diffusion).

Base concept: ${basePrompt}
Desired style: ${style} - ${styleGuides[style]}

Create an optimized prompt for generating a Meta ad banner image.

Requirements:
- 1200x628 aspect ratio (1.91:1)
- Leave space for text overlay
- Suitable for social media advertising
- High quality, professional look

Output ONLY the optimized prompt in English, no explanation.
`

  return generateText({
    prompt,
    temperature: 0.7,
  })
}

/**
 * A/Bテスト用のバリエーションを自動生成
 */
export async function generateABTestVariations(
  originalConcept: BannerConcept,
  testElement: 'headline' | 'cta' | 'color' | 'appeal',
  count: number = 3
): Promise<Array<BannerConcept & { testHypothesis: string }>> {
  const prompt = `
あなたはA/Bテストの専門家です。以下のオリジナルバナーコンセプトから、${testElement}を変更した${count}個のバリエーションを生成してください。

## オリジナルコンセプト
- 見出し: "${originalConcept.headline}"
- サブ見出し: "${originalConcept.subheadline}"
- CTA: "${originalConcept.ctaText}"
- 訴求: ${originalConcept.appeal}
- トーン: ${originalConcept.tone}
- カラー: Primary ${originalConcept.colorScheme.primary}

## テスト対象: ${testElement}

テスト要素以外は同じにして、${testElement}のみを変更したバリエーションを生成してください。
各バリエーションには、なぜそのテストが有効かの仮説も含めてください。

## 出力形式（JSON配列）
[
  {
    "headline": "見出し",
    "subheadline": "サブ見出し",
    "ctaText": "CTAテキスト",
    "appeal": "appeal_type",
    "tone": "tone_type",
    "colorScheme": {
      "primary": "#hex",
      "secondary": "#hex",
      "accent": "#hex",
      "background": "#hex"
    },
    "imagePrompt": "image prompt",
    "testHypothesis": "このバリエーションをテストする理由と期待される効果"
  }
]
`

  return generateJSON({
    prompt,
    temperature: 0.7,
  })
}
