import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "キャンペーン",
}
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Play, Pause, MoreHorizontal } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

// ステータスバッジのスタイル
const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
}

// モックデータ（Supabase連携後に削除）
const mockCampaigns = [
  {
    id: "1",
    name: "サマーセール2024",
    status: "active",
    objective: "OUTCOME_SALES",
    daily_budget: 10000,
    start_date: "2024-07-01",
    metrics: {
      impressions: 45000,
      clicks: 1200,
      conversions: 45,
      spend: 28000,
      ctr: 0.0267,
      cpa: 622,
    },
  },
  {
    id: "2",
    name: "新製品ローンチ",
    status: "paused",
    objective: "OUTCOME_LEADS",
    daily_budget: 5000,
    start_date: "2024-06-15",
    metrics: {
      impressions: 32000,
      clicks: 890,
      conversions: 67,
      spend: 15000,
      ctr: 0.0278,
      cpa: 224,
    },
  },
  {
    id: "3",
    name: "リターゲティング",
    status: "draft",
    objective: "OUTCOME_SALES",
    daily_budget: 3000,
    start_date: null,
    metrics: null,
  },
]

export default async function CampaignsPage() {
  // Supabase連携後に有効化
  // const supabase = await createClient()
  // const { data: campaigns } = await supabase
  //   .from("campaigns")
  //   .select("*")
  //   .order("created_at", { ascending: false })

  const campaigns = mockCampaigns

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">キャンペーン</h2>
          <p className="text-muted-foreground">
            広告キャンペーンの作成と管理
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規キャンペーン
          </Button>
        </Link>
      </div>

      {/* キャンペーン一覧 */}
      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-4">
                <CardTitle className="text-lg font-medium">
                  {campaign.name}
                </CardTitle>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    statusStyles[campaign.status] || statusStyles.draft
                  }`}
                >
                  {campaign.status === "active"
                    ? "配信中"
                    : campaign.status === "paused"
                    ? "一時停止"
                    : campaign.status === "completed"
                    ? "完了"
                    : "下書き"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {campaign.status === "active" ? (
                  <Button variant="outline" size="sm">
                    <Pause className="mr-1 h-4 w-4" />
                    停止
                  </Button>
                ) : campaign.status === "paused" ? (
                  <Button variant="outline" size="sm">
                    <Play className="mr-1 h-4 w-4" />
                    再開
                  </Button>
                ) : null}
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  日予算: {formatCurrency(campaign.daily_budget)}
                  {campaign.start_date && ` | 開始: ${campaign.start_date}`}
                </div>
                {campaign.metrics && (
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">インプレッション: </span>
                      <span className="font-medium">
                        {campaign.metrics.impressions.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">クリック: </span>
                      <span className="font-medium">
                        {campaign.metrics.clicks.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">CV: </span>
                      <span className="font-medium">
                        {campaign.metrics.conversions}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">CPA: </span>
                      <span className="font-medium">
                        {formatCurrency(campaign.metrics.cpa)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">費用: </span>
                      <span className="font-medium">
                        {formatCurrency(campaign.metrics.spend)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {campaigns.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              キャンペーンがありません
            </p>
            <Link href="/campaigns/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                最初のキャンペーンを作成
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
