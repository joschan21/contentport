/** @type {import('next').NextConfig} */
const nextConfig = {
  rewrites: async () => {
    return [
      {
        source: "/((?!api/).*)", // Negative lookahead to exclude /api/* routes
        destination: "/static-app-shell",
      },
    ]
  },
}

export default nextConfig
