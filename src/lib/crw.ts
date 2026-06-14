import FirecrawlApp from '@mendable/firecrawl-js'

// fastCRW: Firecrawl-compatible web scraper (single binary; self-host or cloud).
// Reuses the Firecrawl client with a custom base URL. Defaults to the managed
// cloud; set CRW_API_URL to point at a self-hosted server.
export const crw = new FirecrawlApp({
  apiKey: process.env.CRW_API_KEY,
  apiUrl: process.env.CRW_API_URL ?? 'https://fastcrw.com/api',
})
