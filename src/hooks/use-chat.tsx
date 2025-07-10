import { client } from '@/lib/client'
import { clearStreamHooks, registerStreamHooks } from '@/lib/register-response-hooks'
import { DiffWithReplacement } from '@/lib/utils'
import { ChatMessage } from '@/server/routers/chat/chat-router'
import { useChat as aisdk_useChat } from '@ai-sdk/react'
import { useQuery } from '@tanstack/react-query'
import { useQueryState } from 'nuqs'
import { createContext, PropsWithChildren, useContext, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useTweets } from './use-tweets'
import { ChatRequestOptions } from 'ai'
import type { ThreeDrafts } from '@/server/routers/chat/create-three-drafts'
import { $getRoot } from 'lexical'

interface StartNewChatOpts {
  newId?: string
}

type TChatContext = Omit<ReturnType<typeof aisdk_useChat>, 'append'> & {
  messages: ChatMessage[]
  append: (message: Partial<ChatMessage>, chatRequestOptions?: ChatRequestOptions) => void
  startNewChat: (opts?: StartNewChatOpts) => Promise<string | null>
  chatId: string | null
  setChatId: (id: string | null) => void
}

const ChatContext = createContext<TChatContext | null>(null)

export const ChatProvider = ({ children }: PropsWithChildren) => {
  const [chatId, setChatId] = useQueryState('chatId')
  const {
    draftCheckpoint,
    tweetId,
    listImprovements,
    showImprovementsInEditor,
    setDrafts,
    improvementRef,
    clearToolError,
    shadowEditor,
  } = useTweets()

  const tweetIdRef = useRef(tweetId)

  useEffect(() => {
    tweetIdRef.current = tweetId
  }, [tweetId])

  const startNewChat = async (opts?: StartNewChatOpts) => {
    await setChatId(opts?.newId || null)
    result.setInput('')

    return opts?.newId || null
  }

  const { data } = useQuery({
    queryKey: ['get-chat-messages', chatId],
    queryFn: async () => {
      const res = await client.chat.get_chat_messages.$get({ chatId })
      return await res.json()
    },
  })

  const result = aisdk_useChat({
    initialMessages: data?.messages ?? [],
    id: chatId ?? undefined,
    maxSteps: 5,
    api: '/api/chat/generate',
    sendExtraMessageFields: true,
    onError(error) {
      toast.error(error.message)
    },
    onResponse(res) {
      const response = res.clone()
      registerStreamHooks(response, {
        onThreeDrafts: async (data: ThreeDrafts) => {
          console.log('drafts are here', data)
          const currentContent = shadowEditor.read(() => $getRoot().getTextContent())
          draftCheckpoint.current = currentContent
          setDrafts(data)
          clearToolError('three_drafts')
        },
        onTweetResult: async ({
          id,
          diffs,
        }: {
          id: string
          isDraft: boolean
          diffs: DiffWithReplacement[]
          improvedText: string
        }) => {
          improvementRef.current = diffs
          listImprovements(diffs)
          showImprovementsInEditor(diffs)
        },
      })
    },
    onFinish: () => {
      clearStreamHooks()
    },
    experimental_prepareRequestBody({ messages, requestBody }) {
      return {
        messages: undefined,
        ...requestBody,
      }
    },
  })

  return (
    <ChatContext.Provider
      value={{ ...result, startNewChat, setChatId, chatId } as TChatContext}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)

  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }

  return context
}
