import { diff_match_patch, Diff } from "diff-match-patch"

const WORD_BOUNDARY_PATTERN = /\W/

const dmp = new diff_match_patch()

const diff_wordsToChars_ = function (text1: string, text2: string) {
  const wordArray: string[] = []
  const wordHash: { [x: string]: number } = {}

  wordArray[0] = ""

  const diff_linesToWordsMunge_ = (text: string) => {
    let chars = ""
    let wordArrayLength = wordArray.length
    tokenize(text, (word) => {
      if (
        wordHash.hasOwnProperty
          ? wordHash.hasOwnProperty(word)
          : wordHash[word] !== undefined
      ) {
        chars += String.fromCharCode(wordHash[word]!)
      } else {
        chars += String.fromCharCode(wordArrayLength)
        wordHash[word] = wordArrayLength
        // tslint:disable-next-line:no-increment-decrement
        wordArray[wordArrayLength++] = word
      }
    })
    return chars
  }

  const chars1 = diff_linesToWordsMunge_(text1)
  const chars2 = diff_linesToWordsMunge_(text2)
  return { chars1, chars2, lineArray: wordArray }
}

const diff_wordMode = function (text1: string, text2: string) {
  const { chars1, chars2, lineArray } = diff_wordsToChars_(text1, text2)
  const diffs = dmp.diff_main(chars1, chars2, false)
  dmp.diff_charsToLines_(diffs, lineArray)
  return diffs
}

export function chunkDiffs(
  diffs: Diff[],
  index = 0,
  result: Diff[] = []
): Diff[] {
  const current = diffs[index]
  const next = diffs[index + 1]

  // Base case: no more diffs
  if (!current) return result

  // Try to match alternating pattern: -1, 1, optional 0 (whitespace), -1, 1, etc.
  if (current[0] === -1 && next?.[0] === 1) {
    let group = [current, next]
    let cursor = index + 2

    // Capture interleaved whitespace and diff pairs
    while (cursor < diffs.length) {
      const ws = diffs[cursor]
      const d1 = diffs[cursor + 1]
      const d2 = diffs[cursor + 2]

      if (
        ws &&
        ws[0] === 0 &&
        !ws[1].trim() &&
        d1?.[0] === -1 &&
        d2?.[0] === 1
      ) {
        group.push(ws, d1, d2)
        cursor += 3
      } else {
        break
      }
    }

    // Merge the grouped diffs into one -1 and one +1
    const removal = group
      .filter((d) => d[0] === -1 || d[0] === 0)
      .map((d) => d[1])
      .join("")
    const addition = group
      .filter((d) => d[0] === 1 || d[0] === 0)
      .map((d) => d[1])
      .join("")

    result.push([-1, removal], [1, addition])

    return chunkDiffs(diffs, cursor, result)
  }

  // No pattern matched; just include the current diff
  result.push(current)
  return chunkDiffs(diffs, index + 1, result)
}

// const res = diff_wordMode(t1, t2)

// const newDiffs = chunkDiffs(res)

// console.log("res", newDiffs)

function indexOfWordBoundary(target: string, startIndex: number): number {
  const n = target.length
  for (let i = startIndex; i < n; i += 1) {
    if (WORD_BOUNDARY_PATTERN.test(target[i]!)) {
      return i
    }
  }
  return -1
}

export default function tokenize(
  text: string,
  callback: (word: string) => void
): void {
  let wordStart = 0
  let wordEnd = -1
  while (wordEnd < text.length - 1) {
    wordEnd = indexOfWordBoundary(text, wordStart)
    if (wordEnd !== -1) {
      if (wordStart !== wordEnd) {
        const word = text.substring(wordStart, wordEnd)
        callback(word)
      }
      const punct = text[wordEnd]
      callback(punct!)
      wordStart = wordEnd + 1
    } else {
      const word = text.substring(wordStart, text.length)
      callback(word)
      wordEnd = text.length
      break
    }
  }
}
