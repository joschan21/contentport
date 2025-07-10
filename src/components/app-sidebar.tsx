'use client'

import { Message, MessageContent } from '@/components/ui/message'
import { useChat } from '@/hooks/use-chat'
import { ArrowUp, Check, Eye, Paperclip, Plus, X } from 'lucide-react'
import posthog from 'posthog-js'
import { useContext, useEffect, useState } from 'react'

import { Loader } from '@/components/ui/loader'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { AccountAvatar } from '@/hooks/account-ctx'
import { useAttachments } from '@/hooks/use-attachments'
import { useEditor } from '@/hooks/use-editors'
import { useTweets } from '@/hooks/use-tweets'
import { client } from '@/lib/client'
import { MultipleEditorStorePlugin } from '@/lib/lexical-plugins/multiple-editor-plugin'
import PlaceholderPlugin from '@/lib/placeholder-plugin'
import { InferInput } from '@/server'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UIMessage } from 'ai'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  COMMAND_PRIORITY_HIGH,
  KEY_ENTER_COMMAND,
} from 'lexical'
import { nanoid } from 'nanoid'
import toast from 'react-hot-toast'
import { AttachmentItem } from './attachment-item'
import { Improvements } from './improvements'
import { KnowledgeSelector, SelectedKnowledgeDocument } from './knowledge-selector'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import DuolingoButton from './ui/duolingo-button'
import { FileUpload, FileUploadContext, FileUploadTrigger } from './ui/file-upload'
import { TextShimmer } from './ui/text-shimmer'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import useTweetMetadata from '@/hooks/use-tweet-metdata'

const initialConfig = {
  namespace: 'app-sidebar-input',
  theme: {
    text: {
      bold: 'font-bold',
      italic: 'italic',
      underline: 'underline',
    },
  },
  onError: (error: Error) => {
    console.error('[Context Document Editor Error]', error)
  },
  editable: true,
  nodes: [],
}

type ChatInput = InferInput['chat']['generate']

function ChatInput() {
  const editor = useEditor('app-sidebar')
  let { chatId, startNewChat } = useChat()
  const { handleInputChange, input, messages, append } = useChat()
  const { currentTweet } = useTweets()
  const { drafts, clearDrafts, draftCheckpoint, selectedDraftIndex } = useTweets()
  const { content } = useTweetMetadata()

  const { shadowEditor } = useTweets()

  const { attachments, addChatAttachment, removeAttachment, hasUploading } =
    useAttachments()

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    posthog.capture('assistant_used', { input })

    if (hasUploading) {
      toast.error('Please wait for file uploads to complete')
      return
    }

    if (!input.trim()) {
      console.log('no input')
      return
    }

    if (drafts.length > 0) {
      const currentDraft = drafts[selectedDraftIndex]

      if (currentDraft) {
        shadowEditor.update(
          () => {
            const root = $getRoot()
            const p = $createParagraphNode()
            const text = $createTextNode(currentDraft.improvedText)
            p.append(text)
            root.clear()
            root.append(p)
          },
          { tag: 'force-sync' },
        )

        clearDrafts()
        draftCheckpoint.current = null
      }
    }

    if (messages.length === 0 && !chatId) {
      chatId = (await startNewChat({ newId: nanoid() })) as string
    }

    const message = {
      id: nanoid(),
      content: input,
      role: 'user',
      metadata: { attachments },
      chatId: chatId as string,
    }

    // @ts-ignore
    append(message, {
      body: {
        message,
        // do not transmit image
        tweet: { ...currentTweet, content, image: undefined },
      },
    })

    // cleanup
    attachments.forEach((attachment) => {
      removeAttachment(attachment)
    })

    editor?.update(() => {
      const root = $getRoot()
      root.clear()
    })
  }

  useEffect(() => {
    const removeUpdateListener = editor?.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot()
        const text = root.getTextContent()

        handleInputChange({
          target: { value: text },
        } as React.ChangeEvent<HTMLInputElement>)
      })
    })

    return () => {
      removeUpdateListener?.()
    }
  }, [editor, handleInputChange])

  const handleFilesAdded = (files: File[]) => files.forEach(addChatAttachment)

  return (
    <FileUpload onFilesAdded={handleFilesAdded}>
      <div className="mb-2 flex gap-2 items-center">
        {attachments.map((attachment, i) => {
          const onRemove = () => removeAttachment({ id: attachment.id })
          return (
            <AttachmentItem
              onRemove={onRemove}
              key={attachment.id}
              attachment={attachment}
            />
          )
        })}
      </div>

      <ChatInputInner onSubmit={onSubmit} />
    </FileUpload>
  )
}

