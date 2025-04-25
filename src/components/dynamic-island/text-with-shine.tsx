"use client"

import { motion } from "framer-motion"

interface TextWithShineProps {
  text: string
}

export function TextWithShine({ text }: TextWithShineProps) {
  return (
    <div className="relative inline-block text-stone-100 text-sm">
      <motion.p
        className="text-stone-100 text-sm"
        style={{
          background:
            "linear-gradient(90deg, #d6d3d1 0%, #d6d3d1 35%, #a6a09b 50%, #d6d3d1 100%, #d6d3d1 100%)",
          backgroundSize: "200% auto",
          color: "transparent",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          textShadow: "0 0 1px rgba(255,255,255,0.1)",
        }}
        animate={{
          backgroundPosition: ["200% 0", "-200% 0"]
        }}
        transition={{
          repeat: Infinity,
          duration: 3,
          ease: "linear",
        }}
      >
        {text}
      </motion.p>
    </div>
  )
}
