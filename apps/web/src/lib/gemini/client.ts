import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'

let genAI: GoogleGenerativeAI | null = null
let model: GenerativeModel | null = null

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured')
    }
    genAI = new GoogleGenerativeAI(apiKey)
  }
  return genAI
}

function getModel(modelName: string = 'gemini-2.0-flash'): GenerativeModel {
  const client = getClient()
  return client.getGenerativeModel({ model: modelName })
}

export interface GenerateTextOptions {
  prompt: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export async function generateText(options: GenerateTextOptions): Promise<string> {
  const { prompt, model: modelName = 'gemini-2.0-flash', temperature = 0.7 } = options

  const genModel = getModel(modelName)

  const result = await genModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: options.maxTokens || 2048,
    },
  })

  const response = result.response
  return response.text()
}

export interface GenerateJSONOptions<T> {
  prompt: string
  schema?: string
  model?: string
  temperature?: number
}

export async function generateJSON<T>(options: GenerateJSONOptions<T>): Promise<T> {
  const { prompt, schema, model: modelName = 'gemini-2.0-flash', temperature = 0.3 } = options

  const fullPrompt = schema
    ? `${prompt}\n\nOutput must be valid JSON matching this schema:\n${schema}\n\nRespond with ONLY the JSON, no markdown or explanation.`
    : `${prompt}\n\nRespond with ONLY valid JSON, no markdown or explanation.`

  const text = await generateText({
    prompt: fullPrompt,
    model: modelName,
    temperature,
  })

  // JSONを抽出
  const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from response')
  }

  return JSON.parse(jsonMatch[0]) as T
}

export interface AnalyzeImageOptions {
  imageUrl: string
  prompt: string
  model?: string
}

export async function analyzeImage(options: AnalyzeImageOptions): Promise<string> {
  const { imageUrl, prompt, model: modelName = 'gemini-2.0-flash' } = options

  const genModel = getModel(modelName)

  // URLから画像を取得
  const response = await fetch(imageUrl)
  const buffer = await response.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const mimeType = response.headers.get('content-type') || 'image/png'

  const result = await genModel.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: prompt },
        ],
      },
    ],
  })

  return result.response.text()
}

// Helper function for marketing analysis
export async function analyzeMarketingPerformance(data: {
  metrics: {
    impressions: number
    clicks: number
    conversions: number
    spend: number
    ctr: number
    cvr: number
    cpa: number
  }
  topCombinations: Array<{
    ad: string
    lp: string
    cvr: number
    cpa: number
  }>
  period: string
}): Promise<{
  summary: string
  insights: string[]
  recommendations: string[]
  nextActions: string[]
}> {
  const prompt = `
あなたはデジタルマーケティングのエキスパートです。以下のパフォーマンスデータを分析し、日本語でインサイトと推奨アクションを提供してください。

## パフォーマンスデータ（${data.period}）

### 総合指標
- インプレッション: ${data.metrics.impressions.toLocaleString()}
- クリック数: ${data.metrics.clicks.toLocaleString()}
- コンバージョン: ${data.metrics.conversions}
- 広告費: ¥${data.metrics.spend.toLocaleString()}
- CTR: ${data.metrics.ctr.toFixed(2)}%
- CVR: ${data.metrics.cvr.toFixed(2)}%
- CPA: ¥${data.metrics.cpa.toLocaleString()}

### トップパフォーマンス組み合わせ
${data.topCombinations.map((c, i) => `${i + 1}. ${c.ad} × ${c.lp} - CVR: ${c.cvr.toFixed(2)}%, CPA: ¥${c.cpa.toLocaleString()}`).join('\n')}

## 出力形式
以下のJSON形式で回答してください：
{
  "summary": "全体的なパフォーマンスの要約（2-3文）",
  "insights": ["発見したインサイト1", "インサイト2", "インサイト3"],
  "recommendations": ["改善推奨事項1", "推奨事項2", "推奨事項3"],
  "nextActions": ["具体的な次のアクション1", "アクション2", "アクション3"]
}
`

  return generateJSON<{
    summary: string
    insights: string[]
    recommendations: string[]
    nextActions: string[]
  }>({
    prompt,
    temperature: 0.5,
  })
}
