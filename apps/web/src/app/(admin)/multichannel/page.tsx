'use client'

import { useState, useEffect } from 'react'

interface UnifiedMetrics {
  date: string
  totalSpend: number
  totalImpressions: number
  totalClicks: number
  totalConversions: number
  totalRevenue?: number
  avgCTR: number
  avgCVR: number
  avgCPA: number
  avgROAS?: number
  byChannel: Record<string, {
    spend: number
    impressions: number
    clicks: number
    conversions: number
    revenue?: number
    shareOfSpend: number
    cpa: number
  }>
}

interface ChannelPerformance {
  channel: string
  displayName: string
  metrics: {
    spend: number
    conversions: number
    cpa: number
    cvr: number
    roas?: number
  }
  trend: 'up' | 'down' | 'stable'
  recommendation?: string
}

interface ChannelAllocation {
  channel: string
  currentBudget: number
  recommendedBudget: number
  changePercent: number
  reason: string
}

const channelColors: Record<string, string> = {
  meta: '#0081FB',
  google_ads: '#4285F4',
  tiktok: '#00F2EA',
  line: '#06C755',
  yahoo: '#FF0033',
}

const channelDisplayNames: Record<string, string> = {
  meta: 'Meta広告',
  google_ads: 'Google広告',
  tiktok: 'TikTok広告',
  line: 'LINE広告',
  yahoo: 'Yahoo!広告',
}

