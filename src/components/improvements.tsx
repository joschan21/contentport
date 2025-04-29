import { useTweetContext } from "@/hooks/tweet-ctx"
import { cn, DiffWithReplacement } from "@/lib/utils"
import { Diff } from "diff-match-patch"
import {
  Sparkles,
  MoreHorizontal,
  Check,
  X,
  Info,
  ChevronRight,
} from "lucide-react"
import { useState } from "react"
import { Button } from "./ui/button"

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
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-500"
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
}: SuggestionCardProps) {
  const label = CATEGORY_LABELS[diff.category] || diff.category
  const actionLabel =
    diff.type === -1 ? "Remove" : diff.type === 1 ? "Add" : "Replace"
  const icon = ACTION_ICONS[actionLabel]
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div
      className="border bg-white rounded-md px-4 py-2"
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
          <Button onClick={onAccept} size="sm">
            <Check className="w-4 h-4" /> Apply
          </Button>
          <Button onClick={onReject} variant="ghost" size="sm">
            <X className="w-4 h-4" /> Reject
          </Button>
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
              {diff.text.startsWith(" ") ? null : " "}
              {diff.text}
            </span>
          ) : diff.type === 2 ? (
            <>
              {" "}
              <span className="line-through font-medium text-stone-400">
                {diff.text}
              </span>
              <span className="text-emerald-700 font-medium">
                {" "}
                {diff.replacement}
              </span>{" "}
            </>
          ) : null}
          {diff.contextAfter && (
            <span className="text-stone-700">{diff.contextAfter}</span>
          )}
        </div>
      )}
    </div>
  )
}

export const Improvements = () => {
  const { tweets, acceptImprovement, rejectImprovement } = useTweetContext()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const allImprovements = tweets
    .flatMap((tweet) => {
      // Get all improvement categories from the tweet
      const improvementCategories = Object.keys(tweet.improvements || {})

      // Flatten all improvements from all categories
      return improvementCategories.flatMap(
        (category) =>
          tweet.improvements?.[category]?.map((diff, index) => ({
            id: `${tweet.id}-${category}-${index}`,
            tweet,
            diff,
            index,
            category,
          })) ?? []
      )
    })
    .filter(
      (
        item
      ): item is {
        id: string
        tweet: any
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
    tweetId: string,
    diff: DiffWithReplacement
  ) => {
    acceptImprovement(tweetId, diff)
    setExpandedId(null)
  }

  const handleRejectImprovement = (
    tweetId: string,
    diff: DiffWithReplacement
  ) => {
    rejectImprovement(tweetId, diff)
    setExpandedId(null)
  }

  return (
    <div className="space-y-1">
      {allImprovements.length > 0 ? (
        <>
          {allImprovements.map(({ id, tweet, diff, category }) => {
            const tweetId = tweet.id

            if (diff.type === 2) {
              return (
                <SuggestionCard
                  key={id}
                  diff={diff}
                  onAccept={() => handleAcceptImprovement(tweetId, diff)}
                  onReject={() => handleRejectImprovement(tweetId, diff)}
                />
              )
            }
            if (diff.type === 1) {
              return (
                <SuggestionCard
                  key={id}
                  diff={diff}
                  onAccept={() => handleAcceptImprovement(tweetId, diff)}
                  onReject={() => handleRejectImprovement(tweetId, diff)}
                />
              )
            }
            return (
              <SuggestionCard
                key={id}
                diff={diff}
                onAccept={() => handleAcceptImprovement(tweetId, diff)}
                onReject={() => handleRejectImprovement(tweetId, diff)}
              />
            )
          })}
        </>
      ) : (
        <div className="flex h-full text-left">
          <p className="inline-flex gap-0.5 items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20 ring-inset">
            <Check className="size-3" /> All changes applied
          </p>
        </div>
      )}
    </div>
  )
}
