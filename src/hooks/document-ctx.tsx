"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface DocumentContextType {
  documentTitles: Record<string, string>
  setDocumentTitle: (id: string, title: string) => void
}

const DocumentContext = createContext<DocumentContextType | undefined>(
  undefined
)

interface DocumentProviderProps {
  children: ReactNode
}

export function DocumentProvider({ children }: DocumentProviderProps) {
  const [documentTitles, setDocumentTitles] = useState<Record<string, string>>(
    {}
  )

  const setDocumentTitle = (id: string, title: string) => {
    setDocumentTitles((prev) => ({
      ...prev,
      [id]: title,
    }))
  }

  return (
    <DocumentContext.Provider value={{ documentTitles, setDocumentTitle }}>
      {children}
    </DocumentContext.Provider>
  )
}

export function useDocumentContext() {
  const context = useContext(DocumentContext)
  if (!context) {
    throw new Error("useDocumentContext must be used within a DocumentProvider")
  }
  return context
}
