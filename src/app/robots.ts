import { getBaseUrl } from '@/constants/base-url'
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl()

  const disallowedAIs = [
    'GPTBot',
    'ChatGPT-User',
    'CCBot',
    'anthropic-ai',
    'Claude-Web',
  ]
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/privacy',
          '/terms',
          '/privacy-policy',
          '/terms-of-service',
        ],
        disallow: [
          '/api/',
          '/studio/',
          '/login/',
          '/invite/',
          '/webhooks/',
          '/ingest/',
          '/_next/',
          '/_vercel/',
        ],
      },
      {
        userAgent: disallowedAIs,
        disallow: [
          '/privacy',
          '/terms',
          '/privacy-policy',
          '/terms-of-service',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}