import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "キャンペーン作成",
}

export default function NewCampaignLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
