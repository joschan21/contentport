export const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin
  if (process.env.NODE_ENV === 'production') return `https://contentport.io`
  return `http://localhost:3000`
}
