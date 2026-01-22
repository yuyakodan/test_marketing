"use client"

import Script from "next/script"
import { useEffect } from "react"

interface TrackingScriptsProps {
  pixelId?: string | null
  combinationId?: string | null
  utmParams?: Record<string, string>
  variant?: string
}

export function TrackingScripts({
  pixelId,
  combinationId,
  utmParams,
  variant,
}: TrackingScriptsProps) {
  // UTMパラメータとバリアント情報をローカルストレージに保存
  useEffect(() => {
    if (typeof window !== "undefined") {
      const trackingData = {
        combinationId,
        variant,
        utm_source: utmParams?.utm_source,
        utm_medium: utmParams?.utm_medium,
        utm_campaign: utmParams?.utm_campaign,
        utm_content: utmParams?.utm_content,
        utm_term: utmParams?.utm_term,
        landing_time: new Date().toISOString(),
      }
      localStorage.setItem("lp_tracking", JSON.stringify(trackingData))
    }
  }, [combinationId, variant, utmParams])

  if (!pixelId) return null

  return (
    <>
      {/* Meta Pixel Base Code */}
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  )
}

// CV送信用のヘルパー関数（クライアントサイドで使用）
export function trackConversion(
  eventType: string,
  data?: Record<string, unknown>
) {
  // Pixel経由でトラック
  if (typeof window !== "undefined" && (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq) {
    const eventNameMap: Record<string, string> = {
      form_submit: "Lead",
      purchase: "Purchase",
      line_registration: "CompleteRegistration",
      view_content: "ViewContent",
      add_to_cart: "AddToCart",
    }
    const pixelEventName = eventNameMap[eventType] || "Lead"
    ;(window as unknown as { fbq: (...args: unknown[]) => void }).fbq("track", pixelEventName, data)
  }

  // サーバーサイドCAPI経由でも送信
  const trackingData = JSON.parse(
    localStorage.getItem("lp_tracking") || "{}"
  )

  return fetch("/api/conversions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      combinationId: trackingData.combinationId,
      eventType,
      utmParams: {
        utm_source: trackingData.utm_source,
        utm_medium: trackingData.utm_medium,
        utm_campaign: trackingData.utm_campaign,
        utm_content: trackingData.utm_content,
        utm_term: trackingData.utm_term,
      },
      ...data,
    }),
  })
}
