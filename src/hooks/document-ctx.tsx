"use client"

import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
} from "react"
import { useLocalStorage } from "./use-local-storage"

interface DocumentContextType {
  docs: SidebarDoc[]
  setDocs: Dispatch<SetStateAction<SidebarDoc[]>>
}

const DocumentContext = createContext<DocumentContextType | undefined>(
  undefined
)

interface DocumentProviderProps {
  children: ReactNode
}

export interface SidebarDoc {
  id: string
  title: string
  updatedAt: Date
}

export function DocumentProvider({ children }: DocumentProviderProps) {
  const [docs, setDocs] = useLocalStorage<SidebarDoc[]>("context-docs", [])

  return (
    <DocumentContext.Provider value={{ docs, setDocs }}>
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
