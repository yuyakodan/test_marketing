import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "マルチチャネル",
}

export default function MultichannelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
