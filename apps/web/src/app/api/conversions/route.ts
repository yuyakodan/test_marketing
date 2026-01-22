import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  sendConversionEvent,
  generateEventId,
  getCurrentTimestamp,
  type EventName,
} from "@/lib/meta/conversion-api"
import crypto from "crypto"

// PII ハッシュ化
function hashValue(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value.toLowerCase().trim())
    .digest("hex")
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      combinationId,
      eventType,
      email,
      phone,
      value,
      currency = "JPY",
      contentIds,
      contentType,
      utmParams,
    } = body

    // イベントID生成（Pixel側と共有して重複排除）
    const eventId = generateEventId()

    // ブラウザ情報取得
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"
    const userAgent = request.headers.get("user-agent") || ""
    const fbp = request.cookies.get("_fbp")?.value
    const fbc = request.cookies.get("_fbc")?.value
    const referer = request.headers.get("referer") || ""

    const supabase = await createClient()

    // 組み合わせ情報取得
    const { data: combination, error: comboError } = await supabase
      .from("ad_lp_combinations")
      .select(
        `
        *,
        ad:ads(
          ad_set:ad_sets(
            campaign:campaigns(
              project:projects(
                organization:organizations(
                  meta_pixel_id
                )
              )
            )
          )
        )
      `
      )
      .eq("id", combinationId)
      .single()

    if (comboError || !combination) {
      // 組み合わせが見つからない場合でも、CVはログに残す
      console.error("Combination not found:", combinationId)
    }

    const pixelId =
      combination?.ad?.ad_set?.campaign?.project?.organization?.meta_pixel_id ||
      process.env.META_PIXEL_ID

    // DB保存
    const { error: insertError } = await supabase.from("conversions").insert({
      combination_id: combinationId || null,
      event_type: eventType,
      event_id: eventId,
      user_email_hash: email ? hashValue(email) : null,
      user_phone_hash: phone ? hashValue(phone) : null,
      client_ip_address: clientIp,
      client_user_agent: userAgent,
      fbp,
      fbc,
      value: value || null,
      currency,
      content_ids: contentIds || null,
      content_type: contentType || null,
      utm_source: utmParams?.utm_source || null,
      utm_medium: utmParams?.utm_medium || null,
      utm_campaign: utmParams?.utm_campaign || null,
      utm_content: utmParams?.utm_content || null,
      utm_term: utmParams?.utm_term || null,
      source: "capi",
      sent_to_meta: false,
    })

    if (insertError) {
      console.error("Failed to save conversion:", insertError)
    }

    // Meta CAPI送信
    if (pixelId && process.env.META_ACCESS_TOKEN) {
      try {
        // イベント名マッピング
        const eventNameMap: Record<string, EventName> = {
          form_submit: "Lead",
          purchase: "Purchase",
          line_registration: "CompleteRegistration",
          view_content: "ViewContent",
          add_to_cart: "AddToCart",
          initiate_checkout: "InitiateCheckout",
        }

        const metaEventName = eventNameMap[eventType] || "Lead"

        await sendConversionEvent(pixelId, process.env.META_ACCESS_TOKEN, {
          eventName: metaEventName,
          eventTime: getCurrentTimestamp(),
          eventId,
          eventSourceUrl: referer,
          userData: {
            email,
            phone,
            clientIpAddress: clientIp,
            clientUserAgent: userAgent,
            fbp,
            fbc,
          },
          customData: {
            value,
            currency,
            contentIds,
            contentType,
          },
        })

        // DB更新（送信済み）
        await supabase
          .from("conversions")
          .update({ sent_to_meta: true, sent_at: new Date().toISOString() })
          .eq("event_id", eventId)
      } catch (capiError) {
        console.error("CAPI send failed:", capiError)
        // CAPIエラーでもリクエストは成功扱い
      }
    }

    return NextResponse.json({ success: true, eventId })
  } catch (error) {
    console.error("Conversion tracking error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
