import { diff_match_patch } from "diff-match-patch"

function diff_wordMode(text1: string, text2: string) {
  const dmp = new diff_match_patch()
  
  // Split texts into words while preserving whitespace
  const words1 = text1.split(/(\s+)/)
  const words2 = text2.split(/(\s+)/)
  
  // Convert words to single characters for diffing
  const wordToChar: Record<string, string> = {}
  const charToWord: string[] = []
  let charCode = 0
  
  const getCharForWord = (word: string) => {
    if (!wordToChar[word]) {
      wordToChar[word] = String.fromCharCode(charCode++)
      charToWord.push(word)
    }
    return wordToChar[word]
  }
  
  const chars1 = words1.map(getCharForWord).join('')
  const chars2 = words2.map(getCharForWord).join('')
  
  // Get the diff
  const diffs = dmp.diff_main(chars1, chars2, false)
  dmp.diff_cleanupSemantic(diffs)
  
  // Convert back to words
  return diffs.map(([type, chars]) => {
    const words = chars.split('').map(char => charToWord[char.charCodeAt(0)]).join('')
    return [type, words] as [number, string]
  })
}

export { diff_wordMode }
