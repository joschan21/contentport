"use client"

import { useTweetContext } from "@/hooks/tweet-ctx"
import {
  AdditionNode,
  DeletionNode,
  ReplacementNode,
  UnchangedNode,
} from "@/lib/nodes"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import Tweet from "./tweet"

const initialConfig = {
  namespace: "tweet-editor",
  theme: {
    text: {
      bold: "font-bold",
      italic: "italic",
      underline: "underline",
    },
  },
  onError: (error: Error) => {
    console.error("[Tweet Editor Error]", error)
  },
  editable: true,
  nodes: [DeletionNode, AdditionNode, UnchangedNode, ReplacementNode],
}

function TweetEditorContent() {
  const { tweets, createTweet, deleteTweet } = useTweetContext()

  return (
    <div className="relative z-10 w-full rounded-lg p-4 font-sans">
      {tweets.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No tweets in thread.</p>
          <button
            className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-full hover:bg-amber-600 transition-colors"
            onClick={() => createTweet()}
          >
            Create new tweet
          </button>
        </div>
      ) : (
        <div className="space-y-4 w-full">
          {tweets.map((tweet, index) => (
            <LexicalComposer key={tweet.id} initialConfig={initialConfig}>
              <Tweet
                key={tweet.id}
                id={tweet.id}
                suggestion={tweet.suggestion}
                author={{
                  avatar: "",
                  avatarFallback: "J",
                  handle: "joshtriedcoding",
                  name: "Josh tried coding",
                }}
                onDelete={() => deleteTweet(tweet.id)}
              />
            </LexicalComposer>
          ))}

          {/* <div className="flex items-center mt-1">
            <button
              onClick={() => createTweet()}
              className="px-2.5 py-1 bg-white flex items-center relative rounded-lg cursor-pointer dark:text-gray-400 hover:bg-stone-50 border border-stone-200 shadow-sm border-dashed text-sm text-stone-700"
            >
              <Plus className="size-3 mr-1" />
              Add tweet
            </button>
          </div> */}
        </div>
      )}
    </div>
  )
}

export default function TweetEditor() {
  return <TweetEditorContent />
}
