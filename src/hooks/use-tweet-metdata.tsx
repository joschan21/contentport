import { create } from 'zustand'

interface TweetMetadata {

  charCount: number
  setCharCount: (charCount: number) => void
}

const useTweetMetadata = create<TweetMetadata>((set) => ({

  charCount: 0,
  setCharCount: (charCount) => set({ charCount }),
}))

export default useTweetMetadata
