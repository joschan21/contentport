import { clsx, type ClassValue } from 'clsx'
import { Diff, diff_match_patch } from 'diff-match-patch'
import { createSerializer, parseAsString } from 'nuqs'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type DiffType = -1 | 0 | 1 | 2

export type DiffWithReplacement = {
  tweetId: string
  id: string
  type: DiffType
  text: string
  category: string
  replacement?: string
  lexicalKey?: string
  contextBefore?: string
  contextAfter?: string
}

export function diff_lineMode(text1: string, text2: string) {
  var dmp = new diff_match_patch()
  var a = dmp.diff_linesToChars_(text1, text2)
  var lineText1 = a.chars1
  var lineText2 = a.chars2
  var lineArray = a.lineArray
  var diffs = dmp.diff_main(lineText1, lineText2, false)
  dmp.diff_charsToLines_(diffs, lineArray)
  return diffs
}

export const processDiffs = (tweetId: string, diffs: Diff[]): DiffWithReplacement[] => {
  const processed: DiffWithReplacement[] = []
  const category =
    diffs.length === 1 && diffs.every((d) => d[0] === 1)
      ? 'write-initial-content'
      : 'clarity'

  for (let i = 0; i < diffs.length; i++) {
    const current = diffs[i]
    const next = diffs[i + 1]
    const prev = diffs[i - 1]

    if (!current?.[1].includes('\n') && !current![1].trim()) continue

    // sometimes LLM did bullshit changes to just insert a space
    // if (
    //   current![0] === -1 &&
    //   next![0] === 1 &&
    //   current![1].trim() === next![1].trim()
    // ) {
    //   processed.push({
    //     id: `diff-${i}`,
    //     type: 0 as DiffType,
    //     text: current![1],
    //     category,
    //   })
    //   i++
    //   continue
    // }

    const getContext = (diffs: Diff[], index: number): string => {
      let context = ''
      let wordCount = 0

      for (let j = 1; j <= 3; j++) {
        const diff = diffs[index - j]
        if (diff && diff[0] === 0) {
          const text = diff[1]
          const lines = text.split('\n')
          const lastLine = lines[lines.length - 1]

          if (lastLine?.trim()) {
            const words = lastLine.trim().split(/\s+/)
            for (let i = words.length - 1; i >= 0; i--) {
              if (wordCount < 2) {
                context = words[i] + (context ? ' ' + context : '')
                wordCount++
              }
            }
          }
        }
      }

      return wordCount === 2 ? '...' + context : context
    }

    const getContextAfter = (diffs: Diff[], index: number): string => {
      let context = ""
      let wordCount = 0

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
        }
      }

      return wordCount === 2 ? context + "..." : context
    }

    // Check if we have a sequence of diffs that should be combined
    // Example: [-1, 'stay'], [0, ' '], [-1, 'tuned'] should become [-1, 'stay tuned']
    // And [1, "can't wait to"], [0, ' '], [1, 'show it in action'] should become [1, "can't wait to show it in action"]
    if (
      current &&
      next &&
      next[0] === current[0] &&
      i + 2 < diffs.length &&
      diffs[i + 1]?.[0] === 0 &&
      !diffs[i + 1]?.[1].includes('\n') &&
      diffs[i + 1]?.[1].trim() === '' &&
      diffs[i + 2]?.[0] === current[0]
    ) {
      // Combine the diffs
      const combinedText = current[1] + diffs[i + 1]![1] + diffs[i + 2]![1]

      if (current[0] === -1 && i + 3 < diffs.length && diffs[i + 3]?.[0] === 1) {
        processed.push({
          tweetId,
          id: `diff-${i}-replacement`,
          type: 2 as DiffType,
          text: combinedText,
          category,
          replacement: diffs[i + 3]![1],
          contextBefore: getContext(diffs, i),
          contextAfter: getContextAfter(diffs, i + 3),
        })
        i += 3 // Skip the next three diffs
      } else {
        // This is just an addition or deletion
        processed.push({
          tweetId,
          id: `diff-${i}`,
          type: current[0] as DiffType,
          text: combinedText,
          category,
          contextBefore: getContext(diffs, i),
          contextAfter: getContextAfter(diffs, i + 2),
        })
        i += 2 // Skip the next two diffs
      }
    } else if (current![0] === -1 && next && next[0] === 1) {
      processed.push({
        tweetId,
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
        tweetId,
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
    let chars = ''
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
