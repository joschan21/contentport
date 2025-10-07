import { Keyword } from '@/app/studio/topic-monitor/feed-settings-modal'
import React from 'react'

const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null))

  for (let i = 0; i <= str1.length; i++) {
    matrix[0]![i] = i
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j]![0] = j
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[j]![i] = Math.min(
        matrix[j]![i - 1]! + 1,
        matrix[j - 1]![i]! + 1,
        matrix[j - 1]![i - 1]! + indicator,
      )
    }
  }

  return matrix[str2.length]![str1.length]!
}

const fuzzyIncludes = (text: string, keyword: string, tolerance: number = 1): boolean => {
  const textLower = text.toLowerCase()
  const keywordLower = keyword.toLowerCase()

  if (textLower.includes(keywordLower)) {
    return true
  }

  const words = textLower.split(/\s+/)

  return words.some((word) => {
    if (word.length < keywordLower.length - tolerance) {
      return false
    }

    for (let i = 0; i <= word.length - keywordLower.length + tolerance; i++) {
      for (
        let j = keywordLower.length - tolerance;
        j <= keywordLower.length + tolerance;
        j++
      ) {
        if (i + j > word.length) continue

        const substring = word.substring(i, i + j)
        if (
          substring.length >= keywordLower.length - tolerance &&
          levenshteinDistance(substring, keywordLower) <= tolerance
        ) {
          return true
        }
      }
    }

    return false
  })
}

interface HighlightMatch {
  start: number
  end: number
  keyword: Keyword
}

const findFuzzyMatches = (
  text: string,
  keywords: Keyword[],
  tolerance: number = 1,
): HighlightMatch[] => {
  const matches: HighlightMatch[] = []
  const textLower = text.toLowerCase()

  for (const keyword of keywords) {
    const keywordLower = keyword.text.toLowerCase()

    let searchIndex = 0
    while (searchIndex < text.length) {
      const exactMatch = textLower.indexOf(keywordLower, searchIndex)
      if (exactMatch !== -1) {
        matches.push({
          start: exactMatch,
          end: exactMatch + keyword.text.length,
          keyword,
        })
        searchIndex = exactMatch + keyword.text.length
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
  keywords: Keyword[],
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
