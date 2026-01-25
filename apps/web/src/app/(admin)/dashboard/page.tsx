"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils"
import { TrendingUp, TrendingDown, DollarSign, Users, MousePointer, Target, RefreshCw, AlertTriangle, Database, WifiOff } from "lucide-react"

// エラーコード定義（APIと同期）
const ERROR_CODES = {
  SUPABASE_NOT_CONFIGURED: 'SUPABASE_NOT_CONFIGURED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const

type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]

interface ErrorInfo {
  code: ErrorCode
  message: string
  icon: typeof AlertTriangle
}

// エラー情報マッピング
const getErrorInfo = (errorCode: ErrorCode | null, errorMessage: string): ErrorInfo => {
  switch (errorCode) {
    case ERROR_CODES.SUPABASE_NOT_CONFIGURED:
      return {
        code: errorCode,
        message: 'データベースに接続されていません。Supabaseの設定を確認してください。',
        icon: Database,
      }
    case ERROR_CODES.DATABASE_ERROR:
      return {
        code: errorCode,
        message: 'データベースエラーが発生しました。しばらく経ってから再度お試しください。',
        icon: AlertTriangle,
      }
    case ERROR_CODES.NETWORK_ERROR:
      return {
        code: errorCode,
        message: 'ネットワークエラーが発生しました。接続を確認してください。',
        icon: WifiOff,
      }
    default:
      return {
        code: ERROR_CODES.UNKNOWN_ERROR,
        message: errorMessage || '予期しないエラーが発生しました。',
        icon: AlertTriangle,
      }
  }
}

interface DashboardData {
  summary: {
    impressions: number
    clicks: number
    conversions: number
    spend: number
    ctr: number
    cvr: number
    cpa: number
    activeCampaigns: number
    activeCombinations: number
  }
  daily: Array<{
    date: string
    impressions: number
    clicks: number
    conversions: number
    spend: number
    ctr: number
    cvr: number
  }>
  recentLogs: Array<{
    id: string
    action_type: string
    target_type: string
    reason: string
    created_at: string
  }>
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null)
  const [dateRange, setDateRange] = useState<7 | 14 | 30>(7)

  const fetchData = async () => {
    setLoading(true)
    setErrorInfo(null)
    try {
      const response = await fetch(`/api/dashboard?days=${dateRange}`)
      const result = await response.json()
      if (result.success) {
        setData(result.data)
      } else {
        // APIからのエラーコードに基づいてエラー情報を設定
        setErrorInfo(getErrorInfo(result.errorCode, result.error))
      }
    } catch (err) {
      // ネットワークエラーなどのfetch自体の失敗
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setErrorInfo(getErrorInfo(ERROR_CODES.NETWORK_ERROR, ''))
      } else {
        setErrorInfo(getErrorInfo(null, err instanceof Error ? err.message : 'データの取得に失敗しました'))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [dateRange])

  const summary = data?.summary || {
    impressions: 0,
    clicks: 0,
    conversions: 0,
    spend: 0,
    ctr: 0,
    cvr: 0,
    cpa: 0,
    activeCampaigns: 0,
    activeCombinations: 0,
  }

  const stats = [
    {
      title: "総インプレッション",
      value: summary.impressions,
      icon: Users,
      format: "number" as const,
    },
    {
      title: "クリック数",
      value: summary.clicks,
      icon: MousePointer,
      format: "number" as const,
    },
    {
      title: "コンバージョン",
      value: summary.conversions,
      icon: Target,
      format: "number" as const,
    },
    {
      title: "広告費",
      value: summary.spend,
      icon: DollarSign,
      format: "currency" as const,
    },
  ]

  const metrics = [
    { label: "CTR", value: summary.ctr / 100, format: "percent" as const },
    { label: "CVR", value: summary.cvr / 100, format: "percent" as const },
    { label: "CPC", value: summary.clicks > 0 ? summary.spend / summary.clicks : 0, format: "currency" as const },
    { label: "CPA", value: summary.cpa, format: "currency" as const },
    { label: "アクティブキャンペーン", value: summary.activeCampaigns, format: "number" as const },
  ]

  // 簡易バーチャート用の最大値
  const maxConversions = Math.max(...(data?.daily || []).map(d => d.conversions), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">ダッシュボード</h2>
          <p className="text-muted-foreground">
            キャンペーンのパフォーマンス概要
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {([7, 14, 30] as const).map((days) => (
              <Button
                key={days}
                variant={dateRange === days ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange(days)}
              >
                {days}日
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {errorInfo && (
        <div className="rounded-md bg-red-500 p-4 text-sm text-white flex items-center gap-3">
          <errorInfo.icon className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">{errorInfo.message}</p>
            {errorInfo.code === ERROR_CODES.SUPABASE_NOT_CONFIGURED && (
              <p className="text-red-100 text-xs mt-1">
                環境変数 NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。
              </p>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? (
                  <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
                ) : stat.format === "currency" ? (
                  formatCurrency(stat.value)
                ) : (
                  formatNumber(stat.value)
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Metrics Summary */}
      <Card>
        <CardHeader>
          <CardTitle>主要指標</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {metrics.map((metric) => (
              <div key={metric.label} className="text-center">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="text-xl font-bold">
                  {loading ? (
                    <span className="inline-block h-7 w-16 bg-gray-200 animate-pulse rounded" />
                  ) : metric.format === "percent" ? (
                    formatPercent(metric.value)
                  ) : metric.format === "currency" ? (
                    formatCurrency(metric.value)
                  ) : (
                    metric.value
                  )}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 日別推移チャート */}
        <Card>
          <CardHeader>
            <CardTitle>コンバージョン推移</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : data?.daily && data.daily.length > 0 ? (
              <div className="h-64 flex items-end gap-1">
                {data.daily.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                      style={{
                        height: `${(day.conversions / maxConversions) * 200}px`,
                        minHeight: day.conversions > 0 ? "4px" : "0",
                      }}
                      title={`${day.date}: ${day.conversions} CV`}
                    />
                    <span className="text-xs text-gray-500 truncate w-full text-center">
                      {day.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                データがありません
              </div>
            )}
          </CardContent>
        </Card>

        {/* 最近の最適化アクション */}
        <Card>
          <CardHeader>
            <CardTitle>最近の最適化アクション</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
                ))}
              </div>
            ) : data?.recentLogs && data.recentLogs.length > 0 ? (
              <div className="space-y-3">
                {data.recentLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          log.action_type === "auto_pause"
                            ? "bg-red-100 text-red-800"
                            : log.action_type === "declare_winner"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {log.action_type === "auto_pause" && "自動停止"}
                        {log.action_type === "declare_winner" && "勝者決定"}
                        {log.action_type === "budget_reallocation" && "予算再配分"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleDateString("ja-JP")}
                      </span>
                    </div>
                    <p className="text-sm mt-1 text-gray-600 line-clamp-2">
                      {log.reason}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                まだ最適化アクションはありません
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* テスト中の組み合わせ数 */}
      <Card>
        <CardHeader>
          <CardTitle>テスト状況</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">アクティブキャンペーン</p>
              <p className="text-3xl font-bold text-blue-700">
                {loading ? "-" : summary.activeCampaigns}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600">テスト中の組み合わせ</p>
              <p className="text-3xl font-bold text-green-700">
                {loading ? "-" : summary.activeCombinations}
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-600">平均テスト期間</p>
              <p className="text-3xl font-bold text-purple-700">
                {dateRange}日
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
