import { generateJSON } from './client'

export interface LPSection {
  type: 'hero' | 'features' | 'testimonials' | 'pricing' | 'faq' | 'cta' | 'form'
  content: Record<string, unknown>
}

export interface LPStructure {
  title: string
  description: string
  sections: LPSection[]
  conversionType: 'form_submit' | 'purchase' | 'line_registration'
  targetCPA: number
}

export interface GenerateLPOptions {
  productName: string
  productDescription: string
  targetAudience: string
  uniqueSellingPoints: string[]
  conversionGoal: 'form_submit' | 'purchase' | 'line_registration'
  tone: 'professional' | 'casual' | 'urgent' | 'friendly' | 'luxurious'
  adHeadline?: string // 広告からの流入を想定したメッセージの一貫性
}

/**
 * AIを使ってLPコンテンツを生成
 */
export async function generateLPContent(options: GenerateLPOptions): Promise<LPStructure> {
  const prompt = `
あなたはコンバージョン率の高いランディングページを設計する専門家です。
以下の情報を元に、効果的なLPの構成とコンテンツを生成してください。

## 商品・サービス情報
- 名前: ${options.productName}
- 説明: ${options.productDescription}
- ターゲット: ${options.targetAudience}
- USP: ${options.uniqueSellingPoints.join(', ')}
- コンバージョン目標: ${options.conversionGoal === 'form_submit' ? 'フォーム送信' : options.conversionGoal === 'purchase' ? '購入' : 'LINE登録'}
- トーン: ${options.tone}
${options.adHeadline ? `- 広告の見出し（メッセージの一貫性を保つ）: "${options.adHeadline}"` : ''}

## LP設計のベストプラクティス
1. ファーストビューでバリュープロポジションを明確に
2. 信頼性を示す要素（実績、お客様の声）を含める
3. ベネフィットを具体的に説明
4. FAQで不安を解消
5. 明確なCTAを複数箇所に配置

## 出力形式（JSON）
{
  "title": "ページタイトル",
  "description": "meta description",
  "sections": [
    {
      "type": "hero",
      "content": {
        "badge": "バッジテキスト（オプション）",
        "headline": "メインの見出し",
        "subheadline": "サブ見出し",
        "ctaText": "CTAボタンテキスト",
        "bgColor": "#色コード"
      }
    },
    {
      "type": "features",
      "content": {
        "title": "セクションタイトル",
        "items": [
          { "icon": "絵文字", "title": "特徴タイトル", "description": "説明" }
        ]
      }
    },
    {
      "type": "testimonials",
      "content": {
        "title": "お客様の声",
        "items": [
          { "content": "感想", "name": "名前", "title": "肩書き" }
        ]
      }
    },
    {
      "type": "faq",
      "content": {
        "title": "よくある質問",
        "items": [
          { "question": "質問", "answer": "回答" }
        ]
      }
    },
    {
      "type": "cta",
      "content": {
        "headline": "最後の訴求",
        "subheadline": "行動を促すメッセージ",
        "ctaText": "CTAテキスト",
        "bgColor": "#色コード"
      }
    },
    {
      "type": "form",
      "content": {
        "title": "フォームタイトル",
        "submitText": "送信ボタンテキスト",
        "fields": [
          { "name": "name", "label": "お名前", "type": "text", "required": true }
        ],
        "successTitle": "送信完了",
        "successMessage": "完了メッセージ"
      }
    }
  ],
  "conversionType": "${options.conversionGoal}",
  "targetCPA": 5000
}
`

  return generateJSON<LPStructure>({
    prompt,
    temperature: 0.7,
  })
}

/**
 * LPのA/Bテスト用バリアントを生成
 */
export interface GenerateLPVariantOptions {
  originalLP: LPStructure
  testElement: 'headline' | 'structure' | 'cta' | 'testimonials' | 'urgency'
  hypothesis?: string
}

