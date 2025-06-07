"use client"

import { client } from "@/lib/client"
import {
  AdditionNode,
  DeletionNode,
  ReplacementNode,
  UnchangedNode,
} from "@/lib/nodes"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { useQuery } from "@tanstack/react-query"
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

export default function TweetEditor() {
  const { data } = useQuery<ConnectedAccount>({
    queryKey: ["get-connected-account"],
    queryFn: async () => {
      const res = await client.settings.connected_account.$get()
      const { account } = await res.json()
      return account ?? DEFAULT_CONNECTED_ACCOUNT
    },
    initialData: () => {
      const account = localStorage.getItem("connected-account")
      if (account) {
        try {
          return JSON.parse(account) as any
        } catch (err) {
          return DEFAULT_CONNECTED_ACCOUNT
        }
      } else return DEFAULT_CONNECTED_ACCOUNT
    },
    refetchOnWindowFocus: false,
  })

  // idk why but sometimes alwaysDefinedData.profile_image_url threw because data is undefined???
  const alwaysDefinedData = data ?? DEFAULT_CONNECTED_ACCOUNT

  const account = {
    avatar: alwaysDefinedData.profile_image_url,
    avatarFallback: alwaysDefinedData.name.slice(0, 1).toUpperCase(),
    handle: alwaysDefinedData.username,
    name: alwaysDefinedData.name,
    verified: alwaysDefinedData.verified,
  }

  return (
    <div className="relative z-10 w-full rounded-lg p-4 font-sans">
      <div className="space-y-4 w-full">
        <LexicalComposer initialConfig={initialConfig}>
          <Tweet account={account} />
        </LexicalComposer>
      </div>
    </div>
  )
}
