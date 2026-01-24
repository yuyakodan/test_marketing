"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Settings {
  meta: {
    accessToken: string
    adAccountId: string
    pixelId: string
    pageId: string
  }
  optimization: {
    minTestDays: number
    minSamples: number
    confidenceLevel: number
    autoStopLosers: boolean
    autoBudgetReallocation: boolean
  }
  notifications: {
    email: string
    slackWebhook: string
    notifyOnWinner: boolean
    notifyOnLoser: boolean
    weeklyReport: boolean
  }
}

const defaultSettings: Settings = {
  meta: {
    accessToken: "",
    adAccountId: "",
    pixelId: "",
    pageId: "",
  },
  optimization: {
    minTestDays: 7,
    minSamples: 100,
    confidenceLevel: 95,
    autoStopLosers: true,
    autoBudgetReallocation: false,
  },
  notifications: {
    email: "",
    slackWebhook: "",
    notifyOnWinner: true,
    notifyOnLoser: true,
    weeklyReport: true,
  },
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [activeTab, setActiveTab] = useState<"meta" | "optimization" | "notifications">("meta")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    // TODO: API呼び出しで設定を保存
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const updateMeta = (key: keyof Settings["meta"], value: string) => {
    setSettings((prev) => ({
      ...prev,
      meta: { ...prev.meta, [key]: value },
    }))
  }

  const updateOptimization = (
    key: keyof Settings["optimization"],
    value: number | boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      optimization: { ...prev.optimization, [key]: value },
    }))
  }

  const updateNotifications = (
    key: keyof Settings["notifications"],
    value: string | boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-gray-500">システム設定とAPI連携</p>
      </div>

      {/* タブ */}
      <div className="flex gap-2 border-b">
        {(["meta", "optimization", "notifications"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "meta" && "Meta API"}
            {tab === "optimization" && "最適化"}
            {tab === "notifications" && "通知"}
          </button>
        ))}
      </div>

      {/* Meta API設定 */}
      {activeTab === "meta" && (
        <Card>
          <CardHeader>
            <CardTitle>Meta API設定</CardTitle>
            <CardDescription>
              Meta Business Managerの認証情報を設定します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accessToken">アクセストークン</Label>
              <Input
                id="accessToken"
                type="password"
                placeholder="EAAxxxxxxxx..."
                value={settings.meta.accessToken}
                onChange={(e) => updateMeta("accessToken", e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Meta Business Suiteから取得したアクセストークン
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adAccountId">広告アカウントID</Label>
              <Input
                id="adAccountId"
                placeholder="123456789"
                value={settings.meta.adAccountId}
                onChange={(e) => updateMeta("adAccountId", e.target.value)}
              />
              <p className="text-xs text-gray-500">
                act_プレフィックスなしで入力してください
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pixelId">Pixel ID</Label>
              <Input
                id="pixelId"
                placeholder="123456789"
                value={settings.meta.pixelId}
                onChange={(e) => updateMeta("pixelId", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pageId">ページID</Label>
              <Input
                id="pageId"
                placeholder="123456789"
                value={settings.meta.pageId}
                onChange={(e) => updateMeta("pageId", e.target.value)}
              />
              <p className="text-xs text-gray-500">
                広告を配信するFacebookページのID
              </p>
            </div>

            <div className="pt-4 border-t">
              <Button variant="outline" className="w-full">
                接続テスト
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 最適化設定 */}
      {activeTab === "optimization" && (
        <Card>
          <CardHeader>
            <CardTitle>最適化設定</CardTitle>
            <CardDescription>
              A/Bテストの判定基準と自動最適化の設定
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="minTestDays">最低テスト期間（日）</Label>
              <Input
                id="minTestDays"
                type="number"
                min={1}
                max={30}
                value={settings.optimization.minTestDays}
                onChange={(e) =>
                  updateOptimization("minTestDays", parseInt(e.target.value))
                }
              />
              <p className="text-xs text-gray-500">
                この期間が経過するまで自動最適化は実行されません
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minSamples">最低サンプル数（クリック）</Label>
              <Input
                id="minSamples"
                type="number"
                min={50}
                max={1000}
                value={settings.optimization.minSamples}
                onChange={(e) =>
                  updateOptimization("minSamples", parseInt(e.target.value))
                }
              />
              <p className="text-xs text-gray-500">
                各バリアントがこのクリック数に達するまで判定を待ちます
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confidenceLevel">信頼水準（%）</Label>
              <Input
                id="confidenceLevel"
                type="number"
                min={90}
                max={99}
                value={settings.optimization.confidenceLevel}
                onChange={(e) =>
                  updateOptimization("confidenceLevel", parseInt(e.target.value))
                }
              />
              <p className="text-xs text-gray-500">
                統計的有意性の判定基準（通常95%）
              </p>
            </div>

            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">負けパターン自動停止</div>
                  <div className="text-sm text-gray-500">
                    統計的に有意に劣るパターンを自動で停止
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.optimization.autoStopLosers}
                    onChange={(e) =>
                      updateOptimization("autoStopLosers", e.target.checked)
                    }
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">自動予算再配分</div>
                  <div className="text-sm text-gray-500">
                    勝ちパターンに予算を自動で集中
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.optimization.autoBudgetReallocation}
                    onChange={(e) =>
                      updateOptimization("autoBudgetReallocation", e.target.checked)
                    }
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 通知設定 */}
      {activeTab === "notifications" && (
        <Card>
          <CardHeader>
            <CardTitle>通知設定</CardTitle>
            <CardDescription>
              最適化結果やレポートの通知先を設定
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">通知メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={settings.notifications.email}
                onChange={(e) => updateNotifications("email", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slackWebhook">Slack Webhook URL</Label>
              <Input
                id="slackWebhook"
                placeholder="https://hooks.slack.com/services/..."
                value={settings.notifications.slackWebhook}
                onChange={(e) =>
                  updateNotifications("slackWebhook", e.target.value)
                }
              />
            </div>

            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">勝ちパターン通知</div>
                  <div className="text-sm text-gray-500">
                    統計的に有意な勝者が決まったら通知
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.notifications.notifyOnWinner}
                    onChange={(e) =>
                      updateNotifications("notifyOnWinner", e.target.checked)
                    }
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">負けパターン通知</div>
                  <div className="text-sm text-gray-500">
                    パターンが自動停止されたら通知
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.notifications.notifyOnLoser}
                    onChange={(e) =>
                      updateNotifications("notifyOnLoser", e.target.checked)
                    }
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">週次レポート</div>
                  <div className="text-sm text-gray-500">
                    毎週月曜日にサマリーレポートを送信
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.notifications.weeklyReport}
                    onChange={(e) =>
                      updateNotifications("weeklyReport", e.target.checked)
                    }
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 保存ボタン */}
      <div className="flex justify-end gap-2">
        {saved && (
          <span className="text-green-600 text-sm self-center">
            設定を保存しました
          </span>
        )}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "保存中..." : "設定を保存"}
        </Button>
      </div>
    </div>
  )
}
