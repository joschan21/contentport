"use client"

import { motion } from "framer-motion"

interface WaveformProps {
  data: number[]
}

export function Waveform({ data }: WaveformProps) {
  // If no data, show a flat line
  const waveformData = data.length > 0 ? data : Array(40).fill(0)

  // Only take a subset of the data to avoid overcrowding
  const displayData = waveformData.filter((_, i) => i % 2 === 0).slice(0, 40)

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="flex items-center h-full space-x-[2px]">
        {displayData.map((value, index) => {
          // Amplify the value to make it more sensitive
          const amplifiedValue = value * 2
          
          // Scale the value to get a height between 8px and 70px (increased from 50px)
          const height = Math.max(8, Math.abs(amplifiedValue) * 70)

          return (
            <motion.div
              key={index}
              className="w-[2px] bg-stone-400"
              initial={{ height: 8 }}
              animate={{ height }}
              transition={{ 
                type: "spring", 
                stiffness: 500, // Increased from 400 for faster response
                damping: 23,    // Decreased from 25 for more bounce
                duration: 0.1   // Decreased from 0.15 for faster response
              }}
              style={{
                backgroundColor: `rgba(161, 161, 170, ${Math.min(1, Math.abs(value) + 0.3)})`, // Increased opacity base
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