function ChatInputInner({
  onSubmit,
}: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}) {
  const editor = useEditor('app-sidebar')
  const context = useContext(FileUploadContext)
  const isDragging = context?.isDragging ?? false
  const [showTutorial, setShowTutorial] = useState(false)
  const { open } = useSidebar()

  const { addKnowledgeAttachment, hasUploading } = useAttachments()

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('chat-input-tutorial-seen')
    if (!hasSeenTutorial && open) {
      setShowTutorial(true)
    } else {
      setShowTutorial(false)
    }
  }, [open])

  const handleTutorialComplete = () => {
    localStorage.setItem('chat-input-tutorial-seen', 'true')
    setShowTutorial(false)
  }

  useEffect(() => {
    const removeCommand = editor?.registerCommand(
      KEY_ENTER_COMMAND,
      (event: KeyboardEvent | null) => {
        if (event && !event.shiftKey) {
          event.preventDefault()
          if (hasUploading) return true

          handleTutorialComplete()
          onSubmit(event as any)
          return true
        }
        return false
      },
      COMMAND_PRIORITY_HIGH,
    )

    return () => {
      removeCommand?.()
    }
  }, [editor, onSubmit, hasUploading])

  const handleAddKnowledgeDoc = (doc: SelectedKnowledgeDocument) => {
    addKnowledgeAttachment(doc)
  }

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    handleTutorialComplete()
    onSubmit(e)
  }

  return (
    <div className="space-y-3">
      <div
        className={`relative transition-all duration-200 ${
          isDragging ? 'ring-2 rounded-xl ring-indigo-600 ring-offset-2' : ''
        }`}
      >
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-indigo-50/50 backdrop-blur-sm rounded-xl z-10">
            <p className="text-indigo-600 font-medium">Drop files here to add to chat</p>
          </div>
        )}

        <Tooltip open={showTutorial}>
          <TooltipTrigger asChild>
            <form onSubmit={handleFormSubmit} className="relative">
              <div className="rounded-xl bg-white border-2 border-gray-200 shadow-[0_2px_0_#E5E7EB] font-medium transition-all duration-200 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-600">
                <LexicalComposer initialConfig={initialConfig}>
                  <PlainTextPlugin
                    contentEditable={
                      <ContentEditable
                        autoFocus
                        className="w-full px-4 py-3 outline-none min-h-[4.5rem] text-base placeholder:text-gray-400"
                        style={{ minHeight: '4.5rem' }}
                        onClick={handleTutorialComplete}
                        onFocus={handleTutorialComplete}
                      />
                    }
                    ErrorBoundary={LexicalErrorBoundary}
                  />
                  <PlaceholderPlugin placeholder="Tweet about..." />
                  <HistoryPlugin />
                  <MultipleEditorStorePlugin id="app-sidebar" />
                </LexicalComposer>

                <div className="flex items-center justify-between px-3 pb-3">
                  <div className="flex gap-1.5 items-center">
                    <FileUploadTrigger asChild>
                      <DuolingoButton type="button" variant="secondary" size="icon">
                        <Paperclip className="text-stone-600 size-5" />
                      </DuolingoButton>
                    </FileUploadTrigger>

                    <KnowledgeSelector onSelectDocument={handleAddKnowledgeDoc} />
                  </div>

                  <DuolingoButton
                    // loading={status === 'streaming' || status === 'submitted'}
                    disabled={hasUploading}
                    variant="icon"
                    size="icon"
                    aria-label="Send message"
                  >
                    <ArrowUp className="size-5" />
                  </DuolingoButton>
                </div>
              </div>
            </form>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs z-10">
            <p className="text-center text-base">👇 Type your tweet idea here👇</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

