import crypto from "crypto"

const GRAPH_API_VERSION = "v22.0"
const CAPI_ENDPOINT = `https://graph.facebook.com/${GRAPH_API_VERSION}`

export type EventName =
  | "Purchase"
  | "Lead"
  | "CompleteRegistration"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Subscribe"

export interface ConversionEventData {
  eventName: EventName
  eventTime: number
  eventId: string
  eventSourceUrl: string
  userData: {
    email?: string
    phone?: string
    firstName?: string
    lastName?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
    clientIpAddress?: string
    clientUserAgent?: string
    fbp?: string // Facebook Browser ID
    fbc?: string // Facebook Click ID
    externalId?: string
  }
  customData?: {
    value?: number
    currency?: string
    contentIds?: string[]
    contentType?: string
    contents?: Array<{ id: string; quantity: number; price?: number }>
    contentName?: string
    contentCategory?: string
    numItems?: number
    orderId?: string
  }
  actionSource?: "website" | "app" | "email" | "phone_call" | "chat" | "other"
}

export interface ConversionApiResponse {
  events_received: number
  messages: string[]
  fbtrace_id: string
}

/**
 * SHA256ハッシュ化（PII保護用）
 */
function hashValue(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value.toLowerCase().trim())
    .digest("hex")
}

/**
 * 電話番号の正規化（数字のみ、国番号付き）
 */
function normalizePhone(phone: string): string {
  // 数字以外を除去
  let normalized = phone.replace(/\D/g, "")

  // 日本の場合、先頭の0を81に置換
  if (normalized.startsWith("0")) {
    normalized = "81" + normalized.slice(1)
  }

  return normalized
}

/**
 * ユーザーデータをハッシュ化
 */
function hashUserData(
  userData: ConversionEventData["userData"]
): Record<string, string> {
  const hashed: Record<string, string> = {}

  if (userData.email) {
    hashed.em = hashValue(userData.email)
  }
  if (userData.phone) {
    hashed.ph = hashValue(normalizePhone(userData.phone))
  }
  if (userData.firstName) {
    hashed.fn = hashValue(userData.firstName)
  }
  if (userData.lastName) {
    hashed.ln = hashValue(userData.lastName)
  }
  if (userData.city) {
    hashed.ct = hashValue(userData.city)
  }
  if (userData.state) {
    hashed.st = hashValue(userData.state)
  }
  if (userData.zipCode) {
    hashed.zp = hashValue(userData.zipCode)
  }
  if (userData.country) {
    hashed.country = hashValue(userData.country)
  }
  if (userData.externalId) {
    hashed.external_id = hashValue(userData.externalId)
  }

  // これらはハッシュ化しない
  if (userData.clientIpAddress) {
    hashed.client_ip_address = userData.clientIpAddress
  }
  if (userData.clientUserAgent) {
    hashed.client_user_agent = userData.clientUserAgent
  }
  if (userData.fbp) {
    hashed.fbp = userData.fbp
  }
  if (userData.fbc) {
    hashed.fbc = userData.fbc
  }

  return hashed
}

/**
 * Conversion APIにイベントを送信
 */
export async function sendConversionEvent(
  pixelId: string,
  accessToken: string,
  event: ConversionEventData
): Promise<ConversionApiResponse> {
  const hashedUserData = hashUserData(event.userData)

  const payload = {
    data: [
      {
        event_name: event.eventName,
        event_time: event.eventTime,
        event_id: event.eventId,
        event_source_url: event.eventSourceUrl,
        action_source: event.actionSource || "website",
        user_data: hashedUserData,
        custom_data: event.customData,
      },
    ],
  }

  const response = await fetch(
    `${CAPI_ENDPOINT}/${pixelId}/events?access_token=${accessToken}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  )

  const result = await response.json()

  if (!response.ok) {
    throw new Error(`CAPI Error: ${JSON.stringify(result.error)}`)
  }

  return result
}

/**
 * 複数イベントをバッチ送信
 */
export async function sendConversionEvents(
  pixelId: string,
  accessToken: string,
  events: ConversionEventData[]
): Promise<ConversionApiResponse> {
  const payload = {
    data: events.map((event) => ({
      event_name: event.eventName,
      event_time: event.eventTime,
      event_id: event.eventId,
      event_source_url: event.eventSourceUrl,
      action_source: event.actionSource || "website",
      user_data: hashUserData(event.userData),
      custom_data: event.customData,
    })),
  }

  const response = await fetch(
    `${CAPI_ENDPOINT}/${pixelId}/events?access_token=${accessToken}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  )

  const result = await response.json()

  if (!response.ok) {
    throw new Error(`CAPI Error: ${JSON.stringify(result.error)}`)
  }

  return result
}

/**
 * テストイベント送信（テストモード用）
 */
export async function sendTestEvent(
  pixelId: string,
  accessToken: string,
  testEventCode: string,
  event: ConversionEventData
): Promise<ConversionApiResponse> {
  const hashedUserData = hashUserData(event.userData)

  const payload = {
    data: [
      {
        event_name: event.eventName,
        event_time: event.eventTime,
        event_id: event.eventId,
        event_source_url: event.eventSourceUrl,
        action_source: event.actionSource || "website",
        user_data: hashedUserData,
        custom_data: event.customData,
      },
    ],
    test_event_code: testEventCode,
  }

  const response = await fetch(
    `${CAPI_ENDPOINT}/${pixelId}/events?access_token=${accessToken}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  )

  const result = await response.json()

  if (!response.ok) {
    throw new Error(`CAPI Error: ${JSON.stringify(result.error)}`)
  }

  return result
}

/**
 * イベントID生成（Pixel側と重複排除用）
 */
export function generateEventId(): string {
  return crypto.randomUUID()
}

/**
 * 現在のUnixタイムスタンプ取得
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000)
}
