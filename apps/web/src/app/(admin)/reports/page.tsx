"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// モックデータ - 日別パフォーマンス
const dailyData = [
  { date: "01/15", impressions: 15000, clicks: 450, conversions: 12, spend: 8500, ctr: 3.0, cvr: 2.67, cpa: 708 },
  { date: "01/16", impressions: 18000, clicks: 540, conversions: 15, spend: 9200, ctr: 3.0, cvr: 2.78, cpa: 613 },
  { date: "01/17", impressions: 22000, clicks: 660, conversions: 18, spend: 11000, ctr: 3.0, cvr: 2.73, cpa: 611 },
  { date: "01/18", impressions: 19000, clicks: 570, conversions: 14, spend: 9800, ctr: 3.0, cvr: 2.46, cpa: 700 },
  { date: "01/19", impressions: 25000, clicks: 750, conversions: 22, spend: 12500, ctr: 3.0, cvr: 2.93, cpa: 568 },
  { date: "01/20", impressions: 28000, clicks: 840, conversions: 25, spend: 14000, ctr: 3.0, cvr: 2.98, cpa: 560 },
  { date: "01/21", impressions: 30000, clicks: 900, conversions: 28, spend: 15000, ctr: 3.0, cvr: 3.11, cpa: 536 },
]

// 広告×LP組み合わせパフォーマンス
const combinationData = [
  { ad: "バナーA", lp: "LP-A", impressions: 45000, clicks: 1350, conversions: 42, cvr: 3.11, cpa: 520, status: "winner" },
  { ad: "バナーA", lp: "LP-B", impressions: 38000, clicks: 1140, conversions: 28, cvr: 2.46, cpa: 680, status: "testing" },
  { ad: "バナーB", lp: "LP-A", impressions: 42000, clicks: 1050, conversions: 25, cvr: 2.38, cpa: 720, status: "testing" },
  { ad: "バナーB", lp: "LP-B", impressions: 32000, clicks: 800, conversions: 15, cvr: 1.88, cpa: 890, status: "loser" },
]

// CVファネル
const funnelData = [
  { stage: "インプレッション", value: 157000, rate: 100 },
  { stage: "クリック", value: 4340, rate: 2.76 },
  { stage: "LP閲覧", value: 3906, rate: 90 },
  { stage: "フォーム開始", value: 586, rate: 15 },
  { stage: "コンバージョン", value: 110, rate: 18.8 },
]

