import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils"
import { TrendingUp, TrendingDown, DollarSign, Users, MousePointer, Target } from "lucide-react"

// Mock data - will be replaced with actual data from Supabase
const stats = [
  {
    title: "総インプレッション",
    value: 125432,
    change: 12.5,
    icon: Users,
    format: "number",
  },
  {
    title: "クリック数",
    value: 3421,
    change: 8.2,
    icon: MousePointer,
    format: "number",
  },
  {
    title: "コンバージョン",
    value: 156,
    change: -2.4,
    icon: Target,
    format: "number",
  },
  {
    title: "広告費",
    value: 245000,
    change: 5.1,
    icon: DollarSign,
    format: "currency",
  },
]

const metrics = [
  { label: "CTR", value: 0.0273, format: "percent" },
  { label: "CVR", value: 0.0456, format: "percent" },
  { label: "CPC", value: 71.6, format: "currency" },
  { label: "CPA", value: 1571, format: "currency" },
  { label: "ROAS", value: 2.45, format: "number" },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">ダッシュボード</h2>
        <p className="text-muted-foreground">
          キャンペーンのパフォーマンス概要
        </p>
      </div>

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
                {stat.format === "currency"
                  ? formatCurrency(stat.value)
                  : formatNumber(stat.value)}
              </div>
              <p className="text-xs text-muted-foreground">
                <span
                  className={
                    stat.change > 0 ? "text-green-600" : "text-red-600"
                  }
                >
                  {stat.change > 0 ? (
                    <TrendingUp className="inline h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="inline h-3 w-3 mr-1" />
                  )}
                  {stat.change > 0 ? "+" : ""}
                  {stat.change}%
                </span>{" "}
                前週比
              </p>
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
                  {metric.format === "percent"
                    ? formatPercent(metric.value)
                    : metric.format === "currency"
                    ? formatCurrency(metric.value)
                    : metric.value.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>パフォーマンス推移</CardTitle>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center text-muted-foreground">
            グラフはデータ連携後に表示されます
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>トップパフォーマンス組み合わせ</CardTitle>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center text-muted-foreground">
            A/Bテスト開始後に表示されます
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
