import { Metadata, Viewport } from "next"
import "./globals.css"
import { Instrument_Serif, JetBrains_Mono } from "next/font/google"
import { GeistSans } from "geist/font/sans"
import { Toaster } from "sonner"
import { ClientProviders } from "@/components/providers/client-providers"

export const metadata: Metadata = {
  title: "JStack App",
  description: "Created using JStack",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
}

const elegant = Instrument_Serif({
  weight: "400",
  style: "italic",
  variable: "--font-elegant",
  subsets: ["latin"],
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: "400",
})

export const viewport: Viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <body
        className={`${GeistSans.className} ${elegant.variable} ${jetBrainsMono.variable} antialiased light`}
      >
        <ClientProviders>
          <Toaster position="top-center" />
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}
