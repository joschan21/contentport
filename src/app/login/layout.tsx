import React from 'react'

export default async function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full flex-1 overflow-x-hidden bg-stone-100 border border-gray-200">
      {children}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, #d1d5db 1.5px, transparent 1.5px)`,
            backgroundSize: '20px 20px',
            opacity: 0.5,
          }}
        />
      </div>
    </div>
  )
}
