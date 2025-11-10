import { MyUIMessage } from '@/server/routers/chat/chat-router'
import { ChatStatus } from 'ai'
import { memo, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { ChatContainerContent, ChatContainerRoot } from '../ui/chat-container'
import { LoadingMessage } from './loading-message'
import { MessageWrapper } from './message-wrapper'
import { StreamingMessage } from './streaming-message'
import { TweetMockup } from './tweet-mockup'
import { WebsiteMockup } from './website-mockup'
import { ScrollButton } from '../ui/scroll-button'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning'

export const Messages = memo(
  ({
    messages,
    error,
    status,
  }: {
    messages: MyUIMessage[]
    error?: Error
    status: ChatStatus
  }) => {
    const lastUserMessageIndex = useMemo(
      () => messages.findLastIndex((m) => m.role === 'user'),
      [messages],
    )

    const visibleMessages = useMemo(
      () =>
        messages.filter((message) =>
          message.parts.some((part) => part.type === 'text' && Boolean(part.text)),
        ),
      [messages],
    )

    const showLoadingMessage = useMemo(() => {
      return (
        !error &&
        (status === 'submitted' ||
          (status === 'streaming' &&
            !Boolean(
              messages[messages.length - 1]?.parts.some(
                (part) => part.type === 'text' && Boolean(part.text),
              ),
            )))
      )
    }, [error, status, messages])

    const hasImageAttachment = useMemo(() => {
      return Boolean(
        messages[lastUserMessageIndex]?.metadata?.attachments.some(
          (a) => a.type === 'image',
        ),
      )
    }, [messages, lastUserMessageIndex])

    return (
      <>
        <ChatContainerRoot className="h-full overflow-y-auto">
          <ChatContainerContent className="space-y-6 px-4 pt-6 pb-6">
            {visibleMessages.map((message, index) => {
              const isUser = message.role === 'user'

              return (
                <div
                  key={message.id}
                  data-message-index={index}
                  data-message-role={message.role}
                >
                  <MessageWrapper
                    id={message.id}
                    metadata={message.metadata}
                    disableAnimation={message.role === 'assistant'}
                    isUser={isUser}
                    showOptions={
                      (message.role === 'assistant' &&
                        (status === 'ready' || status === 'error')) ||
                      index !== messages.length - 1
                    }
                    animateLogo={
                      index === messages.length - 1 &&
                      (status === 'submitted' || status === 'streaming')
                    }
                  >
                    {message.parts.map((part, i) => {
                      if (part.type === 'data-tool-reasoning') {
                        return (
                          <Reasoning
                            key={i}
                            className="w-full"
                            isStreaming={part.data.status === 'reasoning'}
                          >
                            <ReasoningTrigger />
                            <ReasoningContent>{part.data.text}</ReasoningContent>
                          </Reasoning>
                        )
                      }

                      if (part.type === 'text') {
                        if (!part.text) return null

                        return (
                          <div className="whitespace-pre-wrap" key={i}>
                            <StreamingMessage
                              markdown
                              animate={message.role === 'assistant'}
                              text={message.metadata?.userMessage || part.text}
                            />
                          </div>
                        )
                      }

                      if (part.type === 'tool-read_website_content') {
                        if (
                          part.state === 'input-available' ||
                          part.state === 'input-streaming'
                        ) {
                          return <WebsiteMockup key={i} isLoading />
                        }

                        if (part.output) {
                          return (
                            <WebsiteMockup
                              key={i}
                              url={part.output.url}
                              title={part.output.title}
                            >
                              <div className="line-clamp-3">
                                <ReactMarkdown components={{ img: () => <></> }}>
                                  {part.output.content.slice(0, 250)}
                                </ReactMarkdown>
                              </div>
                            </WebsiteMockup>
                          )
                        }

                        return null
                      }

                      if (part.type === 'data-tool-output') {
                        if (part.data.status === 'processing') {
                          return <TweetMockup key={i} isLoading index={0} />
                        }

                        const separateTweets = part.data.text.split('===')

                        return (
                          <div key={`part-${i}`} className="space-y-4">
                            {separateTweets.map((tweetOrThread, tweetIndex) => {
                              const threads = tweetOrThread.split('---')

                              return (
                                <div
                                  key={`tweet-${tweetIndex}`}
                                  className={cn('relative w-full min-w-0 rounded-2xl', {
                                    'border px-3 py-6 border-black border-opacity-[0.01] bg-clip-padding group bg-white shadow-[0_1px_1px_rgba(0,0,0,0.05),0_4px_6px_rgba(34,42,53,0.04),0_24px_68px_rgba(47,48,55,0.05),0_2px_3px_rgba(0,0,0,0.04)]':
                                      threads.length > 1,
                                  })}
                                >
                                  {threads.map((thread, threadIndex) => (
                                    <div
                                      key={`thread-${threadIndex}`}
                                      className="relative"
                                    >
                                      <TweetMockup
                                        isConnectedAfter={
                                          threads.length > 1 &&
                                          threadIndex < threads.length - 1
                                        }
                                        isConnectedBefore={threadIndex > 0}
                                        threads={threads}
                                        text={thread.trim()}
                                        index={threadIndex}
                                      >
                                        <StreamingMessage
                                          animate={true}
                                          text={thread.trim()}
                                        />
                                      </TweetMockup>

                                      {threads.length > 1 &&
                                        threadIndex < threads.length - 1 && (
                                          <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: '100%' }}
                                            transition={{ duration: 0.5 }}
                                            className="absolute z-10 left-[35px] top-[44px] w-0.5 bg-gray-200/75 h-full"
                                          />
                                        )}
                                    </div>
                                  ))}
                                </div>
                              )
                            })}
                          </div>
                        )
                      }

                      return null
                    })}
                  </MessageWrapper>
                </div>
              )
            })}

            {showLoadingMessage && (
              <div data-message-index={visibleMessages.length} data-loading="true">
                <LoadingMessage hasImage={hasImageAttachment} status={status} />
              </div>
            )}
          </ChatContainerContent>

          <div className="absolute right-12 bottom-4">
            <ScrollButton />
          </div>
        </ChatContainerRoot>
      </>
    )
  },
)

Messages.displayName = 'Messages'
