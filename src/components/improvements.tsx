import { useTweets } from '@/hooks/use-tweets'
import { cn, DiffWithReplacement } from '@/lib/utils'
import { Check, ChevronRight, X, ChevronLeft, Trash, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import DuolingoButton from './ui/duolingo-button'
import { useEditor } from '@/hooks/use-editors'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Icons } from './icons'
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical'
import toast from 'react-hot-toast'
import { AccountAvatar, AccountHandle, AccountName } from '@/hooks/account-ctx'
import { usePathname } from 'next/navigation'

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

interface Draft {
  id: string
  improvedText: string
  diffs: DiffWithReplacement[]
}

function DraftsSelector({ drafts }: { drafts: Draft[] }) {
  const pathname = usePathname()
  const { shadowEditor } = useTweets()

  const [draftDecisionMade, setDraftDecisionMade] = useState<
    'applied' | 'rejected' | null
  >(null)
  const {
    showImprovementsInEditor,
    resetImprovements,
    clearDrafts,
    draftCheckpoint,
    selectedDraftIndex,
    setSelectedDraftIndex,
  } = useTweets()

  const currentDraft = drafts[selectedDraftIndex]

  useEffect(() => {
    if (!currentDraft) return

    console.log('diffs', currentDraft.diffs)
    showImprovementsInEditor(currentDraft.diffs)
  }, [pathname, currentDraft])

  const applyDraft = (content: string, index: number) => {
    shadowEditor.update(
      () => {
        const root = $getRoot()
        const p = $createParagraphNode()
        const text = $createTextNode(content)
        p.append(text)
        root.clear()
        root.append(p)
      },
      { tag: 'force-sync' },
    )

    setSelectedDraftIndex(index)
    setDraftDecisionMade('applied')
  }

  const handleApplyCurrentDraft = () => {
    if (currentDraft) {
      applyDraft(currentDraft.improvedText, selectedDraftIndex)
      clearDrafts()
    }
  }

  const handleRejectAllDrafts = () => {
    resetImprovements()

    shadowEditor.update(
      () => {
        const root = $getRoot()
        const p = $createParagraphNode()
        const text = $createTextNode(draftCheckpoint.current ?? '')
        p.append(text)
        root.clear()
        root.append(p)
      },
      { tag: 'force-sync' },
    )

    draftCheckpoint.current = null

    setDraftDecisionMade('rejected')
    clearDrafts()
  }

  const cycleDraft = (direction: 'next' | 'prev') => {
    const newIndex =
      direction === 'next'
        ? (selectedDraftIndex + 1) % drafts.length
        : (selectedDraftIndex - 1 + drafts.length) % drafts.length

    setSelectedDraftIndex(newIndex)
  }

  if (!currentDraft) return null

  return (
    <div className="relative w-full space-y-3">
      <div className="relative rounded-lg w-full">
        <div className="relative text-left rounded-md bg-white border border-gray-200 shadow-md bg-clip-padding overflow-hidden">
          <div className="flex items-start gap-3 p-6">
            <AccountAvatar />
            <div className="flex flex-col flex-1">
              <div className="flex items-center gap-2">
                <AccountName />
                <AccountHandle />
              </div>
              <div className="mt-1 text-base leading-relaxed whitespace-pre-line">
                {currentDraft.improvedText}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!draftDecisionMade && (
        <div className="flex justify-center items-center z-[99]">
          {drafts.length > 1 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <DuolingoButton
                  size="icon"
                  variant="secondary"
                  onClick={() => cycleDraft('prev')}
                  className="h-7 w-7"
                >
                  <ChevronLeft className="size-3" />
                </DuolingoButton>
                <span className="text-xs text-stone-500 px-2">
                  {selectedDraftIndex + 1}/{drafts.length}
                </span>
                <DuolingoButton
                  size="icon"
                  variant="secondary"
                  onClick={() => cycleDraft('next')}
                  className="h-7 w-7"
                >
                  <ChevronRight className="size-3" />
                </DuolingoButton>
              </div>
            </div>
          )}
        </div>
      )}

      {!draftDecisionMade && (
        <div className="w-full flex items-center justify-between">
          <div className="w-full flex flex-col gap-1.5">
            <div className="w-full flex gap-1.5">
              <DuolingoButton
                className="flex items-center gap-1.5 text-xs"
                onClick={handleApplyCurrentDraft}
              >
                <Check className="size-4" />
                Apply
              </DuolingoButton>
              <DuolingoButton
                variant="destructive"
                className="flex items-center gap-1.5 text-xs"
                onClick={handleRejectAllDrafts}
              >
                <Trash className="size-4" />
                Reject all
              </DuolingoButton>
            </div>
          </div>
        </div>
      )}

      {draftDecisionMade === 'applied' && (
        <div className="w-full flex items-center justify-center pt-2">
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
            <Check className="size-4" />
            <span className="text-sm font-medium">Draft applied</span>
          </div>
        </div>
      )}

      {draftDecisionMade === 'rejected' && (
        <div className="w-full flex items-center justify-center pt-4">
          <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
            <Trash className="size-4" />
            <span className="text-sm font-medium">All drafts rejected</span>
          </div>
        </div>
      )}
    </div>
  )
}

export const Improvements = ({ empty }: { empty?: boolean }) => {
  const { tweetId, improvements, acceptImprovement, rejectImprovement, drafts } =
    useTweets()

  const visibleImprovements = empty ? [] : improvements.filter((i) => i.type !== 0 && !Boolean(i.rejected))

  const handleAcceptImprovement = async (diff: DiffWithReplacement) => {
    acceptImprovement(diff, improvements)
  }

  const handleRejectImprovement = (diff: DiffWithReplacement) => {
    rejectImprovement(diff, improvements)
  }

  const showDrafts = drafts.length > 0
  const showImprovements = visibleImprovements.length > 0

  if (!showDrafts && !showImprovements) return null

  return (
    <div className="relative w-full space-y-4">
      {showDrafts && (
        <div className="h-full w-full">
          <DraftsSelector drafts={drafts} />
        </div>
      )}

      {showImprovements && (
        <div className="h-full w-full max-h-80 overflow-y-scroll">
          <div className="space-y-1">
            <p className="text-sm/7 font-medium text-black">Improvements</p>
            {visibleImprovements.map((diff, index) => {
              return (
                <SuggestionCard
                  key={diff.id}
                  diff={diff}
                  expanded={index === 0}
                  onAccept={() => {
                    handleAcceptImprovement(diff)
                  }}
                  onReject={() => {
                    handleRejectImprovement(diff)
                  }}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
