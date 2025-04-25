import { useTweetContext } from "@/hooks/tweet-ctx"
import { DiffWithReplacement } from "@/server/routers/improvement-router"
import { Diff } from "diff-match-patch"
import { Sparkles, MoreHorizontal } from "lucide-react"
import { useState } from "react"

const CategoryIcon = ({ category }: { category: string }) => {
  return (
    <div className="size-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
      <div className="size-2 rounded-full bg-blue-500" />
    </div>
  )
}

type SuggestionProps = {
  diff: DiffWithReplacement
  isExpanded: boolean
  onExpand: () => void
  onAccept: () => void
}

const Deletion = ({
  diff,
  isExpanded,
  onExpand,
  onAccept,
}: SuggestionProps) => {
  return (
    <div
      onClick={onExpand}
      className={`group border-b border-gray-100 dark:border-gray-800 last:border-0 cursor-pointer transition-all duration-200 ${
        isExpanded
          ? "bg-gray-50 dark:bg-gray-900/30"
          : "hover:bg-gray-50 dark:hover:bg-gray-900/30"
      }`}
    >
      <div className="px-3 py-2">
        {!isExpanded ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <CategoryIcon category={diff.category || "Clarity"} />
              <span className="text-gray-900 dark:text-gray-100 font-medium">
                Remove sentence
              </span>
            </div>
            <div className="pl-6">
              <span className="text-gray-500">{diff.text.slice(0, 30)}...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CategoryIcon category={diff.category || "Clarity"} />
              <span className="text-gray-900 dark:text-gray-100">
                Clarity · Remove for clarity
              </span>
              <button
                className="ml-auto text-gray-500 hover:text-gray-700"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-base text-gray-900 dark:text-gray-100">
                {diff.text}
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAccept()
                  }}
                >
                  Accept
                </button>
                <button
                  className="px-3 py-1 text-gray-600 hover:text-gray-900 text-sm font-medium"
                  onClick={(e) => {
                    e.stopPropagation()
                    onExpand()
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const Replacement = ({
  diff,
  isExpanded,
  onExpand,
  onAccept,
}: SuggestionProps) => {
  return (
    <div
      onClick={onExpand}
      className={`group border-b border-gray-100 dark:border-gray-800 last:border-0 cursor-pointer transition-all duration-200 ${
        isExpanded
          ? "bg-gray-50 dark:bg-gray-900/30"
          : "hover:bg-gray-50 dark:hover:bg-gray-900/30"
      }`}
    >
      <div className="px-3 py-2">
        {!isExpanded ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <CategoryIcon category={diff.category || "Clarity"} />
              <span className="text-gray-900 dark:text-gray-100 font-medium">
                Rephrase sentence
              </span>
            </div>
            <div className="pl-6">
              <span className="text-gray-500">{diff.text.slice(0, 30)}...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CategoryIcon category={diff.category || "Clarity"} />
              <span className="text-gray-900 dark:text-gray-100">
                Clarity · Rewrite for clarity
              </span>
              <button
                className="ml-auto text-gray-500 hover:text-gray-700"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-base text-gray-900 dark:text-gray-100">
                Change '<span className="replacement-node">{diff.text}</span>'
                <span className="mx-1">to</span>
                <span className="text-base text-gray-900 dark:text-gray-100">
                  '<span className="replacement-node">{diff.replacement}</span>'
                </span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAccept()
                  }}
                >
                  Accept
                </button>
                <button
                  className="px-3 py-1 text-gray-600 hover:text-gray-900 text-sm font-medium"
                  onClick={(e) => {
                    e.stopPropagation()
                    onExpand()
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const Addition = ({
  diff,
  isExpanded,
  onExpand,
  onAccept,
}: SuggestionProps) => {
  return (
    <div
      onClick={onExpand}
      className={`group border-b border-gray-100 dark:border-gray-800 last:border-0 cursor-pointer transition-all duration-200 ${
        isExpanded
          ? "bg-gray-50 dark:bg-gray-900/30"
          : "hover:bg-gray-50 dark:hover:bg-gray-900/30"
      }`}
    >
      <div className="px-3 py-2">
        {!isExpanded ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <CategoryIcon category={diff.category || "Clarity"} />
              <span className="text-gray-900 dark:text-gray-100 font-medium">
                Add sentence
              </span>
            </div>
            <div className="pl-6">
              <span className="text-gray-500">{diff.text.slice(0, 30)}...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CategoryIcon category={diff.category || "Clarity"} />
              <span className="text-gray-900 dark:text-gray-100">
                Clarity · Add for clarity
              </span>
              <button
                className="ml-auto text-gray-500 hover:text-gray-700"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-base text-gray-900 dark:text-gray-100">
                <span className="text-blue-600 dark:text-blue-400">
                  {diff.text}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAccept()
                  }}
                >
                  Accept
                </button>
                <button
                  className="px-3 py-1 text-gray-600 hover:text-gray-900 text-sm font-medium"
                  onClick={(e) => {
                    e.stopPropagation()
                    onExpand()
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const Improvements = () => {
  const { tweets, acceptImprovement } = useTweetContext()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const allImprovements = tweets
    .flatMap(
      (tweet) =>
        tweet.improvements?.clarity?.map((diff, index) => ({
          id: `${tweet.id}-${index}`,
          tweet,
          diff,
          index,
        })) ?? []
    )
    .filter(
      (
        item
      ): item is {
        id: string
        tweet: any
        diff: DiffWithReplacement
        index: number
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

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
      {allImprovements.length > 0 ? (
        <>
          {allImprovements.map(({ id, tweet, diff }) => {
            // We've already filtered out undefined tweets in the filter above
            const tweetId = tweet.id

            if (diff.type === 2) {
              return (
                <Replacement
                  key={id}
                  diff={diff}
                  isExpanded={id === expandedId}
                  onExpand={() => setExpandedId(id === expandedId ? null : id)}
                  onAccept={() => handleAcceptImprovement(tweetId, diff)}
                />
              )
            }
            if (diff.type === 1) {
              return (
                <Addition
                  key={id}
                  diff={diff}
                  isExpanded={id === expandedId}
                  onExpand={() => setExpandedId(id === expandedId ? null : id)}
                  onAccept={() => handleAcceptImprovement(tweetId, diff)}
                />
              )
            }
            return (
              <Deletion
                key={id}
                diff={diff}
                isExpanded={id === expandedId}
                onExpand={() => setExpandedId(id === expandedId ? null : id)}
                onAccept={() => handleAcceptImprovement(tweetId, diff)}
              />
            )
          })}
        </>
      ) : (
        <div className="flex h-full flex-1 flex-col items-center justify-center text-center p-8">
          <p className="text-4xl leading-relaxed">🎉</p>
          <p className="text-base text-stone-800 font-medium">
            No more improvements!
          </p>
          <p className="text-sm/6 text-muted-foreground mt-1">
            Possible improvements will show up here.
          </p>
        </div>
      )}
    </div>
  )
}
