import { useTweets } from '@/hooks/use-tweets'
import { cn, DiffWithReplacement } from '@/lib/utils'
import { Check, ChevronRight, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import DuolingoButton from './ui/duolingo-button'

const CATEGORY_LABELS: Record<string, string> = {
  'write-initial-content': 'Initial Content',
  clarity: 'Clarity',
  tone: 'Tone',
  grammar: 'Grammar',
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  Add: <span>✍️</span>,
  Remove: <span>❌</span>,
  Replace: <span>💡</span>,
}

type SuggestionCardProps = {
  diff: DiffWithReplacement
  expanded: boolean
  onAccept: () => void
  onReject: () => void
}

export function SuggestionCard({
  diff,
  onAccept,
  onReject,
  expanded = false,
}: SuggestionCardProps & { isFirst?: boolean }) {
  const label = CATEGORY_LABELS[diff.category] || diff.category
  const actionLabel = diff.type === -1 ? 'Remove' : diff.type === 1 ? 'Add' : 'Replace'
  const icon = ACTION_ICONS[actionLabel]
  const [isExpanded, setIsExpanded] = useState(expanded)

  useEffect(() => {
    setIsExpanded(expanded)
  }, [expanded])

  return (
    <div
      className="px-3 py-2 bg-white border border-stone-200 bg-clip-padding rounded-lg"
      tabIndex={0}
      aria-label={`Suggestion: ${label}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onAccept()
        if (e.key === 'Escape') onReject()
      }}
    >
      <div className="flex items-center">
        <div
          className="flex items-center flex-1 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="text-sm mr-2">{icon}</span>
          <span className="text-stone-700 text-sm">{actionLabel}</span>
          <ChevronRight
            className={`w-4 h-4 ml-2 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        </div>
        <div className="flex gap-2 ml-auto">
          <DuolingoButton className="h-8" onClick={onAccept} size="sm">
            <Check className="w-4 h-4 mr-1" /> Apply
          </DuolingoButton>
          <DuolingoButton
            className="h-8"
            variant="destructive"
            onClick={onReject}
            size="sm"
          >
            <X className="w-4 h-4" /> Reject
          </DuolingoButton>
        </div>
      </div>

      {isExpanded && (
        <div
          className={cn(
            'mt-3 text-sm leading-relaxed px-2 py-2 rounded  whitespace-pre-wrap',
            {
              'bg-emerald-50': diff.type === 1,
              'bg-rose-50': diff.type === -1,
              'bg-teal-50': diff.type === 2,
            },
          )}
        >
          {diff.contextBefore && (
            <span className="text-stone-700">{diff.contextBefore}</span>
          )}
          {diff.type === -1 ? (
            <span className="line-through font-medium text-stone-400">
              {diff.text.startsWith(' ') ? null : ' '}
              {diff.text}
              {diff.text.endsWith(' ') ? null : ' '}
            </span>
          ) : diff.type === 1 ? (
            <span className="text-emerald-700 font-medium">
              {/* {diff.text.startsWith(" ") ? null : " "} */}
              {diff.text.trim()}
            </span>
          ) : diff.type === 2 ? (
            <>
              {' '}
              <span className="line-through font-medium text-stone-400">
                {diff.text.trimEnd()}
              </span>
              <span className="text-emerald-700 font-medium">
                {' '}
                {diff.replacement?.trimEnd()}
              </span>{' '}
            </>
          ) : null}
          {diff.contextAfter ? (
            <ContextAfter diff={diff} text={diff.contextAfter} />
          ) : null}
        </div>
      )}
    </div>
  )
}

function ContextAfter({ diff, text }: { diff: DiffWithReplacement; text: string }) {
  if (diff.type === 2 && diff.text.endsWith('\n')) return null
  return <span className="text-stone-700">{text}</span>
}

export const Improvements = ({ empty }: { empty?: boolean }) => {
  const { tweetId, improvements, acceptImprovement, rejectImprovement } = useTweets()

  const visibleImprovements = empty ? [] : improvements.filter((i) => i.type !== 0)

  const handleAcceptImprovement = async (diff: DiffWithReplacement) => {
    acceptImprovement(diff)
  }

  const handleRejectImprovement = (diff: DiffWithReplacement) => {
    rejectImprovement(diff)
  }

  if (visibleImprovements.length === 0) return null

  return (
    <div className="relative w-full">
      <div className="h-full w-full">
        {visibleImprovements && visibleImprovements.length ? (
          <div className="space-y-1">
            <p className="text-sm/7 font-medium text-black">Improvements</p>
            {visibleImprovements.map((diff, index) => {
              return (
                <SuggestionCard
                  key={diff.id}
                  diff={diff}
                  expanded={index === 0}
                  onAccept={() => {
                    // accepting while viewing a different tweet
                    // if (diff.tweetId !== tweetId) {
                    //   navigateToTweet(diff.tweetId)
                    // }

                    handleAcceptImprovement(diff)
                  }}
                  onReject={() => {
                    // rejecting while viewing a different tweet
                    // if (diff.tweetId !== tweetId) {
                    //   setTweetId(diff.tweetId)
                    // }

                    handleRejectImprovement(diff)
                  }}
                />
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
