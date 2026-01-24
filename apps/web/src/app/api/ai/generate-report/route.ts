import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateWeeklyReport,
  reportToMarkdown,
  generateSlackSummary,
  generateCustomReport,
  type WeeklyReportData,
} from '@/lib/gemini/report-generator'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, project_id, format = 'json' } = body

    const supabase = await createClient()

    switch (action) {
      case 'weekly': {
        // データを収集
        const reportData = await collectReportData(supabase, project_id)

        // レポート生成
        const report = await generateWeeklyReport(reportData)

        // DBに保存
        await supabase.from('ai_reports').insert({
          project_id,
          report_type: 'weekly',
          period_start: reportData.period.start,
          period_end: reportData.period.end,
          content: report,
          raw_data: reportData,
        })

        if (format === 'markdown') {
          return NextResponse.json({
            success: true,
            data: {
              markdown: reportToMarkdown(report),
              report,
            },
          })
        }

        return NextResponse.json({
          success: true,
          data: report,
        })
      }

      case 'slack_summary': {
        const reportData = await collectReportData(supabase, project_id)
        const summary = await generateSlackSummary(reportData)

        return NextResponse.json({
          success: true,
          data: summary,
        })
      }

      case 'custom': {
        const { focus } = body

        if (!focus) {
          return NextResponse.json(
            { success: false, error: 'focus is required for custom reports' },
            { status: 400 }
          )
        }

        const reportData = await collectReportData(supabase, project_id)
        const customReport = await generateCustomReport(reportData, focus)

        return NextResponse.json({
          success: true,
          data: {
            markdown: customReport,
          },
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Report generation failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

async function collectReportData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId?: string
): Promise<WeeklyReportData> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 7)
  const prevStartDate = new Date()
  prevStartDate.setDate(prevStartDate.getDate() - 14)

  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]
  const prevStartDateStr = prevStartDate.toISOString().split('T')[0]

  // 今週のメトリクス
  let currentQuery = supabase
    .from('metrics')
    .select('impressions, clicks, conversions, spend')
    .gte('date', startDateStr)
    .lte('date', endDateStr)

  let prevQuery = supabase
    .from('metrics')
    .select('impressions, clicks, conversions, spend')
    .gte('date', prevStartDateStr)
    .lt('date', startDateStr)

  if (projectId) {
    currentQuery = currentQuery.eq('project_id', projectId)
    prevQuery = prevQuery.eq('project_id', projectId)
  }

  const [{ data: currentMetrics }, { data: prevMetrics }] = await Promise.all([
    currentQuery,
    prevQuery,
  ])

  // 集計
  const current = aggregateMetrics(currentMetrics || [])
  const previous = aggregateMetrics(prevMetrics || [])

  // トップパフォーマー
  let combinationsQuery = supabase
    .from('ad_lp_combinations')
    .select(`
      id,
      ads ( name ),
      lp_variants ( name ),
      metrics ( clicks, conversions, spend )
    `)
    .eq('status', 'active')

  if (projectId) {
    combinationsQuery = combinationsQuery.eq('project_id', projectId)
  }

  const { data: combinations } = await combinationsQuery

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const performanceData = (combinations || []).map((combo: any) => {
    const metrics = combo.metrics || []
    const totalClicks = metrics.reduce((sum: number, m: { clicks: number }) => sum + (m.clicks || 0), 0)
    const totalConversions = metrics.reduce((sum: number, m: { conversions: number }) => sum + (m.conversions || 0), 0)
    const totalSpend = metrics.reduce((sum: number, m: { spend: number }) => sum + (m.spend || 0), 0)

    const adName = Array.isArray(combo.ads) ? combo.ads[0]?.name : combo.ads?.name
    const lpName = Array.isArray(combo.lp_variants) ? combo.lp_variants[0]?.name : combo.lp_variants?.name

    return {
      name: `${adName || 'Unknown'} × ${lpName || 'Unknown'}`,
      type: 'combination' as const,
      cvr: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
      cpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
      conversions: totalConversions,
    }
  })

  const sortedByPerformance = performanceData.sort((a, b) => b.cvr - a.cvr)

  // 最適化ログ
  let logsQuery = supabase
    .from('optimization_logs')
    .select('action_type, target_type, target_id, reason, created_at')
    .gte('created_at', startDateStr)
    .order('created_at', { ascending: false })

  if (projectId) {
    logsQuery = logsQuery.eq('project_id', projectId)
  }

  const { data: logs } = await logsQuery

  return {
    period: {
      start: startDateStr,
      end: endDateStr,
    },
    summary: {
      totalSpend: current.spend,
      totalImpressions: current.impressions,
      totalClicks: current.clicks,
      totalConversions: current.conversions,
      avgCTR: current.impressions > 0 ? (current.clicks / current.impressions) * 100 : 0,
      avgCVR: current.clicks > 0 ? (current.conversions / current.clicks) * 100 : 0,
      avgCPA: current.conversions > 0 ? current.spend / current.conversions : 0,
    },
    weekOverWeek: {
      spendChange: calculateChange(previous.spend, current.spend),
      impressionsChange: calculateChange(previous.impressions, current.impressions),
      clicksChange: calculateChange(previous.clicks, current.clicks),
      conversionsChange: calculateChange(previous.conversions, current.conversions),
      ctrChange:
        current.impressions > 0 && previous.impressions > 0
          ? (current.clicks / current.impressions - previous.clicks / previous.impressions) * 100
          : 0,
      cvrChange:
        current.clicks > 0 && previous.clicks > 0
          ? (current.conversions / current.clicks - previous.conversions / previous.clicks) * 100
          : 0,
      cpaChange:
        current.conversions > 0 && previous.conversions > 0
          ? calculateChange(
              previous.spend / previous.conversions,
              current.spend / current.conversions
            )
          : 0,
    },
    topPerformers: sortedByPerformance.slice(0, 5),
    underperformers: sortedByPerformance
      .filter((p) => p.conversions >= 10) // ある程度データがあるもの
      .slice(-3)
      .reverse()
      .map((p) => ({
        ...p,
        issue: p.cvr < 1 ? 'CVRが1%未満' : p.cpa > 10000 ? 'CPAが高い' : 'パフォーマンス低下',
      })),
    abTestResults: [], // TODO: A/Bテスト結果を取得
    optimizationActions: (logs || []).map((log) => ({
      action: log.action_type,
      target: `${log.target_type}:${log.target_id}`,
      reason: log.reason || '',
      timestamp: log.created_at,
    })),
  }
}

function aggregateMetrics(
  metrics: Array<{ impressions: number; clicks: number; conversions: number; spend: number }>
) {
  return metrics.reduce(
    (acc, m) => ({
      impressions: acc.impressions + (m.impressions || 0),
      clicks: acc.clicks + (m.clicks || 0),
      conversions: acc.conversions + (m.conversions || 0),
      spend: acc.spend + (m.spend || 0),
    }),
    { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
  )
}

function calculateChange(previous: number, current: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}
