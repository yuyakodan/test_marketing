"use client"

import { useState } from "react"
import { trackConversion } from "./tracking-scripts"

interface LPRendererProps {
  content: Record<string, unknown>
  conversionType: string
  combinationId?: string | null
  variant?: string
}

export function LPRenderer({
  content,
  conversionType,
  combinationId,
  variant,
}: LPRendererProps) {
  // コンテンツが空の場合はデフォルトレンダリング
  if (!content || Object.keys(content).length === 0) {
    return <DefaultLP conversionType={conversionType} />
  }

  // セクション単位でレンダリング
  const sections = (content.sections as Array<Record<string, unknown>>) || []

  return (
    <div className="min-h-screen">
      {sections.map((section, index) => (
        <Section key={index} section={section} conversionType={conversionType} />
      ))}
    </div>
  )
}

// セクションコンポーネント
function Section({
  section,
  conversionType,
}: {
  section: Record<string, unknown>
  conversionType: string
}) {
  const type = section.type as string

  switch (type) {
    case "hero":
      return <HeroSection section={section} />
    case "features":
      return <FeaturesSection section={section} />
    case "testimonials":
      return <TestimonialsSection section={section} />
    case "pricing":
      return <PricingSection section={section} />
    case "faq":
      return <FAQSection section={section} />
    case "cta":
      return <CTASection section={section} conversionType={conversionType} />
    case "form":
      return <FormSection section={section} conversionType={conversionType} />
    default:
      return null
  }
}

// Hero Section
function HeroSection({ section }: { section: Record<string, unknown> }) {
  const badge = section.badge as string | undefined
  const headline = section.headline as string
  const subheadline = section.subheadline as string
  const ctaText = section.ctaText as string | undefined
  const bgColor = (section.bgColor as string) || "#f0f9ff"

  return (
    <section
      className="px-4 py-20 text-center"
      style={{ backgroundColor: bgColor }}
    >
      <div className="mx-auto max-w-4xl">
        {badge ? (
          <span className="mb-4 inline-block rounded-full bg-blue-100 px-4 py-1 text-sm font-medium text-blue-800">
            {badge}
          </span>
        ) : null}
        <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
          {headline}
        </h1>
        <p className="mb-8 text-xl text-gray-600">
          {subheadline}
        </p>
        {ctaText ? (
          <button className="rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-blue-700">
            {ctaText}
          </button>
        ) : null}
      </div>
    </section>
  )
}

