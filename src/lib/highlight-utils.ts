import React from 'react'
import { levenshteinDistance } from './utils'

interface HighlightMatch {
  start: number
  end: number
  keyword: string
}

const findFuzzyMatches = (
  text: string,
  keywords: string[],
  tolerance: number = 1,
): HighlightMatch[] => {
  const matches: HighlightMatch[] = []
  const textLower = text.toLowerCase()

  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase()

    let searchIndex = 0
    while (searchIndex < text.length) {
      const exactMatch = textLower.indexOf(keywordLower, searchIndex)
      if (exactMatch !== -1) {
        matches.push({
          start: exactMatch,
          end: exactMatch + keyword.length,
          keyword,
        })
        searchIndex = exactMatch + keyword.length
        continue
      }

      const words = text.substring(searchIndex).split(/(\s+)/)
      let currentIndex = searchIndex
      let foundMatch = false

      for (let i = 0; i < words.length; i++) {
        const word = words[i]!
        if (!word || /^\s+$/.test(word)) {
          currentIndex += word.length
          continue
        }

        const wordLower = word.toLowerCase()

        if (wordLower.length >= keywordLower.length - tolerance) {
          for (let j = 0; j <= word.length - keywordLower.length + tolerance; j++) {
            for (
              let k = keywordLower.length - tolerance;
              k <= Math.min(keywordLower.length + tolerance, word.length - j);
              k++
            ) {
              if (k <= 0) continue

              const substring = wordLower.substring(j, j + k)
              if (
                substring.length >= keywordLower.length - tolerance &&
                levenshteinDistance(substring, keywordLower) <= tolerance
              ) {
                matches.push({
                  start: currentIndex + j,
                  end: currentIndex + j + k,
                  keyword,
                })
                searchIndex = currentIndex + j + k
                foundMatch = true
                break
              }
            }
            if (foundMatch) break
          }
        }

        if (foundMatch) break
        currentIndex += word.length
      }

      if (!foundMatch) {
        break
      }
    }
  }

  return matches.sort((a, b) => a.start - b.start)
}

const mergeOverlappingMatches = (matches: HighlightMatch[]): HighlightMatch[] => {
  if (matches.length === 0) return []

  const merged: HighlightMatch[] = []
  let current = matches[0]!

  for (let i = 1; i < matches.length; i++) {
    const next = matches[i]!

    if (next.start <= current.end) {
      current = {
        start: current.start,
        end: Math.max(current.end, next.end),
        keyword: current.keyword,
      }
    } else {
      merged.push(current)
      current = next
    }
  }

  merged.push(current)
  return merged
}

export const highlightText = (
  text: string,
  keywords: string[],
): (string | React.ReactElement)[] => {
  if (!keywords.length || !text) return [text]

  const matches = findFuzzyMatches(text, keywords)
  const mergedMatches = mergeOverlappingMatches(matches)

  if (mergedMatches.length === 0) return [text]

  const result: (string | React.ReactElement)[] = []
  let lastIndex = 0

  for (let i = 0; i < mergedMatches.length; i++) {
    const match = mergedMatches[i]!

    if (match.start > lastIndex) {
      result.push(text.substring(lastIndex, match.start))
    }

    result.push(
      React.createElement(
        'mark',
        {
          key: `highlight-${i}`,
          className: 'bg-yellow-200 text-yellow-900 rounded',
        },
        text.substring(match.start, match.end),
      ),
    )

    lastIndex = match.end
  }

  if (lastIndex < text.length) {
    result.push(text.substring(lastIndex))
  }

  return result
}