export async function generateLPVariant(
  options: GenerateLPVariantOptions
): Promise<{
  variant: LPStructure
  changes: string[]
  hypothesis: string
  expectedImpact: string
}> {
  const testDescriptions: Record<string, string> = {
    headline: 'ヘッドラインとメインメッセージを変更',
    structure: 'セクションの順序や構成を変更',
    cta: 'CTAのテキスト、色、配置を変更',
    testimonials: 'お客様の声のコンテンツと配置を変更',
    urgency: '緊急性・限定感を追加または強化',
  }

  const prompt = `
あなたはLP最適化のA/Bテスト専門家です。
以下のオリジナルLPから、${testDescriptions[options.testElement]}したバリアントを生成してください。

## オリジナルLP
${JSON.stringify(options.originalLP, null, 2)}

## テスト要素: ${options.testElement}
${options.hypothesis ? `仮説: ${options.hypothesis}` : ''}

## 出力形式（JSON）
{
  "variant": { /* 修正されたLP構造（オリジナルと同じ形式） */ },
  "changes": ["変更点1", "変更点2"],
  "hypothesis": "このバリエーションをテストする理由",
  "expectedImpact": "期待される効果（CVRの改善見込みなど）"
}
`

  return generateJSON({
    prompt,
    temperature: 0.7,
  })
}

/**
 * LPのパフォーマンスを分析して改善提案
 */
export interface AnalyzeLPOptions {
  lpStructure: LPStructure
  performance: {
    visitors: number
    bounceRate: number
    avgTimeOnPage: number
    formStarts: number
    conversions: number
    cvr: number
  }
  heatmapInsights?: string
}

export async function analyzeLPPerformance(
  options: AnalyzeLPOptions
): Promise<{
  assessment: string
  issues: Array<{
    section: string
    issue: string
    severity: 'high' | 'medium' | 'low'
    suggestion: string
  }>
  quickWins: string[]
  majorRecommendations: string[]
}> {
  const prompt = `
あなたはLPコンバージョン最適化（CRO）の専門家です。
以下のLPとパフォーマンスデータを分析し、改善提案を行ってください。

## LP構造
${JSON.stringify(options.lpStructure, null, 2)}

## パフォーマンス
- 訪問者数: ${options.performance.visitors.toLocaleString()}
- 直帰率: ${options.performance.bounceRate.toFixed(1)}%
- 平均滞在時間: ${options.performance.avgTimeOnPage.toFixed(1)}秒
- フォーム開始数: ${options.performance.formStarts}
- コンバージョン: ${options.performance.conversions}
- CVR: ${options.performance.cvr.toFixed(2)}%

${options.heatmapInsights ? `## ヒートマップからのインサイト\n${options.heatmapInsights}` : ''}

## 出力形式（JSON）
{
  "assessment": "全体的な評価（2-3文）",
  "issues": [
    {
      "section": "hero",
      "issue": "発見した問題",
      "severity": "high",
      "suggestion": "改善提案"
    }
  ],
  "quickWins": ["すぐに実施できる改善1", "改善2"],
  "majorRecommendations": ["大きな改善提案1", "提案2"]
}
`

  return generateJSON({
    prompt,
    temperature: 0.5,
  })
}

/**
 * 広告とLPのメッセージ一貫性をチェック
 */
export async function checkMessageConsistency(
  adContent: { headline: string; description: string },
  lpContent: LPStructure
): Promise<{
  consistencyScore: number
  issues: string[]
  suggestions: string[]
}> {
  const prompt = `
広告とランディングページのメッセージ一貫性をチェックしてください。
メッセージの一貫性はコンバージョン率に大きく影響します。

## 広告コンテンツ
- 見出し: "${adContent.headline}"
- 説明: "${adContent.description}"

## LPコンテンツ
${JSON.stringify(lpContent.sections.find(s => s.type === 'hero')?.content || {}, null, 2)}

## チェック項目
1. キーワードの一致
2. ベネフィットの一貫性
3. トーンの一致
4. 期待値の設定

## 出力形式（JSON）
{
  "consistencyScore": 85,
  "issues": ["不一致の問題点1", "問題点2"],
  "suggestions": ["改善提案1", "提案2"]
}
`

  return generateJSON({
    prompt,
    temperature: 0.3,
  })
}
