"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { ArrowLeft, Loader2 } from "lucide-react"

// フォームデータの型
type CampaignFormData = {
  name: string
  objective: "OUTCOME_SALES" | "OUTCOME_LEADS" | "OUTCOME_TRAFFIC" | "OUTCOME_AWARENESS" | "OUTCOME_ENGAGEMENT"
  daily_budget: number
  start_date: string
  end_date: string
  status: "draft" | "active" | "paused"
}

// 目的のオプション
const objectiveOptions = [
  { value: "OUTCOME_SALES", label: "コンバージョン（販売促進）" },
  { value: "OUTCOME_LEADS", label: "リード獲得" },
  { value: "OUTCOME_TRAFFIC", label: "トラフィック" },
  { value: "OUTCOME_AWARENESS", label: "ブランド認知" },
  { value: "OUTCOME_ENGAGEMENT", label: "エンゲージメント" },
]

// ステータスのオプション
const statusOptions = [
  { value: "draft", label: "下書き" },
  { value: "active", label: "配信中" },
  { value: "paused", label: "一時停止" },
]

// バリデーション関数
function validateForm(data: CampaignFormData): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!data.name || data.name.trim() === "") {
    errors.name = "キャンペーン名は必須です"
  } else if (data.name.length > 100) {
    errors.name = "キャンペーン名は100文字以内で入力してください"
  }

  if (!data.objective) {
    errors.objective = "目的を選択してください"
  }

  if (!data.daily_budget || data.daily_budget < 100) {
    errors.daily_budget = "日予算は100円以上で設定してください"
  } else if (data.daily_budget > 10000000) {
    errors.daily_budget = "日予算は1,000万円以下で設定してください"
  }

  if (!data.start_date) {
    errors.start_date = "開始日は必須です"
  }

  if (!data.status) {
    errors.status = "ステータスを選択してください"
  }

  return errors
}

export default function NewCampaignPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const {
    register,
    handleSubmit,
    getValues,
  } = useForm<CampaignFormData>({
    defaultValues: {
      name: "",
      objective: "OUTCOME_SALES",
      daily_budget: 10000,
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
      status: "draft",
    },
  })

  const onSubmit = async (data: CampaignFormData) => {
    // バリデーション
    const errors = validateForm(data)
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }
    setValidationErrors({})

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          end_date: data.end_date || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "キャンペーンの作成に失敗しました")
      }

      router.push("/campaigns")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">新規キャンペーン作成</h2>
          <p className="text-muted-foreground">
            新しい広告キャンペーンを作成します
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>キャンペーン情報</CardTitle>
          <CardDescription>
            キャンペーンの基本情報を入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* キャンペーン名 */}
            <div className="space-y-2">
              <Label htmlFor="name">
                キャンペーン名 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="例: サマーセール2024"
                {...register("name")}
              />
              {validationErrors.name && (
                <p className="text-sm text-red-500">{validationErrors.name}</p>
              )}
            </div>

            {/* 目的 */}
            <div className="space-y-2">
              <Label htmlFor="objective">
                目的 <span className="text-red-500">*</span>
              </Label>
              <Select id="objective" {...register("objective")}>
                {objectiveOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {validationErrors.objective && (
                <p className="text-sm text-red-500">{validationErrors.objective}</p>
              )}
            </div>

            {/* 日予算 */}
            <div className="space-y-2">
              <Label htmlFor="daily_budget">
                日予算（円） <span className="text-red-500">*</span>
              </Label>
              <Input
                id="daily_budget"
                type="number"
                min={100}
                step={100}
                placeholder="10000"
                {...register("daily_budget", { valueAsNumber: true })}
              />
              {validationErrors.daily_budget && (
                <p className="text-sm text-red-500">{validationErrors.daily_budget}</p>
              )}
            </div>

            {/* 開始日・終了日 */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start_date">
                  開始日 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  {...register("start_date")}
                />
                {validationErrors.start_date && (
                  <p className="text-sm text-red-500">{validationErrors.start_date}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">終了日</Label>
                <Input
                  id="end_date"
                  type="date"
                  {...register("end_date")}
                />
                {validationErrors.end_date && (
                  <p className="text-sm text-red-500">{validationErrors.end_date}</p>
                )}
              </div>
            </div>

            {/* ステータス */}
            <div className="space-y-2">
              <Label htmlFor="status">
                ステータス <span className="text-red-500">*</span>
              </Label>
              <Select id="status" {...register("status")}>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {validationErrors.status && (
                <p className="text-sm text-red-500">{validationErrors.status}</p>
              )}
            </div>

            {/* 送信ボタン */}
            <div className="flex justify-end gap-4">
              <Link href="/campaigns">
                <Button type="button" variant="outline">
                  キャンセル
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "作成中..." : "キャンペーンを作成"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
