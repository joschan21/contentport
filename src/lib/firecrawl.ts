import FirecrawlApp from '@mendable/firecrawl-js'

export const firecrawl = new FirecrawlApp({
  apiKey: Bun.env.FIRECRAWL_API_KEY,
})
