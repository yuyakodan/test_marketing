import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "クリエイティブ",
}

export default function CreativesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
