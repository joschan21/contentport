import { createContext, PropsWithChildren, useContext, useEffect, useRef } from 'react'
import { useChat as aisdk_useChat, UseChatOptions } from '@ai-sdk/react'
import { ChatMessage } from '@/server/routers/chat/chat-router'
import { nanoid } from 'nanoid'
import { useQueryState } from 'nuqs'
import { useQuery } from '@tanstack/react-query'
import { client } from '@/lib/client'
import { useTweetContext } from './tweet-ctx'
import { TestUIMessage } from '@/types/message'
import { useSidebarContext } from './sidebar-ctx'

interface StartNewChatOpts {
  newId?: string
}

type TChatContext = Omit<ReturnType<typeof aisdk_useChat>, 'append'> & {
  messages: ChatMessage[]
  append: (message: Partial<ChatMessage>) => void
  startNewChat: (opts?: StartNewChatOpts) => void
}

const ChatContext = createContext<TChatContext | null>(null)

export const ChatProvider = ({ children }: PropsWithChildren) => {
  const id = useRef(nanoid())
  const { contentRef } = useTweetContext()

  const [chatId, setChatId] = useQueryState('chatId', {
    defaultValue: id.current,
    parse: (value) => {
      id.current = value
      return value
    },
    serialize: (value) => value,
  })

  const startNewChat = (opts?: StartNewChatOpts) => {
    if (opts?.newId) id.current = opts.newId

    setChatId(opts?.newId || null)
    result.setInput('')

    return id.current
  }

  const { data } = useQuery({
    queryKey: ['get-chat-messages', chatId],
    queryFn: async () => {
      const res = await client.chat.get_chat_messages.$get({ chatId })
      return await res.json()
    },
  })

  const { tweet } = useTweetContext()

  const result = aisdk_useChat({
    initialMessages: data?.messages ?? [],
    id: chatId,
    maxSteps: 5,
    api: '/api/chat/generate',
    sendExtraMessageFields: true,
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
        chatId: id.current,
        // do not transmit image
        tweet: { ...tweet, image: undefined, content: contentRef.current },
        ...requestBody,
      }
    },
  })

  return (
    <ChatContext.Provider value={{ ...result, startNewChat } as TChatContext}>
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
