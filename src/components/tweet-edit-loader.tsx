"use client"

import { useEffect, useState } from "react"

export default function TweetEditLoader() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0
        return prev + 1
      })
    }, 30)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center justify-center p-3 rounded-full bg-white border border-gray-100 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] select-none">
      {/* X logo */}
      <div className="relative mr-3 text-gray-800">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="opacity-90"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>

      {/* Elegant progress bar */}
      <div className="w-16 h-[3px] bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"
          style={{
            width: `${progress}%`,
            transition: "width 0.3s ease-out",
          }}
        />
      </div>

      {/* Minimal label */}
      <span className="ml-3 text-xs font-medium text-gray-500">Editing</span>
    </div>
  )
}
