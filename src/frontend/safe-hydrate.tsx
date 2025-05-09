import { PropsWithChildren } from "react"

export function SafeHydrate({ children }: PropsWithChildren) {
  return (
    <div suppressHydrationWarning>
      {typeof window === "undefined" ? null : children}
    </div>
  )
}
