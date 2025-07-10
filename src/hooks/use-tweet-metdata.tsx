import { create } from 'zustand'

interface TweetMetadata {
  content: string
  setContent: (content: string) => void
  charCount: number
  setCharCount: (charCount: number) => void
}

const useTweetMetadata = create<TweetMetadata>((set) => ({
  content: '',
  setContent: (content) => set({ content }),
  charCount: 0,
  setCharCount: (charCount) => set({ charCount }),
}))

export default useTweetMetadata