export function TweetSuggestionLoader() {
  return (
    <div className="w-full h-32">
      <div className="my-3 h-full rounded-lg bg-white border border-dashed border-stone-200 shadow-sm overflow-hidden">
        <div className="h-full flex items-center justify-start gap-3 p-2">
          <div className="relative h-28 w-28 overflow-hidden rounded-md">
            <img
              src="/images/typing-cat.gif"
              alt="Typing cat"
              className="scale-[1.3] object-cover object-right"
            />
          </div>
          <div className="flex flex-col">
            <div className="text-base leading-relaxed">
              <TextShimmer className=" [--base-gradient-color:#78716c]" duration={0.7}>
                Ghostwriters at work...
              </TextShimmer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DraftsLoadingState() {
  return (
    <div className="w-full h-32">
      <div className="my-3 h-full rounded-lg bg-white border border-dashed border-stone-200 shadow-sm overflow-hidden">
        <div className="h-full flex items-center justify-start gap-3 p-2">
          <div className="relative h-28 w-28 overflow-hidden rounded-md">
            <img
              src="/images/typing-cat.gif"
              alt="Typing cat"
              className="scale-[1.3] object-cover object-right"
            />
          </div>
          <div className="flex flex-col">
            <div className="text-base leading-relaxed">
              <TextShimmer className=" [--base-gradient-color:#78716c]" duration={0.7}>
                Cooking up some bangers...
              </TextShimmer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ReadLinkLoader({
  url,
  title,
  status = 'pending',
}: {
  url: string
  title: string
  status: 'success' | 'pending'
}) {
  const { width } = useSidebar()
  const remToPx = (value: string) => parseFloat(value.replace('rem', '')) * 16

  return (
    <div className="w-full overflow-hidden">
      <div className="mb-3 w-full rounded-lg bg-white border border-black border-opacity-10 shadow-sm bg-clip-padding overflow-hidden">
        <div className="flex flex-col gap-0 px-6 py-3 min-w-0">
          {status === 'success' ? (
            <div className="flex mb-1 items-center gap-1.5">
              <Check className="size-4 text-indigo-600 flex-shrink-0" />
              <p className="text-sm text-indigo-600">Read</p>
            </div>
          ) : (
            <div className="flex mb-1 items-center gap-1.5">
              <Eye className="size-4 text-stone-500 flex-shrink-0" />
              <TextShimmer
                className="text-sm [--base-gradient-color:#78716c]"
                duration={0.7}
              >
                Reading...
              </TextShimmer>
            </div>
          )}

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-medium text-stone-900 hover:underline truncate block"
            title={title}
            style={{ maxWidth: remToPx(width) - 128 }}
          >
            {title}
          </a>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-stone-500 hover:underline mt-0.5 truncate block"
            title={url}
            style={{ maxWidth: remToPx(width) - 128 }}
          >
            {url}
          </a>
        </div>
      </div>
    </div>
  )
}

interface TweetCard {
  src?: string
  username: string
  name: string
  text?: string
}

const TweetCard = ({ name, username, src, text }: TweetCard) => {
  return (
    <div className="w-full">
      <div className="text-left rounded-lg bg-white border border-dashed border-stone-200 shadow-sm overflow-hidden">
        <div className="flex items-start gap-3 p-6">
          <Avatar className="h-10 w-10 rounded-full border border-border/30">
            <AvatarImage src={src} alt={`@${username}`} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm/6">
              {name.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold">{name}</span>
              <span className="text-sm/6 text-muted-foreground">@{username}</span>
            </div>
            <div className="mt-1 text-base whitespace-pre-line">{text}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const { toggleSidebar } = useSidebar()
  const { messages, status, startNewChat } = useChat()
  const { addKnowledgeAttachment, attachments, removeAttachment } = useAttachments()
  const editor = useEditor('app-sidebar')

  const queryClient = useQueryClient()

  const { data: knowledgeData } = useQuery({
    queryKey: ['knowledge-documents'],
    queryFn: async () => {
      const res = await client.knowledge.list.$get()
      return await res.json()
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const exampleDocuments = knowledgeData?.documents?.filter((doc) => doc.isExample) || []

  const renderPart = (
    part: UIMessage['parts'][number],
    index: number,
    empty?: boolean,
  ): React.ReactNode => {
    switch (part.type) {
      case 'text':
        if (Array.isArray(part.text)) {
          return (
            <div key={index} className="space-y-2">
              {part.text.map((nestedPart: any, nestedIndex: number) =>
                renderPart(nestedPart, nestedIndex),
              )}
            </div>
          )
        }
        return (
          <MessageContent
            markdown
            key={index}
            className="text-base py-0.5 leading-7 text-stone-800"
          >
            {part.text}
          </MessageContent>
        )
      // case 'step-start':
      //   return index > 0 ? <Separator key={index} className="!my-4" /> : null
      case 'tool-invocation':
        switch (part.toolInvocation.state) {
          case 'partial-call':
          case 'call':
            if (part.toolInvocation.toolName === 'read_website_content') {
              return (
                <ReadLinkLoader
                  status="pending"
                  title="Reading link..."
                  key={index}
                  url={part.toolInvocation.args?.website_url}
                />
              )
            } else if (part.toolInvocation.toolName === 'three_drafts') {
              return <DraftsLoadingState key={index} />
            } else if (part.toolInvocation.toolName === 'edit_tweet') {
              return <TweetSuggestionLoader key={index} />
            }
          case 'result':
            if (part.toolInvocation.toolName === 'read_website_content') {
              return (
                <ReadLinkLoader
                  status="success"
                  key={index}
                  // @ts-ignore
                  title={part.toolInvocation.result.title}
                  url={part.toolInvocation.args?.website_url}
                />
              )
            } else if (part.toolInvocation.toolName === 'three_drafts') {
              return (
                <div key={index} className="w-full">
                  <p className="text-base text-emerald-600 font-medium">
                    Ready! I've prepared 3 drafts for you. Choose your favorite below.
                  </p>
                </div>
              )
            } else if (part.toolInvocation.toolName === 'edit_tweet') {
              return (
                <div key={index} className="w-full">
                  <p className="text-base text-emerald-600 font-medium">
                    Ready! I've edited your tweet.
                  </p>
                </div>
              )
            }

          default:
            return null
        }
      default:
        return null
    }
  }

  return (
    <>
      {children}

      <Sidebar side="right" collapsible="offcanvas">
        <SidebarHeader className="flex flex-col border-b border-stone-200 bg-stone-100 items-center justify-end gap-2 px-4">
          <div className="w-full flex items-center justify-between">
            <p className="text-sm/6 font-medium">Assistant</p>
            <div className="flex gap-2">
              <DuolingoButton
                onClick={() => startNewChat()}
                size="sm"
                variant="secondary"
                title="New Chat"
                className="inline-flex items-center gap-1.5"
              >
                <Plus className="size-4" />
                <p className="text-sm">New Chat</p>
              </DuolingoButton>
              <DuolingoButton
                onClick={toggleSidebar}
                variant="secondary"
                className="aspect-square"
                size="icon"
                title="Close Sidebar"
              >
                <X className="size-4" />
              </DuolingoButton>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="h-full p-4">
          <SidebarGroup className="h-full">
            <div className="flex flex-col-reverse space-y-reverse space-y-3 h-full overflow-y-auto">
              {messages.length > 0 ? (
                (() => {
                  const reversed = [...messages].reverse()
                  let lastUserIdx = reversed.findIndex((m) => m.role === 'user')
                  if (lastUserIdx === -1) lastUserIdx = 0
                  const hasAssistantAfterUser = reversed
                    .slice(0, lastUserIdx)
                    .some((m) => m.role === 'assistant')

                  // Check if there's an active tool call that should take precedence over typing indicator
                  const hasActiveToolCall = reversed.some((m) =>
                    m.parts.some(
                      (part) =>
                        part.type === 'tool-invocation' &&
                        (part.toolInvocation.state === 'partial-call' ||
                          part.toolInvocation.state === 'call'),
                    ),
                  )

                  const showTyping =
                    status === 'submitted' && !hasAssistantAfterUser && !hasActiveToolCall
                  const renderList = [...reversed]
                  if (showTyping) {
                    renderList.splice(lastUserIdx, 0, {
                      id: '__typing__',
                      role: 'assistant',
                      parts: [],
                      // @ts-expect-error
                      typingLoader: true,
                    })
                  }

                  const lastCallId = renderList.find((m) => {
                    return m.parts.some(
                      (part) =>
                        part.type === 'tool-invocation' &&
                        part.toolInvocation.toolName === 'edit_tweet',
                    )
                  })

                  return renderList.map((message, i) => {
                    // @ts-expect-error unknown property
                    if (message.typingLoader) {
                      return (
                        <Message key="__typing__">
                          <div className="flex items-start gap-3">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2 mt-2">
                                <Loader variant="typing" size="md" />
                                <p>Thinking</p>
                              </div>
                            </div>
                          </div>
                        </Message>
                      )
                    }

                    return (
                      <div key={i} className="flex flex-col gap-2">
                        <div className="flex gap-2 items-center">
                          {message.metadata?.attachments?.map((attachment) => {
                            return (
                              <AttachmentItem
                                key={attachment.id}
                                attachment={attachment}
                              />
                            )
                          })}
                        </div>

                        <Message
                          className={` ${
                            message.role === 'assistant' ? '' : 'bg-stone-200 w-fit pr-6'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {message.role === 'user' && (
                              <AccountAvatar className="size-7" />
                              // <Avatar className="size-7 flex items-center justify-center bg-stone-800 rounded-full flex-shrink-0">
                              //   <p className="text-white text-[12px] font-medium">
                              //     {account?.name.slice(0, 1).toUpperCase()}
                              //   </p>
                              // </Avatar>
                            )}
                            <div className="space-y-2 flex-1">
                              {message.parts.map((part, index) => {
                                const empty = !Boolean(message.id === lastCallId?.id)
                                return renderPart(part, index, empty)
                              })}
                            </div>
                          </div>
                        </Message>
                      </div>
                    )
                  })
                })()
              ) : (
                <div className="flex h-full flex-1 flex-col items-center justify-center text-center p-8">
                  <p className="text-2xl text-stone-800 font-medium">
                    Let's write a great tweet ✏️
                  </p>
                  <p className="text-sm/6 text-muted-foreground mt-1">
                    Paste a link, image, or rough idea
                  </p>

                  <div className="w-2/3 mt-8 mb-4 flex items-center gap-3">
                    <div className="h-px flex-1 bg-stone-200"></div>
                    <p className="text-xs text-stone-500">Click to select example 👇</p>
                    <div className="h-px flex-1 bg-stone-200"></div>
                  </div>

                  <div className="grid gap-2 w-full max-w-lg">
                    <DuolingoButton
                      className="w-full"
                      variant="dashedOutline"
                      onClick={() => {
                        // Clear existing attachments
                        attachments.forEach((attachment) => {
                          removeAttachment({ id: attachment.id })
                        })

                        const blogDoc = exampleDocuments.find(
                          (doc) => doc.title?.includes('Zod') || doc.type === 'url',
                        )

                        if (blogDoc) {
                          addKnowledgeAttachment(blogDoc)

                          editor?.update(() => {
                            const root = $getRoot()
                            const p = $createParagraphNode()
                            p.append($createTextNode('write a tweet about this article'))
                            root.clear()
                            root.append(p)
                            p.select()
                          })
                          editor?.focus()
                        } else {
                          toast.error(
                            'Example blog article not found. Try adding your own content!',
                          )
                        }
                      }}
                    >
                      <div className="flex flex-wrap justify-center items-center gap-1">
                        <span>tweet about</span>
                        <span className="text-rose-950 bg-rose-50 rounded-sm px-1 py-0.5">
                          🧠 example-blog-article
                        </span>
                      </div>
                    </DuolingoButton>
                    <DuolingoButton
                      className="w-full"
                      variant="dashedOutline"
                      onClick={() => {
                        // Clear existing attachments
                        attachments.forEach((attachment) => {
                          removeAttachment({ id: attachment.id })
                        })

                        const imageDoc = exampleDocuments.find(
                          (doc) => doc.title?.includes('React') || doc.type === 'image',
                        )

                        if (imageDoc) {
                          addKnowledgeAttachment(imageDoc)

                          editor?.update(() => {
                            const root = $getRoot()
                            const p = $createParagraphNode()
                            p.append($createTextNode('tweet i just learned about this'))
                            root.clear()
                            root.append(p)
                            p.select()
                          })
                          editor?.focus()
                        } else {
                          toast.error(
                            'Example code image not found. Try uploading your own image!',
                          )
                        }
                      }}
                    >
                      <div className="flex flex-wrap justify-center items-center gap-1">
                        <span>tweet i just learned about</span>
                        <span className="text-rose-950 bg-rose-50 rounded-sm px-1 py-0.5">
                          🧠 example-code-image
                        </span>
                      </div>
                    </DuolingoButton>
                  </div>
                </div>
              )}
            </div>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="relative p-3 border-t border-t-gray-300 bg-gray-100">
          <Improvements />
          <ChatInput />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </>
  )
}
