import { createContext, useContext, useState, ReactNode } from "react"

interface MentionContextType {
  attachedDocumentIDs: string[]
  addAttachedDocument: (id: string) => void
  removeAttachedDocument: (id: string) => void
  setAttachedDocuments: (ids: string[]) => void
  clearAttachedDocuments: () => void
}

const MentionContext = createContext<MentionContextType | undefined>(undefined)

export function useMentionContext() {
  const context = useContext(MentionContext)
  if (!context) {
    throw new Error("useMentionContext must be used within a MentionProvider")
  }
  return context
}

interface MentionProviderProps {
  children: ReactNode
}

export function MentionProvider({ children }: MentionProviderProps) {
  const [attachedDocumentIDs, setAttachedDocumentIDs] = useState<string[]>([])

  const addAttachedDocument = (id: string) => {
    setAttachedDocumentIDs(prev => 
      prev.includes(id) ? prev : [...prev, id]
    )
  }

  const removeAttachedDocument = (id: string) => {
    setAttachedDocumentIDs(prev => 
      prev.filter(docId => docId !== id)
    )
  }

  const setAttachedDocuments = (ids: string[]) => {
    setAttachedDocumentIDs(ids)
  }

  const clearAttachedDocuments = () => {
    setAttachedDocumentIDs([])
  }

  const value = {
    attachedDocumentIDs,
    addAttachedDocument,
    removeAttachedDocument,
    setAttachedDocuments,
    clearAttachedDocuments
  }

  return (
    <MentionContext.Provider value={value}>
      {children}
    </MentionContext.Provider>
  )
}