// Features Section
function FeaturesSection({ section }: { section: Record<string, unknown> }) {
  const features = (section.items as Array<Record<string, unknown>>) || []

  return (
    <section className="bg-white px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 text-center text-3xl font-bold">
          {section.title as string}
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature, index) => (
            <div key={index} className="rounded-lg border p-6 text-center">
              <div className="mb-4 text-4xl">{feature.icon as string}</div>
              <h3 className="mb-2 text-xl font-semibold">
                {feature.title as string}
              </h3>
              <p className="text-gray-600">{feature.description as string}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Testimonials Section
function TestimonialsSection({ section }: { section: Record<string, unknown> }) {
  const testimonials =
    (section.items as Array<Record<string, unknown>>) || []

  return (
    <section className="bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 text-center text-3xl font-bold">
          {(section.title as string) || "お客様の声"}
        </h2>
        <div className="grid gap-8 md:grid-cols-2">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="rounded-lg bg-white p-6 shadow">
              <p className="mb-4 text-gray-600">
                &quot;{testimonial.content as string}&quot;
              </p>
              <div className="font-semibold">{testimonial.name as string}</div>
              <div className="text-sm text-gray-500">
                {testimonial.title as string}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Pricing Section
function PricingSection({ section }: { section: Record<string, unknown> }) {
  const plans = (section.plans as Array<Record<string, unknown>>) || []

  return (
    <section className="bg-white px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 text-center text-3xl font-bold">
          {(section.title as string) || "料金プラン"}
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`rounded-lg border p-6 ${
                plan.featured ? "border-blue-500 shadow-lg" : ""
              }`}
            >
              <h3 className="mb-2 text-xl font-semibold">
                {plan.name as string}
              </h3>
              <div className="mb-4 text-3xl font-bold">
                {plan.price as string}
              </div>
              <ul className="mb-6 space-y-2">
                {((plan.features as string[]) || []).map((feature, i) => (
                  <li key={i} className="flex items-center">
                    <span className="mr-2 text-green-500">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className={`w-full rounded-lg py-2 font-semibold ${
                  plan.featured
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {(plan.ctaText as string) || "選択する"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// FAQ Section
function FAQSection({ section }: { section: Record<string, unknown> }) {
  const faqs = (section.items as Array<Record<string, unknown>>) || []

  return (
    <section className="bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-12 text-center text-3xl font-bold">
          {(section.title as string) || "よくある質問"}
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="rounded-lg bg-white p-4 shadow">
              <h3 className="mb-2 font-semibold">{faq.question as string}</h3>
              <p className="text-gray-600">{faq.answer as string}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// CTA Section
function CTASection({
  section,
  conversionType,
}: {
  section: Record<string, unknown>
  conversionType: string
}) {
  return (
    <section
      className="px-4 py-16 text-center text-white"
      style={{ backgroundColor: (section.bgColor as string) || "#2563eb" }}
    >
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-4 text-3xl font-bold">{section.headline as string}</h2>
        <p className="mb-8 text-xl opacity-90">
          {section.subheadline as string}
        </p>
        <button
          onClick={() => trackConversion(conversionType)}
          className="rounded-lg bg-white px-8 py-4 text-lg font-semibold text-blue-600 shadow-lg transition hover:bg-gray-100"
        >
          {(section.ctaText as string) || "今すぐ始める"}
        </button>
      </div>
    </section>
  )
}

// Form Section
function FormSection({
  section,
  conversionType,
}: {
  section: Record<string, unknown>
  conversionType: string
}) {
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const fields = (section.fields as Array<Record<string, unknown>>) || [
    { name: "name", label: "お名前", type: "text", required: true },
    { name: "email", label: "メールアドレス", type: "email", required: true },
    { name: "phone", label: "電話番号", type: "tel", required: false },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      await trackConversion("form_submit", {
        email: formData.email,
        phone: formData.phone,
      })
      setSubmitted(true)
    } catch (error) {
      console.error("Form submission error:", error)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <section className="bg-white px-4 py-16">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-4 text-5xl">✓</div>
          <h2 className="mb-2 text-2xl font-bold">
            {(section.successTitle as string) || "送信完了"}
          </h2>
          <p className="text-gray-600">
            {(section.successMessage as string) ||
              "お問い合わせありがとうございます。担当者より連絡いたします。"}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white px-4 py-16">
      <div className="mx-auto max-w-md">
        <h2 className="mb-8 text-center text-2xl font-bold">
          {(section.title as string) || "お問い合わせ"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => {
            const fieldName = field.name as string
            const fieldLabel = field.label as string
            const fieldType = field.type as string
            const fieldRequired = field.required as boolean
            return (
              <div key={fieldName}>
                <label className="mb-1 block text-sm font-medium">
                  {fieldLabel}
                  {fieldRequired ? <span className="text-red-500">*</span> : null}
                </label>
                <input
                  type={fieldType}
                  name={fieldName}
                  required={fieldRequired}
                  value={formData[fieldName] || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, [fieldName]: e.target.value })
                  }
                  className="w-full rounded-lg border px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
            )
          })}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting
              ? "送信中..."
              : (section.submitText as string) || "送信する"}
          </button>
        </form>
      </div>
    </section>
  )
}

// デフォルトLP
function DefaultLP({ conversionType }: { conversionType: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <HeroSection
        section={{
          badge: "期間限定",
          headline: "あなたのビジネスを加速する",
          subheadline:
            "最新のマーケティングツールで、効率的に顧客を獲得しましょう",
          ctaText: "今すぐ始める",
        }}
      />
      <FeaturesSection
        section={{
          title: "選ばれる理由",
          items: [
            {
              icon: "🚀",
              title: "簡単導入",
              description: "わずか5分で設定完了",
            },
            {
              icon: "📊",
              title: "データ分析",
              description: "リアルタイムで効果を可視化",
            },
            {
              icon: "💰",
              title: "コスト削減",
              description: "無駄な広告費を自動カット",
            },
          ],
        }}
      />
      <FormSection
        section={{
          title: "無料相談のお申し込み",
          submitText: "無料で相談する",
        }}
        conversionType={conversionType}
      />
    </div>
  )
}
