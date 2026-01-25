"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"

// 訴求タイプの選択肢
const appealTypes = [
  { value: "price", label: "価格訴求" },
  { value: "benefit", label: "ベネフィット訴求" },
  { value: "urgency", label: "緊急性訴求" },
  { value: "authority", label: "権威性訴求" },
  { value: "social_proof", label: "社会的証明" },
] as const

// 構成タイプの選択肢
const structureTypes = [
  { value: "problem_agitation", label: "問題提起型" },
  { value: "story", label: "ストーリー型" },
  { value: "direct", label: "ダイレクト型" },
  { value: "comparison", label: "比較型" },
  { value: "testimonial", label: "証言型" },
] as const

// コンバージョンタイプの選択肢
const conversionTypes = [
  { value: "form_submit", label: "フォーム送信" },
  { value: "line_registration", label: "LINE登録" },
  { value: "purchase", label: "商品購入" },
] as const

// ステータスの選択肢
const statusOptions = [
  { value: "draft", label: "下書き" },
  { value: "active", label: "公開中" },
  { value: "paused", label: "一時停止" },
] as const

interface FormData {
  name: string
  slug: string
  appealType: string
  structureType: string
  conversionType: string
  status: string
}

interface FormErrors {
  name?: string
  slug?: string
}

export default function NewLandingPagePage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    name: "",
    slug: "",
    appealType: "price",
    structureType: "problem_agitation",
    conversionType: "form_submit",
    status: "draft",
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // スラグを自動生成（日本語対応）
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim()
  }

  // フォームの値を更新
  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    // エラーをクリア
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }))
    }
  }

  // LP名変更時にスラグを自動更新
  const handleNameChange = (value: string) => {
    updateField("name", value)
    // スラグが空または自動生成されたものと同じ場合は自動更新
    if (!formData.slug || formData.slug === generateSlug(formData.name)) {
      updateField("slug", generateSlug(value))
    }
  }

  // バリデーション
  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = "LP名は必須です"
    }

    if (!formData.slug.trim()) {
      newErrors.slug = "スラグは必須です"
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = "スラグは半角英数字とハイフンのみ使用できます"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // NOTE: 現時点ではproject_idはモックで固定
      // 実際の実装ではユーザーのプロジェクトを選択するUIが必要
      const response = await fetch("/api/landing-pages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          project_id: "default-project", // TODO: プロジェクト選択機能実装後に修正
          conversion_type: formData.conversionType,
          content: {
            appeal_type: formData.appealType,
            structure_type: formData.structureType,
          },
          create_default_variants: true,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "LPの作成に失敗しました")
      }

      // 成功時はLP一覧ページに遷移
      router.push("/landing-pages")
    } catch (error) {
      console.error("Failed to create landing page:", error)
      setSubmitError(
        error instanceof Error ? error.message : "LPの作成に失敗しました"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Link href="/landing-pages">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">新規LP作成</h2>
          <p className="text-muted-foreground">
            新しいランディングページを作成します
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
              <CardDescription>
                LPの名前とURLスラグを設定します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  LP名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="例: サマーセールLP - 価格訴求"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">
                  スラグ（URL用） <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/lp/</span>
                  <Input
                    id="slug"
                    placeholder="例: summer-sale-price"
                    value={formData.slug}
                    onChange={(e) => updateField("slug", e.target.value.toLowerCase())}
                    className={errors.slug ? "border-red-500" : ""}
                  />
                </div>
                {errors.slug && (
                  <p className="text-sm text-red-500">{errors.slug}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  半角英数字とハイフンのみ使用できます
                </p>
              </div>
            </CardContent>
          </Card>

          {/* LP設定 */}
          <Card>
            <CardHeader>
              <CardTitle>LP設定</CardTitle>
              <CardDescription>
                訴求タイプや構成タイプを選択します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="appealType">訴求タイプ</Label>
                <select
                  id="appealType"
                  value={formData.appealType}
                  onChange={(e) => updateField("appealType", e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                >
                  {appealTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  LPのメイン訴求ポイントを選択します
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="structureType">構成タイプ</Label>
                <select
                  id="structureType"
                  value={formData.structureType}
                  onChange={(e) => updateField("structureType", e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                >
                  {structureTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  LPのコンテンツ構成パターンを選択します
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conversionType">コンバージョンタイプ</Label>
                <select
                  id="conversionType"
                  value={formData.conversionType}
                  onChange={(e) => updateField("conversionType", e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                >
                  {conversionTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  コンバージョンとして計測するアクションを選択します
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ステータス */}
          <Card>
            <CardHeader>
              <CardTitle>ステータス</CardTitle>
              <CardDescription>
                LPの公開状態を設定します
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="status">ステータス</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => updateField("status", e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  「下書き」の場合、LPは公開されません
                </p>
              </div>
            </CardContent>
          </Card>

          {/* エラーメッセージ */}
          {submitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {submitError}
            </div>
          )}

          {/* 送信ボタン */}
          <div className="flex justify-end gap-4">
            <Link href="/landing-pages">
              <Button type="button" variant="outline">
                キャンセル
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "作成中..." : "LPを作成"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
