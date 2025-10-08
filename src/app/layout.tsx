import { Providers } from '@/components/providers/providers'
import { Analytics } from '@vercel/analytics/next'
import { Metadata, Viewport } from 'next'
import { Instrument_Serif, Inter, JetBrains_Mono, Rubik } from 'next/font/google'
import { Suspense } from 'react'
import { Toaster } from 'react-hot-toast'
import { Databuddy, track } from '@databuddy/sdk'

import './globals.css'

const title = 'Contentport'
const description = "Create & manage your brand's content at scale"

export const metadata: Metadata = {
  title,
  description,
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
  openGraph: {
    title,
    description,
    images: [{ url: '/images/og-image.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/images/og-image.png'],
    creator: '@joshtriedcoding',
  },
  metadataBase: new URL('https://contentport.io'),
}

const inter = Inter({
  weight: '600',
  variable: '--font-inter',
  subsets: ['latin'],
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: '400',
})

const rubik = Rubik({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
})

export const viewport: Viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      className="h-full"
      style={{ scrollbarGutter: 'stable' }}
      suppressHydrationWarning
      lang="en"
    >
      <body
        className={`${rubik.className} ${inter.variable} ${jetBrainsMono.variable} antialiased light h-full`}
      >
        <Analytics />

        <Databuddy
          clientId="-IrMWaFxrpJQiiMMpSc4I"
          disabled={process.env.NODE_ENV === 'development'}
          enableBatching={true}
          trackErrors={true}
        />

        <Suspense>
          <Toaster position="top-center" />

          <Providers>{children}</Providers>
        </Suspense>
      </body>
    </html>
  )
}
