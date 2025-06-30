import { diff_wordMode } from '@/lib/diff-utils'
import { chunkDiffs, DiffWithReplacement, processDiffs } from '@/lib/utils'

const before = 'their tools get better month over month'
const after = 'their cloud tools get better month over month'

const diffs = diff(before, after)

function diff(currentContent: string, newContent: string): DiffWithReplacement[] {
  const rawDiffs = diff_wordMode(currentContent, newContent)
  const chunkedDiffs = chunkDiffs(rawDiffs)
  return processDiffs(chunkedDiffs)
}

console.log(diffs);
