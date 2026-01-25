import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "LP作成",
}

export default function NewLandingPageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
