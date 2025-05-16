import { Metadata, Viewport } from "next"
import "./globals.css"
import { Instrument_Serif, JetBrains_Mono, Rubik } from "next/font/google"
import { Toaster } from "react-hot-toast"
import { ClientProviders } from "@/components/providers/client-providers"
import { DocumentProvider } from "@/hooks/document-ctx"

export const metadata: Metadata = {
  title: "contentport",
  description: "Created using JStack",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
}

const elegant = Instrument_Serif({
  weight: "400",
  variable: "--font-elegant",
  style: "italic",
  subsets: ["latin"],
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: "400",
})

const rubik = Rubik({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
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
        className={`${rubik.className} ${elegant.variable} ${jetBrainsMono.variable} antialiased light`}
      >
        <DocumentProvider>
          <ClientProviders>{children}</ClientProviders>
        </DocumentProvider>
      </body>
    </html>
  )
}
