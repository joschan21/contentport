/** @type {import('next').NextConfig} */
const nextConfig = {
  rewrites: async () => {
    return [
      {
        source: "/((?!api/).*)",
        destination: "/static-app-shell",
      },
    ]
  },
  serverExternalPackages: ["pdf-parse"]
}

export default nextConfig
