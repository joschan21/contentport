export const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin

  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL}`
  }

  if (process.env.NODE_ENV === 'production' && !Boolean(process.env.IS_LOCAL)) {
    return `https://contentport.io`
  }

  return `http://localhost:3000`
}
