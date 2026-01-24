"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Creative {
  id: string
  name: string
  type: "image" | "video"
  imageUrl: string
  headline: string
  description: string
  status: "active" | "paused" | "archived"
  metrics: {
    impressions: number
    clicks: number
    ctr: number
    spend: number
  }
  createdAt: string
}

// モックデータ
const mockCreatives: Creative[] = [
  {
    id: "1",
    name: "バナーA - 期間限定訴求",
    type: "image",
    imageUrl: "/placeholder-banner.png",
    headline: "今だけ50%OFF",
    description: "期間限定キャンペーン実施中！お見逃しなく",
    status: "active",
    metrics: {
      impressions: 125000,
      clicks: 3750,
      ctr: 3.0,
      spend: 45000,
    },
    createdAt: "2025-01-20",
  },
  {
    id: "2",
    name: "バナーB - 機能訴求",
    type: "image",
    imageUrl: "/placeholder-banner.png",
    headline: "業界No.1の実績",
    description: "導入企業3000社突破。選ばれる理由があります",
    status: "active",
    metrics: {
      impressions: 98000,
      clicks: 2450,
      ctr: 2.5,
      spend: 38000,
    },
    createdAt: "2025-01-18",
  },
  {
    id: "3",
    name: "バナーC - 課題解決訴求",
    type: "image",
    imageUrl: "/placeholder-banner.png",
    headline: "その悩み、解決します",
    description: "面倒な作業を自動化。時間を有効活用",
    status: "paused",
    metrics: {
      impressions: 45000,
      clicks: 900,
      ctr: 2.0,
      spend: 18000,
    },
    createdAt: "2025-01-15",
  },
]

export default function CreativesPage() {
  const [creatives] = useState<Creative[]>(mockCreatives)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState<"all" | "active" | "paused" | "archived">("all")

  const filteredCreatives = creatives.filter(
    (c) => filter === "all" || c.status === filter
  )

  const totalImpressions = creatives.reduce((sum, c) => sum + c.metrics.impressions, 0)
  const totalClicks = creatives.reduce((sum, c) => sum + c.metrics.clicks, 0)
  const avgCTR = totalClicks / totalImpressions * 100
  const totalSpend = creatives.reduce((sum, c) => sum + c.metrics.spend, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">クリエイティブ管理</h1>
          <p className="text-gray-500">バナー広告の作成・管理</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          + 新規クリエイティブ
        </Button>
      </div>

      {/* サマリーカード */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              総インプレッション
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalImpressions.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              総クリック数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalClicks.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              平均CTR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCTR.toFixed(2)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              総消化金額
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{totalSpend.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* フィルター */}
      <div className="flex gap-2">
        {(["all", "active", "paused", "archived"] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status === "all" && "すべて"}
            {status === "active" && "配信中"}
            {status === "paused" && "停止中"}
            {status === "archived" && "アーカイブ"}
          </Button>
        ))}
      </div>

      {/* クリエイティブ一覧 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCreatives.map((creative) => (
          <Card key={creative.id} className="overflow-hidden">
            <div className="aspect-video bg-gray-100 flex items-center justify-center">
              <div className="text-gray-400 text-sm">
                バナープレビュー
                <br />
                1200 x 628
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold">{creative.name}</h3>
                  <p className="text-sm text-gray-500">{creative.headline}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    creative.status === "active"
                      ? "bg-green-100 text-green-800"
                      : creative.status === "paused"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {creative.status === "active" && "配信中"}
                  {creative.status === "paused" && "停止中"}
                  {creative.status === "archived" && "アーカイブ"}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {creative.description}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Imp:</span>{" "}
                  {creative.metrics.impressions.toLocaleString()}
                </div>
                <div>
                  <span className="text-gray-500">Click:</span>{" "}
                  {creative.metrics.clicks.toLocaleString()}
                </div>
                <div>
                  <span className="text-gray-500">CTR:</span>{" "}
                  {creative.metrics.ctr.toFixed(2)}%
                </div>
                <div>
                  <span className="text-gray-500">費用:</span>{" "}
                  ¥{creative.metrics.spend.toLocaleString()}
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  編集
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  複製
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 新規作成モーダル */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>新規クリエイティブ作成</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">クリエイティブ名</Label>
                <Input id="name" placeholder="バナーA - 期間限定訴求" />
              </div>

              <div className="space-y-2">
                <Label>バナー画像</Label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <div className="text-gray-500">
                    <p>画像をドラッグ＆ドロップ</p>
                    <p className="text-sm">または</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      ファイルを選択
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    推奨サイズ: 1200 x 628px (1.91:1)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="headline">見出し</Label>
                <Input id="headline" placeholder="今だけ50%OFF" maxLength={40} />
                <p className="text-xs text-gray-500">最大40文字</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">説明文</Label>
                <textarea
                  id="description"
                  className="w-full rounded-lg border px-4 py-2 min-h-[100px]"
                  placeholder="期間限定キャンペーン実施中！お見逃しなく"
                  maxLength={125}
                />
                <p className="text-xs text-gray-500">最大125文字</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cta">CTAボタン</Label>
                <select
                  id="cta"
                  className="w-full rounded-lg border px-4 py-2"
                >
                  <option value="LEARN_MORE">詳しくはこちら</option>
                  <option value="SIGN_UP">登録する</option>
                  <option value="SHOP_NOW">今すぐ購入</option>
                  <option value="CONTACT_US">お問い合わせ</option>
                  <option value="GET_QUOTE">見積もりを取る</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  キャンセル
                </Button>
                <Button onClick={() => setShowCreateModal(false)}>
                  作成
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
