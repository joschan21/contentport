"use client"

import { useTweetContext } from "@/hooks/tweet-ctx"
import { useQuery } from "@tanstack/react-query"
import { client } from "@/lib/client"
import {
  AdditionNode,
  DeletionNode,
  ReplacementNode,
  UnchangedNode,
} from "@/lib/nodes"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import Tweet from "./tweet"
import { useLocalStorage } from "@/hooks/use-local-storage"

type Style = {
  tweets: any[]
  prompt: string | null
  connectedAccount?: {
    username: string
    name: string
    profile_image_url: string
    id: string
    verified: boolean
  }
}

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

export type ConnectedAccount = {
  username: string
  name: string
  profile_image_url: string | undefined
  verified?: boolean
}

export const DEFAULT_CONNECTED_ACCOUNT: ConnectedAccount = {
  username: "contentport",
  name: "contentport",
  profile_image_url: undefined,
  verified: true,
}

function TweetEditorContent() {
  const { tweets, createTweet, deleteTweet } = useTweetContext()

  const [connectedAccount] = useLocalStorage(
    "connected-account",
    DEFAULT_CONNECTED_ACCOUNT
  )

  const { data } = useQuery<ConnectedAccount>({
    queryKey: ["connected-account"],
    queryFn: async () => {
      const res = await client.settings.connectedAccount.$get()
      const { account } = await res.json()
      return account ?? DEFAULT_CONNECTED_ACCOUNT
    },
    initialData: connectedAccount,
  })

  const account = {
    avatar: data.profile_image_url,
    avatarFallback: data.name.slice(0, 1).toUpperCase(),
    handle: data.username,
    name: data.name,
    verified: data.verified,
  }

  return (
    <div className="relative z-10 w-full rounded-lg p-4 font-sans">
      {tweets.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No tweets in thread.</p>
          <button
            className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-colors"
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
                account={account}
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