type DateRange = "7d" | "14d" | "30d" | "custom"

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("7d")
  const [selectedMetric, setSelectedMetric] = useState<"impressions" | "clicks" | "conversions" | "spend">("conversions")

  // サマリー計算
  const totals = dailyData.reduce(
    (acc, day) => ({
      impressions: acc.impressions + day.impressions,
      clicks: acc.clicks + day.clicks,
      conversions: acc.conversions + day.conversions,
      spend: acc.spend + day.spend,
    }),
    { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
  )

  const avgCTR = (totals.clicks / totals.impressions) * 100
  const avgCVR = (totals.conversions / totals.clicks) * 100
  const avgCPA = totals.spend / totals.conversions

  // 簡易チャート（バー）
  const maxValue = Math.max(...dailyData.map((d) => d[selectedMetric]))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">レポート</h1>
          <p className="text-gray-500">キャンペーンパフォーマンス分析</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            CSVエクスポート
          </Button>
          <Button variant="outline">
            PDFレポート
          </Button>
        </div>
      </div>

      {/* 期間選択 */}
      <div className="flex gap-2">
        {(["7d", "14d", "30d", "custom"] as const).map((range) => (
          <Button
            key={range}
            variant={dateRange === range ? "default" : "outline"}
            size="sm"
            onClick={() => setDateRange(range)}
          >
            {range === "7d" && "過去7日"}
            {range === "14d" && "過去14日"}
            {range === "30d" && "過去30日"}
            {range === "custom" && "カスタム"}
          </Button>
        ))}
      </div>

      {/* KPIサマリー */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              インプレッション
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.impressions.toLocaleString()}</div>
            <p className="text-xs text-green-600">+12.5% vs 前週</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              クリック数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.clicks.toLocaleString()}</div>
            <p className="text-xs text-green-600">+8.3% vs 前週</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              CTR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCTR.toFixed(2)}%</div>
            <p className="text-xs text-gray-500">業界平均: 2.5%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              コンバージョン
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.conversions}</div>
            <p className="text-xs text-green-600">+15.2% vs 前週</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              CVR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCVR.toFixed(2)}%</div>
            <p className="text-xs text-green-600">+0.3pt vs 前週</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              CPA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{Math.round(avgCPA).toLocaleString()}</div>
            <p className="text-xs text-green-600">-8.5% vs 前週</p>
          </CardContent>
        </Card>
      </div>

      {/* 日別推移チャート */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>日別推移</CardTitle>
            <div className="flex gap-2">
              {(["impressions", "clicks", "conversions", "spend"] as const).map((metric) => (
                <Button
                  key={metric}
                  variant={selectedMetric === metric ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedMetric(metric)}
                >
                  {metric === "impressions" && "Imp"}
                  {metric === "clicks" && "Click"}
                  {metric === "conversions" && "CV"}
                  {metric === "spend" && "費用"}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end gap-2">
            {dailyData.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-blue-500 rounded-t transition-all"
                  style={{
                    height: `${(day[selectedMetric] / maxValue) * 200}px`,
                  }}
                />
                <span className="text-xs text-gray-500">{day.date}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 広告×LP組み合わせ */}
        <Card>
          <CardHeader>
            <CardTitle>広告×LP 組み合わせパフォーマンス</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">組み合わせ</th>
                    <th className="text-right py-2">CVR</th>
                    <th className="text-right py-2">CPA</th>
                    <th className="text-right py-2">状態</th>
                  </tr>
                </thead>
                <tbody>
                  {combinationData.map((combo, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2">
                        <div className="font-medium">{combo.ad}</div>
                        <div className="text-gray-500 text-xs">{combo.lp}</div>
                      </td>
                      <td className="text-right py-2">{combo.cvr.toFixed(2)}%</td>
                      <td className="text-right py-2">¥{combo.cpa.toLocaleString()}</td>
                      <td className="text-right py-2">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            combo.status === "winner"
                              ? "bg-green-100 text-green-800"
                              : combo.status === "loser"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {combo.status === "winner" && "勝ち"}
                          {combo.status === "loser" && "負け"}
                          {combo.status === "testing" && "テスト中"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* CVファネル */}
        <Card>
          <CardHeader>
            <CardTitle>コンバージョンファネル</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {funnelData.map((stage, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{stage.stage}</span>
                    <span className="font-medium">{stage.value.toLocaleString()}</span>
                  </div>
                  <div className="h-8 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-blue-500 flex items-center justify-end pr-2"
                      style={{ width: `${stage.rate}%` }}
                    >
                      {stage.rate > 10 && (
                        <span className="text-xs text-white font-medium">
                          {stage.rate.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 統計的有意性 */}
      <Card>
        <CardHeader>
          <CardTitle>A/Bテスト 統計的有意性</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">テスト名</th>
                  <th className="text-right py-2">バリアントA</th>
                  <th className="text-right py-2">バリアントB</th>
                  <th className="text-right py-2">改善率</th>
                  <th className="text-right py-2">信頼度</th>
                  <th className="text-right py-2">判定</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3">
                    <div className="font-medium">LP-A vs LP-B</div>
                    <div className="text-gray-500 text-xs">期間限定訴求</div>
                  </td>
                  <td className="text-right py-3">
                    <div>CVR: 3.11%</div>
                    <div className="text-xs text-gray-500">n=1,350</div>
                  </td>
                  <td className="text-right py-3">
                    <div>CVR: 2.46%</div>
                    <div className="text-xs text-gray-500">n=1,140</div>
                  </td>
                  <td className="text-right py-3 text-green-600 font-medium">+26.4%</td>
                  <td className="text-right py-3">
                    <div className="font-medium">96.8%</div>
                  </td>
                  <td className="text-right py-3">
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                      有意
                    </span>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3">
                    <div className="font-medium">バナーA vs バナーB</div>
                    <div className="text-gray-500 text-xs">CTR比較</div>
                  </td>
                  <td className="text-right py-3">
                    <div>CTR: 3.0%</div>
                    <div className="text-xs text-gray-500">n=83,000</div>
                  </td>
                  <td className="text-right py-3">
                    <div>CTR: 2.5%</div>
                    <div className="text-xs text-gray-500">n=74,000</div>
                  </td>
                  <td className="text-right py-3 text-green-600 font-medium">+20.0%</td>
                  <td className="text-right py-3">
                    <div className="font-medium">99.9%</div>
                  </td>
                  <td className="text-right py-3">
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                      有意
                    </span>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3">
                    <div className="font-medium">CTA色テスト</div>
                    <div className="text-gray-500 text-xs">青 vs 緑</div>
                  </td>
                  <td className="text-right py-3">
                    <div>CVR: 2.8%</div>
                    <div className="text-xs text-gray-500">n=520</div>
                  </td>
                  <td className="text-right py-3">
                    <div>CVR: 2.6%</div>
                    <div className="text-xs text-gray-500">n=480</div>
                  </td>
                  <td className="text-right py-3 text-gray-600">+7.7%</td>
                  <td className="text-right py-3">
                    <div className="font-medium">68.2%</div>
                  </td>
                  <td className="text-right py-3">
                    <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                      データ不足
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            ※ 信頼度95%以上で統計的に有意と判定。最低サンプルサイズ: 100クリック
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
