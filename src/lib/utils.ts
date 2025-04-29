import { clsx, type ClassValue } from "clsx"
import { Diff, diff_match_patch } from "diff-match-patch"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type DiffType = -1 | 0 | 1 | 2

export type DiffWithReplacement = {
  id: string
  type: DiffType
  text: string
  category: string
  replacement?: string
  lexicalKey?: string
  contextBefore?: string
  contextAfter?: string
}

export const processDiffs = (diffs: Diff[]): DiffWithReplacement[] => {
  const processed: DiffWithReplacement[] = []
  const category =
    diffs.length === 1 && diffs.every((d) => d[0] === 1)
      ? "write-initial-content"
      : "clarity"

  for (let i = 0; i < diffs.length; i++) {
    const current = diffs[i]
    const next = diffs[i + 1]
    const prev = diffs[i - 1]

    if (!current?.[1].includes("\n") && !current![1].trim()) continue

    const getContext = (diffs: Diff[], index: number): string => {
      let context = ""
      let wordCount = 0
      let currentLine = ""
      
      // Find the line containing our diff
      const currentDiff = diffs[index]
      const currentText = currentDiff![1]
      const currentLineStart = currentText.lastIndexOf("\n") + 1
      const currentLineText = currentText.slice(currentLineStart)
      
      // Look through previous diffs until we find the start of the line
      for (let j = 1; j <= 3; j++) {
        const diff = diffs[index - j]
        if (diff && diff[0] === 0) {
          const text = diff[1]
          const lines = text.split("\n")
          const lastLine = lines[lines.length - 1]
          
          if (lastLine?.trim()) {
            const words = lastLine.trim().split(/\s+/)
            for (let i = words.length - 1; i >= 0; i--) {
              if (wordCount < 2) {
                context = words[i] + (context ? " " + context : "")
                wordCount++
              }
            }
          }
          
          // If we found a newline, stop looking back
          if (text.includes("\n")) break
        }
      }
      
      return wordCount === 2 ? "..." + context : context
    }

    const getContextAfter = (diffs: Diff[], index: number): string => {
      let context = ""
      let wordCount = 0
      
      // Find the line containing our diff
      const currentDiff = diffs[index]
      const currentText = currentDiff![1]
      const currentLineEnd = currentText.indexOf("\n")
      const currentLineText = currentLineEnd === -1 ? currentText : currentText.slice(0, currentLineEnd)
      
      // Look through next diffs until we find the end of the line
      for (let j = 1; j <= 3; j++) {
        const diff = diffs[index + j]
        if (diff && diff[0] === 0) {
          const text = diff[1]
          const lines = text.split("\n")
          const firstLine = lines[0]
          
          if (firstLine?.trim()) {
            const words = firstLine.trim().split(/\s+/)
            for (let i = 0; i < words.length; i++) {
              if (wordCount < 2) {
                context += (context ? " " : "") + words[i]
                wordCount++
              }
            }
          }
          
          // If we found a newline, stop looking forward
          if (text.includes("\n")) break
        }
      }
      
      return wordCount === 2 ? context + "..." : context
    }

    if (current![0] === -1 && next && next[0] === 1) {
      processed.push({
        id: `diff-${i}-replacement`,
        type: 2 as DiffType,
        text: current![1],
        category,
        replacement: next![1],
        contextBefore: getContext(diffs, i),
        contextAfter: getContextAfter(diffs, i + 1),
      })
      i++
    } else {
      processed.push({
        id: `diff-${i}`,
        type: current![0] as DiffType,
        text: current![1],
        category,
        contextBefore: getContext(diffs, i),
        contextAfter: getContextAfter(diffs, i),
      })
    }
  }

  return processed
}

function diff_wordsToChars_(text1: string, text2: string) {
  const wordArray: string[] = []
  const wordHash: Record<string, number> = {}

  function diff_textToWords(text: string): string {
    let wordStart = 0
    let wordEnd = -1
    let chars = ""
    while (wordStart < text.length) {
      // Find the next run of whitespace
      const whitespaceMatch = text.slice(wordStart).match(/^\s+/)
      if (whitespaceMatch && whitespaceMatch.index === 0) {
        wordEnd = wordStart + whitespaceMatch[0].length
      } else {
        // Find the next run of non-whitespace
        const nonWhitespaceMatch = text.slice(wordStart).match(/^\S+/)
        if (nonWhitespaceMatch && nonWhitespaceMatch.index === 0) {
          wordEnd = wordStart + nonWhitespaceMatch[0].length
        } else {
          wordEnd = text.length
        }
      }
      const word = text.substring(wordStart, wordEnd)
      if (word in wordHash) {
        chars += String.fromCharCode(wordHash[word]!)
      } else {
        wordArray.push(word)
        wordHash[word] = wordArray.length - 1
        chars += String.fromCharCode(wordArray.length - 1)
      }
      wordStart = wordEnd
    }
    return chars
  }

  const chars1 = diff_textToWords(text1)
  const chars2 = diff_textToWords(text2)
  return { chars1, chars2, lineArray: wordArray }
}

export function diff_wordMode(text1: string, text2: string) {
  const dmp = new diff_match_patch()
  const a = diff_wordsToChars_(text1, text2)
  const wordText1 = a.chars1
  const wordText2 = a.chars2
  const wordArray = a.lineArray
  const diffs = dmp.diff_main(wordText1, wordText2, false)
  dmp.diff_charsToLines_(diffs, wordArray)
  return diffs
}
