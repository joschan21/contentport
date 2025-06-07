import { useTweetContext } from "@/hooks/tweet-ctx"
import { cn, DiffWithReplacement } from "@/lib/utils"
import {
  Check,
  ChevronRight,
  X
} from "lucide-react"
import { useState } from "react"
import DuolingoButton from "./ui/duolingo-button"

const CategoryIcon = ({ category }: { category: string }) => {
  // Define colors for different categories
  const getCategoryColors = (category: string) => {
    switch (category) {
      case "clarity":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-500"
      case "write-initial-tweet":
        return "bg-green-100 dark:bg-green-900/30 text-green-500"
      case "tone":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-500"
      case "grammar":
        return "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500"
      default:
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-500"
    }
  }

  const colors = getCategoryColors(category)

  return (
    <div
      className={`size-4 rounded-full ${colors.split(" ")[0]} flex items-center justify-center`}
    >
      <div className={`size-2 rounded-full ${colors.split(" ")[2]}`} />
    </div>
  )
}

const CATEGORY_LABELS: Record<string, string> = {
  "write-initial-content": "Initial Content",
  clarity: "Clarity",
  tone: "Tone",
  grammar: "Grammar",
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  Add: <span>✍️</span>,
  Remove: <span>❌</span>,
  Replace: <span>💡</span>,
}

type SuggestionCardProps = {
  diff: DiffWithReplacement
  onAccept: () => void
  onReject: () => void
}

export function SuggestionCard({
  diff,
  onAccept,
  onReject,
  isFirst = false,
}: SuggestionCardProps & { isFirst?: boolean }) {
  const label = CATEGORY_LABELS[diff.category] || diff.category
  const actionLabel =
    diff.type === -1 ? "Remove" : diff.type === 1 ? "Add" : "Replace"
  const icon = ACTION_ICONS[actionLabel]
  const [isExpanded, setIsExpanded] = useState(isFirst)

  return (
    <div
      className="px-3 py-2 bg-stone-50 rounded-sm"
      tabIndex={0}
      aria-label={`Suggestion: ${label}`}
      onKeyDown={(e) => {
        if (e.key === "Enter") onAccept()
        if (e.key === "Escape") onReject()
      }}
    >
      <div className="flex items-center">
        <div
          className="flex items-center flex-1 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="text-sm mr-2">{icon}</span>
          <span className="text-stone-700 text-sm">{actionLabel} content</span>
          <ChevronRight
            className={`w-4 h-4 ml-2 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          />
        </div>
        <div className="flex gap-2 ml-auto">
          <DuolingoButton className="h-8" onClick={onAccept} size="sm">
            <Check className="w-4 h-4 mr-1" /> Apply
          </DuolingoButton>
          <DuolingoButton className="h-8" variant="destructive" onClick={onReject} size="sm">
            <X className="w-4 h-4" /> Reject
          </DuolingoButton>
        </div>
      </div>

      {isExpanded && (
        <div
          className={cn(
            "mt-3 text-sm leading-relaxed px-2 py-2 rounded  whitespace-pre-wrap",
            {
              "bg-emerald-50": diff.type === 1,
              "bg-rose-50": diff.type === -1,
              "bg-teal-50": diff.type === 2,
            }
          )}
        >
          {diff.contextBefore && (
            <span className="text-stone-700">{diff.contextBefore}</span>
          )}
          {diff.type === -1 ? (
            <span className="line-through font-medium text-stone-400">
              {diff.text.startsWith(" ") ? null : " "}
              {diff.text}
              {diff.text.endsWith(" ") ? null : " "}
            </span>
          ) : diff.type === 1 ? (
            <span className="text-emerald-700 font-medium">
              {/* {diff.text.startsWith(" ") ? null : " "} */}
              {diff.text.trim()}
            </span>
          ) : diff.type === 2 ? (
            <>
              {" "}
              <span className="line-through font-medium text-stone-400">
                {diff.text.trimEnd()}
              </span>
              <span className="text-emerald-700 font-medium">
                {" "}
                {diff.replacement?.trimEnd()}
              </span>{" "}
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

function ContextAfter({
  diff,
  text,
}: {
  diff: DiffWithReplacement
  text: string
}) {
  if (diff.type === 2 && diff.text.endsWith("\n")) return null
  return <span className="text-stone-700">{text}</span>
}

export const Improvements = () => {
  const { tweet, acceptImprovement, rejectImprovement } = useTweetContext()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const allImprovements = (() => {
    if (!tweet || !tweet.improvements) return []
    
    const improvementCategories = Object.keys(tweet.improvements)
    return improvementCategories.flatMap(
      (category) =>
        tweet.improvements[category]?.map((diff, index) => ({
          id: `${tweet.id}-${category}-${index}`,
          diff,
          index,
          category,
        })) ?? []
    )
  })()
    .filter(
      (
        item
      ): item is {
        id: string
        diff: DiffWithReplacement
        index: number
        category: string
      } =>
        item.diff !== undefined &&
        (item.diff.type === 2 || item.diff.type === -1 || item.diff.type === 1)
    )

  if (allImprovements.length > 0 && !expandedId) {
    setExpandedId(allImprovements[0]!.id)
  }

  const handleAcceptImprovement = (
    diff: DiffWithReplacement
  ) => {
    if (!tweet) return
    acceptImprovement(tweet.id, diff)
    setExpandedId(null)
  }

  const handleRejectImprovement = (
    diff: DiffWithReplacement
  ) => {
    if (!tweet) return
    rejectImprovement(tweet.id, diff)
    setExpandedId(null)
  }

  return (
    <div className="relative w-full">
      <div className="h-full w-full">
        {allImprovements.length > 0 ? (
          <div className="space-y-1" >
            {allImprovements.map(({ id, diff }, index) => {
              return (
                <SuggestionCard
                  key={id}
                  diff={diff}
                  onAccept={() => handleAcceptImprovement(diff)}
                  onReject={() => handleRejectImprovement(diff)}
                  isFirst={index === 0}
                />
              )
            })}
          </div>
        ) : (
          <div className="flex justify-center h-full w-full text-left bg-emerald-50 ring-1 ring-emerald-600/20 ring-inset rounded-md shadow-[0_2px_0_#d1fae5]">
            <p className="inline-flex gap-0.5 items-center px-2 py-1 text-xs font-medium text-emerald-700 ">
              <Check className="size-3" /> All applied
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