export default function MultichannelPage() {
  const [unified, setUnified] = useState<UnifiedMetrics | null>(null)
  const [performance, setPerformance] = useState<ChannelPerformance[]>([])
  const [allocation, setAllocation] = useState<ChannelAllocation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'allocation'>('overview')
  const [totalBudget, setTotalBudget] = useState(1000000)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // 統合メトリクス取得
      const unifiedRes = await fetch('/api/multichannel?action=unified')
      const unifiedData = await unifiedRes.json()
      if (unifiedData.success) {
        setUnified(unifiedData.data)
      }

      // パフォーマンス分析取得
      const perfRes = await fetch('/api/multichannel?action=performance')
      const perfData = await perfRes.json()
      if (perfData.success) {
        setPerformance(perfData.data)
      }

      // 予算配分取得
      const allocRes = await fetch(`/api/multichannel?action=allocation&total_budget=${totalBudget}`)
      const allocData = await allocRes.json()
      if (allocData.success) {
        setAllocation(allocData.data.allocation)
      }
    } catch (error) {
      console.error('Failed to fetch multichannel data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ja-JP').format(Math.round(num))
  }

  const formatCurrency = (num: number) => {
    return `¥${formatNumber(num)}`
  }

  const formatPercent = (num: number) => {
    return `${num.toFixed(2)}%`
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <span className="text-green-500">↑</span>
      case 'down':
        return <span className="text-red-500">↓</span>
      case 'stable':
        return <span className="text-gray-500">→</span>
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">マルチチャネル統合ダッシュボード</h1>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">マルチチャネル統合ダッシュボード</h1>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          更新
        </button>
      </div>

      {/* タブナビゲーション */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { id: 'overview', label: '概要' },
          { id: 'performance', label: 'パフォーマンス' },
          { id: 'allocation', label: '予算配分' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-white shadow text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 概要タブ */}
      {activeTab === 'overview' && unified && (
        <div className="space-y-6">
          {/* 総合KPI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">総広告費</p>
              <p className="text-2xl font-bold">{formatCurrency(unified.totalSpend)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">総コンバージョン</p>
              <p className="text-2xl font-bold">{formatNumber(unified.totalConversions)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">平均CPA</p>
              <p className="text-2xl font-bold">{formatCurrency(unified.avgCPA)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-sm text-gray-500">平均ROAS</p>
              <p className="text-2xl font-bold">
                {unified.avgROAS ? `${unified.avgROAS.toFixed(2)}x` : '-'}
              </p>
            </div>
          </div>

          {/* チャネル別サマリー */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">チャネル別サマリー</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">チャネル</th>
                    <th className="text-right py-3 px-4">広告費</th>
                    <th className="text-right py-3 px-4">シェア</th>
                    <th className="text-right py-3 px-4">IMP</th>
                    <th className="text-right py-3 px-4">クリック</th>
                    <th className="text-right py-3 px-4">CV</th>
                    <th className="text-right py-3 px-4">CPA</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(unified.byChannel)
                    .filter(([, data]) => data.spend > 0)
                    .sort((a, b) => b[1].spend - a[1].spend)
                    .map(([channel, data]) => (
                      <tr key={channel} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <span
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: channelColors[channel] || '#888' }}
                            />
                            {channelDisplayNames[channel] || channel}
                          </div>
                        </td>
                        <td className="text-right py-3 px-4">{formatCurrency(data.spend)}</td>
                        <td className="text-right py-3 px-4">{formatPercent(data.shareOfSpend)}</td>
                        <td className="text-right py-3 px-4">{formatNumber(data.impressions)}</td>
                        <td className="text-right py-3 px-4">{formatNumber(data.clicks)}</td>
                        <td className="text-right py-3 px-4">{formatNumber(data.conversions)}</td>
                        <td className="text-right py-3 px-4">{formatCurrency(data.cpa)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* チャネル別支出割合（視覚化） */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">広告費の配分</h2>
            <div className="flex h-8 rounded-lg overflow-hidden">
              {Object.entries(unified.byChannel)
                .filter(([, data]) => data.shareOfSpend > 0)
                .sort((a, b) => b[1].shareOfSpend - a[1].shareOfSpend)
                .map(([channel, data]) => (
                  <div
                    key={channel}
                    className="flex items-center justify-center text-white text-xs font-medium"
                    style={{
                      width: `${data.shareOfSpend}%`,
                      backgroundColor: channelColors[channel] || '#888',
                      minWidth: data.shareOfSpend > 5 ? 'auto' : '0',
                    }}
                    title={`${channelDisplayNames[channel] || channel}: ${formatPercent(data.shareOfSpend)}`}
                  >
                    {data.shareOfSpend > 10 && `${Math.round(data.shareOfSpend)}%`}
                  </div>
                ))}
            </div>
            <div className="flex flex-wrap gap-4 mt-4">
              {Object.entries(unified.byChannel)
                .filter(([, data]) => data.shareOfSpend > 0)
                .map(([channel, data]) => (
                  <div key={channel} className="flex items-center text-sm">
                    <span
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: channelColors[channel] || '#888' }}
                    />
                    <span>
                      {channelDisplayNames[channel] || channel} ({formatPercent(data.shareOfSpend)})
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* パフォーマンスタブ */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {performance.map((p) => (
              <div key={p.channel} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <span
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: channelColors[p.channel] || '#888' }}
                    />
                    <h3 className="text-lg font-semibold">{p.displayName}</h3>
                  </div>
                  <div className="text-2xl">{getTrendIcon(p.trend)}</div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">広告費</span>
                    <span className="font-medium">{formatCurrency(p.metrics.spend)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">コンバージョン</span>
                    <span className="font-medium">{formatNumber(p.metrics.conversions)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">CPA</span>
                    <span className="font-medium">{formatCurrency(p.metrics.cpa)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">CVR</span>
                    <span className="font-medium">{formatPercent(p.metrics.cvr)}</span>
                  </div>
                  {p.metrics.roas && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">ROAS</span>
                      <span className="font-medium">{p.metrics.roas.toFixed(2)}x</span>
                    </div>
                  )}
                </div>

                {p.recommendation && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">{p.recommendation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {performance.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500">パフォーマンスデータがありません</p>
              <p className="text-sm text-gray-400 mt-2">
                各チャネルのデータを同期してください
              </p>
            </div>
          )}
        </div>
      )}

      {/* 予算配分タブ */}
      {activeTab === 'allocation' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">予算配分の最適化</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">総予算:</label>
                <input
                  type="number"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(Number(e.target.value))}
                  className="w-32 px-3 py-1 border rounded-lg text-right"
                />
                <button
                  onClick={fetchData}
                  className="px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  再計算
                </button>
              </div>
            </div>

            {allocation.length > 0 ? (
              <div className="space-y-4">
                {allocation.map((a) => (
                  <div key={a.channel} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <span
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: channelColors[a.channel] || '#888' }}
                        />
                        <span className="font-medium">
                          {channelDisplayNames[a.channel] || a.channel}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          a.changePercent > 0
                            ? 'text-green-600'
                            : a.changePercent < 0
                            ? 'text-red-600'
                            : 'text-gray-500'
                        }`}
                      >
                        {a.changePercent > 0 ? '+' : ''}
                        {a.changePercent}%
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex-1">
                        <div className="text-sm text-gray-500 mb-1">現在の予算</div>
                        <div className="font-medium">{formatCurrency(a.currentBudget)}</div>
                      </div>
                      <div className="text-2xl text-gray-400">→</div>
                      <div className="flex-1">
                        <div className="text-sm text-gray-500 mb-1">推奨予算</div>
                        <div className="font-medium text-blue-600">
                          {formatCurrency(a.recommendedBudget)}
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600">{a.reason}</p>
                  </div>
                ))}

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">最適化サマリー</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>
                      • 増額推奨: {allocation.filter((a) => a.changePercent > 10).length}チャネル
                    </li>
                    <li>
                      • 減額推奨: {allocation.filter((a) => a.changePercent < -10).length}チャネル
                    </li>
                    <li>
                      • 維持推奨:{' '}
                      {
                        allocation.filter(
                          (a) => a.changePercent >= -10 && a.changePercent <= 10
                        ).length
                      }
                      チャネル
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">予算配分データがありません</p>
                <p className="text-sm text-gray-400 mt-2">
                  パフォーマンスデータが必要です
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
