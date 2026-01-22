import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { LPRenderer } from "@/components/lp/renderer"
import { TrackingScripts } from "@/components/lp/tracking-scripts"

interface PageProps {
  params: Promise<{
    project: string
    slug: string
  }>
  searchParams: Promise<Record<string, string>>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: lp } = await supabase
    .from("landing_pages")
    .select("meta_tags, name")
    .eq("slug", slug)
    .single()

  if (!lp) {
    return {
      title: "ページが見つかりません",
    }
  }

  const metaTags = lp.meta_tags as Record<string, unknown> | null

  return {
    title: (metaTags?.title as string) || lp.name,
    description: metaTags?.description as string,
    openGraph: metaTags?.og as Record<string, unknown>,
  }
}

export default async function LPPage({ params, searchParams }: PageProps) {
  const { project, slug } = await params
  const utmParams = await searchParams
  const headersList = await headers()
  const variant = headersList.get("x-lp-variant") || "A"

  const supabase = await createClient()

  // LP基本情報取得
  const { data: lp, error: lpError } = await supabase
    .from("landing_pages")
    .select(
      `
      *,
      project:projects(
        id,
        name,
        organization:organizations(
          meta_pixel_id
        )
      )
    `
    )
    .eq("slug", slug)
    .single()

  if (lpError || !lp) {
    // デモ用モックデータ
    return (
      <DemoLP
        variant={variant}
        utmParams={utmParams}
        slug={slug}
        project={project}
      />
    )
  }

  // バリアント情報取得
  const { data: lpVariant } = await supabase
    .from("lp_variants")
    .select("*")
    .eq("landing_page_id", lp.id)
    .eq("variant_code", variant)
    .single()

  // コンテンツをバリアントの修正で上書き
  const content = applyVariantModifications(
    lp.content as Record<string, unknown>,
    lpVariant?.modifications as Record<string, unknown> | null
  )

  // 広告×LP組み合わせIDを取得（トラッキング用）
  const combinationId = await getCombinationId(
    utmParams.utm_content,
    lpVariant?.id
  )

  const pixelId =
    (lp.project as { organization: { meta_pixel_id: string } })?.organization
      ?.meta_pixel_id || process.env.NEXT_PUBLIC_META_PIXEL_ID

  return (
    <>
      <TrackingScripts
        pixelId={pixelId}
        combinationId={combinationId}
        utmParams={utmParams}
        variant={variant}
      />
      <LPRenderer
        content={content}
        conversionType={lp.conversion_type}
        combinationId={combinationId}
        variant={variant}
      />
    </>
  )
}

// デモ用LP
function DemoLP({
  variant,
  utmParams,
  slug,
  project,
}: {
  variant: string
  utmParams: Record<string, string>
  slug: string
  project: string
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <section className="px-4 py-20 text-center">
        <div className="mx-auto max-w-4xl">
          <span className="mb-4 inline-block rounded-full bg-blue-100 px-4 py-1 text-sm font-medium text-blue-800">
            期間限定オファー
          </span>
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
            {variant === "A"
              ? "売上を3倍にする マーケティング自動化"
              : "たった1週間で 広告効果を最大化"}
          </h1>
          <p className="mb-8 text-xl text-gray-600">
            {variant === "A"
              ? "AIが24時間365日、あなたの代わりに広告運用を最適化します"
              : "複雑な設定は一切不要。今すぐ始められる広告自動化ツール"}
          </p>
          <button className="rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-blue-700">
            無料で始める
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold">
            選ばれる3つの理由
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-lg border p-6 text-center">
              <div className="mb-4 text-4xl">🚀</div>
              <h3 className="mb-2 text-xl font-semibold">簡単セットアップ</h3>
              <p className="text-gray-600">
                わずか5分で設定完了。専門知識は一切不要です。
              </p>
            </div>
            <div className="rounded-lg border p-6 text-center">
              <div className="mb-4 text-4xl">📊</div>
              <h3 className="mb-2 text-xl font-semibold">自動最適化</h3>
              <p className="text-gray-600">
                AIが自動でA/Bテストを実行し、最高のパフォーマンスを実現。
              </p>
            </div>
            <div className="rounded-lg border p-6 text-center">
              <div className="mb-4 text-4xl">💰</div>
              <h3 className="mb-2 text-xl font-semibold">コスト削減</h3>
              <p className="text-gray-600">
                無駄な広告費を自動カット。ROASを最大化します。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 px-4 py-16 text-center text-white">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-3xl font-bold">今すぐ無料トライアル</h2>
          <p className="mb-8 text-xl opacity-90">
            14日間無料でお試しいただけます。クレジットカード不要。
          </p>
          <button className="rounded-lg bg-white px-8 py-4 text-lg font-semibold text-blue-600 shadow-lg transition hover:bg-gray-100">
            無料で始める
          </button>
        </div>
      </section>

      {/* Debug Info (開発用) */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-4 right-4 rounded-lg bg-black/80 p-4 text-xs text-white">
          <div>Variant: {variant}</div>
          <div>Project: {project}</div>
          <div>Slug: {slug}</div>
          <div>UTM: {JSON.stringify(utmParams)}</div>
        </div>
      )}
    </div>
  )
}

// バリアント修正を適用
function applyVariantModifications(
  content: Record<string, unknown> | null,
  modifications: Record<string, unknown> | null
): Record<string, unknown> {
  if (!content) return {}
  if (!modifications) return content

  return {
    ...content,
    ...modifications,
  }
}

// 組み合わせID取得
async function getCombinationId(
  utmContent: string | undefined,
  variantId: string | undefined
): Promise<string | null> {
  if (!utmContent || !variantId) return null

  // utm_contentから広告IDを抽出してDBから組み合わせIDを取得
  // 簡易実装: utm_content自体をIDとして使用
  return utmContent
}
