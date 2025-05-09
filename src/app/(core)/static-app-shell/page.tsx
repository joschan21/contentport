"use client"
import nextDynamic from "next/dynamic"

const App = nextDynamic(() => import("@/frontend/app"), { ssr: false })

export const dynamic = "force-static"

export default function Home() {
  return <App />
}
