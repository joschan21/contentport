import { client } from '@/lib/client'
import { clearStreamHooks, registerStreamHooks } from '@/lib/register-response-hooks'
import { DiffWithReplacement } from '@/lib/utils'
import { ChatMessage } from '@/server/routers/chat/chat-router'
import { TestUIMessage } from '@/types/message'
import { useChat as aisdk_useChat } from '@ai-sdk/react'
import { useQuery } from '@tanstack/react-query'
import { nanoid } from 'nanoid'
import { parseAsString, useQueryState } from 'nuqs'
import { createContext, PropsWithChildren, useContext, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useTweets } from './use-tweets'

interface StartNewChatOpts {
  newId?: string
}

type TChatContext = Omit<ReturnType<typeof aisdk_useChat>, 'append'> & {
  messages: ChatMessage[]
  append: (message: Partial<ChatMessage>) => void
  startNewChat: (opts?: StartNewChatOpts) => Promise<string | null>
  chatId: string | null
  setChatId: (id: string | null) => void
}

const searchParams = {
  tweetId: parseAsString,
  chatId: parseAsString,
}

const ChatContext = createContext<TChatContext | null>(null)

export const ChatProvider = ({ children }: PropsWithChildren) => {
  const [chatId, setChatId] = useQueryState('chatId')
  const {
    tweetId,
    currentTweet,
    listImprovements,
    showImprovementsInEditor,
    setTweetId,
    setQueuedImprovements,
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
        onTweetResult: async ({
          id,
          isNew,
          diffs,
        }: {
          id: string
          isNew: boolean
          diffs: DiffWithReplacement[]
        }) => {
          if (isNew) {
            setTweetId(id)
            listImprovements(diffs)
            showImprovementsInEditor(id, diffs)

            return
          }

          console.log('created for id:', id)
          console.log('current tweet:', tweetId)
          if (id === tweetIdRef.current) {
            console.log('ADDING IMPROVEMENTS', diffs)
            listImprovements(diffs)
            showImprovementsInEditor(id, diffs)
          } else {
            listImprovements(diffs)
            setQueuedImprovements((prev) => ({
              ...prev,
              [id]: diffs,
            }))
          }
        },
      })
    },
    onFinish: () => {
      clearStreamHooks()
    },
    experimental_prepareRequestBody({ messages, requestBody }) {
      const lastMessage = messages[messages.length - 1] as TestUIMessage
      return {
        message: {
          ...lastMessage,
          role: 'user',
          id: lastMessage?.id ?? nanoid(),
          content: (lastMessage?.content as string).trimEnd(),
          metadata: lastMessage?.metadata,
        } satisfies TestUIMessage,
        tweet: currentTweet,
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
