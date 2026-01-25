import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "ランディングページ",
}
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, ExternalLink, Copy, MoreHorizontal, Eye } from "lucide-react"
import { formatPercent } from "@/lib/utils"

// ステータスバッジのスタイル
const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
}

// モックデータ
const mockLandingPages = [
  {
    id: "1",
    name: "サマーセールLP - 価格訴求",
    slug: "summer-sale-price",
    status: "active",
    appeal_type: "価格訴求",
    structure_type: "問題提起型",
    conversion_type: "form_submit",
    variants: [
      { code: "A", traffic_weight: 50, cvr: 0.045, is_control: true },
      { code: "B", traffic_weight: 50, cvr: 0.052, is_control: false },
    ],
    total_views: 12500,
    total_conversions: 580,
  },
  {
    id: "2",
    name: "新製品LP - ベネフィット訴求",
    slug: "new-product-benefit",
    status: "active",
    appeal_type: "ベネフィット訴求",
    structure_type: "ストーリー型",
    conversion_type: "line_registration",
    variants: [
      { code: "A", traffic_weight: 100, cvr: 0.038, is_control: true },
    ],
    total_views: 8200,
    total_conversions: 312,
  },
  {
    id: "3",
    name: "限定オファーLP",
    slug: "limited-offer",
    status: "draft",
    appeal_type: "緊急性訴求",
    structure_type: "ダイレクト型",
    conversion_type: "purchase",
    variants: [],
    total_views: 0,
    total_conversions: 0,
  },
]

export default async function LandingPagesPage() {
  const landingPages = mockLandingPages

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">ランディングページ</h2>
          <p className="text-muted-foreground">
            LPの作成とA/Bテスト管理
          </p>
        </div>
        <Link href="/landing-pages/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規LP
          </Button>
        </Link>
      </div>

      {/* LP一覧 */}
      <div className="grid gap-4">
        {landingPages.map((lp) => (
          <Card key={lp.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-4">
                <CardTitle className="text-lg font-medium">{lp.name}</CardTitle>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    statusStyles[lp.status] || statusStyles.draft
                  }`}
                >
                  {lp.status === "active"
                    ? "公開中"
                    : lp.status === "paused"
                    ? "一時停止"
                    : "下書き"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="mr-1 h-4 w-4" />
                  プレビュー
                </Button>
                <Button variant="outline" size="sm">
                  <Copy className="mr-1 h-4 w-4" />
                  複製
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* LP情報 */}
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">URL: </span>
                    <code className="rounded bg-gray-100 px-2 py-1 text-xs">
                      /lp/{lp.slug}
                    </code>
                  </div>
                  <div>
                    <span className="text-muted-foreground">訴求: </span>
                    <span>{lp.appeal_type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">構成: </span>
                    <span>{lp.structure_type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CV: </span>
                    <span>
                      {lp.conversion_type === "form_submit"
                        ? "フォーム送信"
                        : lp.conversion_type === "purchase"
                        ? "商品購入"
                        : "LINE登録"}
                    </span>
                  </div>
                </div>

                {/* バリアント一覧 */}
                {lp.variants.length > 0 && (
                  <div className="rounded-lg border">
                    <div className="grid grid-cols-4 gap-4 border-b bg-gray-50 p-3 text-sm font-medium">
                      <div>バリアント</div>
                      <div>トラフィック</div>
                      <div>CVR</div>
                      <div>ステータス</div>
                    </div>
                    {lp.variants.map((variant) => (
                      <div
                        key={variant.code}
                        className="grid grid-cols-4 gap-4 p-3 text-sm"
                      >
                        <div className="font-medium">
                          {variant.code}
                          {variant.is_control && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (コントロール)
                            </span>
                          )}
                        </div>
                        <div>{variant.traffic_weight}%</div>
                        <div className="font-medium">
                          {formatPercent(variant.cvr)}
                        </div>
                        <div>
                          {variant.cvr > (lp.variants[0]?.cvr || 0) &&
                          !variant.is_control ? (
                            <span className="text-green-600">勝ち</span>
                          ) : variant.is_control ? (
                            <span className="text-gray-500">基準</span>
                          ) : (
                            <span className="text-red-600">負け</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 統計 */}
                {lp.total_views > 0 && (
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">総PV: </span>
                      <span className="font-medium">
                        {lp.total_views.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">総CV: </span>
                      <span className="font-medium">
                        {lp.total_conversions.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">平均CVR: </span>
                      <span className="font-medium">
                        {formatPercent(lp.total_conversions / lp.total_views)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {landingPages.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              ランディングページがありません
            </p>
            <Link href="/landing-pages/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                最初のLPを作成
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
