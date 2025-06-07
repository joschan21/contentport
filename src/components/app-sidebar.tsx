'use client'

import { Message, MessageContent } from '@/components/ui/message'
import { useChat } from '@/hooks/chat-ctx'
import {
  ArrowUp,
  Check,
  ChevronsLeft,
  Eye,
  Loader2,
  Paperclip,
  Plus,
  Save,
  Settings,
  Sparkles,
  X,
} from 'lucide-react'
import { useContext, useEffect, useRef, useState } from 'react'

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
import { useTweetContext } from '@/hooks/tweet-ctx'
import { useAttachments } from '@/hooks/use-attachments'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { client } from '@/lib/client'
import PlaceholderPlugin from '@/lib/placeholder-plugin'
import { InferInput } from '@/server'
import { EditTweetToolResult } from '@/server/routers/chat/chat-router'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UIMessage } from 'ai'
import { HTTPException } from 'hono/http-exception'
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical'
import { nanoid } from 'nanoid'
import { useSearchParams } from 'react-router'
import { useQueryState } from 'nuqs'
import { KeyboardEvent as ReactKeyboardEvent } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { useLocation, useNavigate } from 'react-router'
import { AttachmentItem } from './attachment-item'
import { Icons } from './icons'
import { Improvements } from './improvements'
import { KnowledgeSelector, SelectedKnowledgeDocument } from './knowledge-selector'
import { ConnectedAccount, DEFAULT_CONNECTED_ACCOUNT } from './tweet-editor/tweet-editor'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import DuolingoBadge from './ui/duolingo-badge'
import DuolingoButton from './ui/duolingo-button'
import DuolingoInput from './ui/duolingo-input'
import DuolingoTextarea from './ui/duolingo-textarea'
import { FileUpload, FileUploadContext, FileUploadTrigger } from './ui/file-upload'
import { Separator } from './ui/separator'
import { Tabs, TabsContent } from './ui/tabs'
import { TextShimmer } from './ui/text-shimmer'

type ChatInput = InferInput['chat']['generate']

function ChatInput() {
  const navigate = useNavigate()
  const [editor] = useLexicalComposerContext()
  const [searchParams] = useSearchParams()
  const chatId = searchParams.get('chatId')
  const location = useLocation()
  const { startNewChat } = useChat()

  const { handleInputChange, input, messages, status, append } = useChat()

  const { attachments, addChatAttachment, removeAttachment, hasUploading } =
    useAttachments()

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (hasUploading) {
      toast.error('Please wait for file uploads to complete')
      return
    }

    if (location.pathname.includes('/studio/knowledge')) {
      navigate('/studio')
    }

    if (messages.length === 0 && !chatId) {
      startNewChat({ newId: nanoid() })
    }

    append({
      content: input,
      role: 'user',
      metadata: { attachments },
    })

    // cleanup
    attachments.forEach((attachment) => {
      removeAttachment(attachment)
    })

    editor.update(() => {
      const root = $getRoot()
      root.clear()
    })
  }

  useEffect(() => {
    const removeUpdateListener = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot()
        const text = root.getTextContent()

        handleInputChange({
          target: { value: text },
        } as React.ChangeEvent<HTMLInputElement>)
      })
    })

    return () => {
      removeUpdateListener()
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
  const context = useContext(FileUploadContext)
  const isDragging = context?.isDragging ?? false

  const { addKnowledgeAttachment, hasUploading } = useAttachments()

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()

      if (hasUploading) return

      onSubmit(e as any)
    }
  }

  const handleAddKnowledgeDoc = (doc: SelectedKnowledgeDocument) => {
    addKnowledgeAttachment(doc)
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

        <form onSubmit={onSubmit} className="relative">
          <div className="rounded-xl bg-white border-2 border-gray-200 shadow-[0_2px_0_#E5E7EB] font-medium transition-all duration-200 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-600">
            <PlainTextPlugin
              contentEditable={
                <ContentEditable
                  autoFocus
                  className="w-full px-4 py-3 outline-none min-h-[4.5rem] text-base placeholder:text-gray-400"
                  onKeyDown={handleKeyDown}
                  style={{ minHeight: '4.5rem' }}
                />
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <PlaceholderPlugin placeholder="What do you want to tweet?" />
            <HistoryPlugin />

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
                loading={status === 'streaming' || status === 'submitted'}
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
      </div>
    </div>
  )
}

function TweetSuggestionLoader() {
  const [connectedAccount] = useLocalStorage(
    'connected-account',
    DEFAULT_CONNECTED_ACCOUNT,
  )

  const account = {
    avatar: connectedAccount.profile_image_url,
    avatarFallback: connectedAccount.name.slice(0, 1).toUpperCase(),
    handle: connectedAccount.username,
    name: connectedAccount.name,
    verified: connectedAccount.verified,
  }

  return (
    <div>
      <div className="my-3 !mt-5 rounded-lg bg-white border border-dashed border-stone-200 shadow-sm overflow-hidden">
        <div className="flex items-start gap-3 p-6">
          <Avatar className="size-12 rounded-full border-2 border-white bg-white">
            <AvatarImage src={account.avatar} alt={account.handle} />
            <AvatarFallback>{account.avatarFallback}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-text-gray text-base">
                {account.name}
              </span>
              {account.verified && <Icons.verificationBadge className="h-4 w-4" />}
              <span className="text-stone-400 text-base">@{account.handle}</span>
            </div>
            <div className="mt-1 text-base leading-relaxed whitespace-pre-line">
              <TextShimmer className=" [--base-gradient-color:#78716c]" duration={0.7}>
                Creating...
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

export function TweetSuggestion({ id, suggestion }: { id: string; suggestion: string }) {
  const { updateTweet } = useTweetContext()
  const [connectedAccount] = useLocalStorage(
    'connected-account',
    DEFAULT_CONNECTED_ACCOUNT,
  )

  const reapply = () => {
    updateTweet(suggestion)
  }

  return (
    <div className="relative w-full">
      <div className="relative text-left rounded-[calc(6px)] bg-white shadow overflow-hidden">
        <div className="absolute top-5 right-5">
          <button
            onClick={reapply}
            className="transition-all flex items-center gap-0.5 px-2 py-1 text-xs rounded-md bg-light-gray text-primary hover:bg-stone-200"
          >
            <ChevronsLeft className="size-4" />
            <span>re-apply</span>
          </button>
        </div>
        <div className="flex items-start gap-3 p-6">
          <Avatar className="h-10 w-10 rounded-full border border-border/30">
            <AvatarImage
              src={connectedAccount.profile_image_url}
              alt={`@${connectedAccount.username}`}
            />
            <AvatarFallback className="bg-primary/10 text-primary text-sm/6">
              {connectedAccount.name.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base leading-relaxed font-semibold">
                {connectedAccount.name}
              </span>
              <span className="text-sm/6 text-muted-foreground">
                @{connectedAccount.username}
              </span>
              {connectedAccount.verified && (
                <Icons.verificationBadge className="h-4 w-4" />
              )}
            </div>
            <div className="mt-1 text-base leading-relaxed whitespace-pre-line">
              {suggestion}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const { addImprovements, rejectAllImprovements } = useTweetContext()
  const { toggleSidebar } = useSidebar()
  const { messages, status, startNewChat } = useChat()
  const { addKnowledgeAttachment, attachments, removeAttachment } = useAttachments()

  const resultMap = new Map<string, boolean>()
  const resultRef = useRef(resultMap)

  const [activeTab, setActiveTab] = useQueryState<'assistant' | 'settings'>('tab', {
    defaultValue: 'assistant',
    parse: (value) => {
      if (value === 'assistant') return 'assistant'
      return 'settings'
    },
    serialize: (value) => value,
  })

  useEffect(() => {
    const lastMessage = messages[messages.length - 1]

    lastMessage?.parts.forEach((part) => {
      if (part.type === 'tool-invocation') {
        const hasFired = resultRef.current.get(part.toolInvocation.toolCallId)

        if (
          !hasFired &&
          part.toolInvocation.state === 'result' &&
          part.toolInvocation.toolName === 'edit_tweet'
        ) {
          // tool is done generating tweet
          const { id, diffs } = part.toolInvocation.result as EditTweetToolResult

          addImprovements(id, diffs)

          resultRef.current.set(part.toolInvocation.toolCallId, true)
        }
      }
    })
  }, [messages, resultRef])

  const [tweetLink, setTweetLink] = useState('')
  const [prompt, setPrompt] = useState('')
  const [twitterUsername, setTwitterUsername] = useState('')

  const { mutate: importTweets, isPending: isImporting } = useMutation({
    mutationFn: async ({ link }: { link: string }) => {
      await client.style.import.$post({ link })
    },
    onSuccess: () => {
      setTweetLink('')
      refetchStyle()
    },
    onError: (error: HTTPException) => {
      toast.error(error.message)
    },
  })

  const queryClient = useQueryClient()

  const { mutate: deleteTweet, isPending: isDeleting } = useMutation({
    mutationFn: async ({ tweetId }: { tweetId: string }) => {
      await client.style.delete.$post({ tweetId })
    },
    onMutate: async ({ tweetId }) => {
      await queryClient.cancelQueries({ queryKey: ['account-style'] })
      const previousStyle = queryClient.getQueryData(['account-style'])

      queryClient.setQueryData(['account-style'], (oldData: any) => {
        if (!oldData?.tweets) return oldData
        return {
          ...oldData,
          tweets: oldData.tweets.filter((tweet: any) => tweet.id !== tweetId),
        }
      })

      return { previousStyle }
    },
    onError: (error: HTTPException, _, context) => {
      queryClient.setQueryData(['account-style'], context?.previousStyle)
      toast.error(error.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['account-style'] })
    },
  })

  const { mutate: savePrompt, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      await client.style.save.$post({ prompt })
    },
    onSuccess: () => {
      refetchStyle()
      toast.success('Style saved')
    },
    onError: (error: HTTPException) => {
      toast.error(error.message)
    },
  })

  const [connectedAccount, setConnectedAccount] = useLocalStorage(
    'connected-account',
    DEFAULT_CONNECTED_ACCOUNT,
  )

  const { data: style, refetch: refetchStyle } = useQuery({
    queryKey: ['account-style'],
    queryFn: async () => {
      const res = await client.style.get.$get()
      return await res.json()
    },
  })

  useEffect(() => {
    if (style?.prompt) setPrompt(style.prompt)
  }, [style])

  const { data: account } = useQuery<ConnectedAccount>({
    queryKey: ['get-connected-account'],
    queryFn: async () => {
      const res = await client.settings.connected_account.$get()
      const { account } = await res.json()
      return account ?? DEFAULT_CONNECTED_ACCOUNT
    },
    initialData: connectedAccount,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (account && account.username) {
      setConnectedAccount(account)
      setTwitterUsername('@' + account.username)
    }
  }, [account])

  const { mutate: connectAccount, isPending: isConnecting } = useMutation({
    mutationFn: async ({ username }: { username: string }) => {
      const res = await client.settings.connect.$post({ username })
      return await res.json()
    },
    onSuccess: ({ data }) => {
      queryClient.setQueryData(['connected-account'], data)
      setConnectedAccount(data)
      toast.success('Account connected!')
    },
    onError: (error: HTTPException) => {
      toast.error(error.message)
    },
  })

  const [editor] = useLexicalComposerContext()

  const { data: knowledgeData } = useQuery({
    queryKey: ['knowledge-documents'],
    queryFn: async () => {
      const res = await client.knowledge.list.$get()
      return await res.json()
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const exampleDocuments = knowledgeData?.documents?.filter(doc => doc.isExample) || []

  const renderPart = (
    part: UIMessage['parts'][number],
    index: number,
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
      case 'step-start':
        return index > 0 ? <Separator key={index} className="!my-4" /> : null
      case 'tool-invocation':
        switch (part.toolInvocation.state) {
          case 'partial-call':
          case 'call':
            return part.toolInvocation.toolName === 'read_website_content' ? (
              <ReadLinkLoader
                status="pending"
                title="Reading link..."
                key={index}
                url={part.toolInvocation.args?.website_url}
              />
            ) : (
              <TweetSuggestionLoader key={index} />
            )
          case 'result':
            if (part.toolInvocation.toolName === 'read_website_content') {
              return (
                <ReadLinkLoader
                  status="success"
                  key={index}
                  title={part.toolInvocation.result.title}
                  url={part.toolInvocation.args?.website_url}
                />
              )
            }

            if (part.toolInvocation.toolName === 'edit_tweet') {
              const result = part.toolInvocation.result
              return (
                <div
                  key={result.id}
                  className="bg-white shadow-[0_2px_0_#E5E7EB] rounded-lg p-3 border border-gray-200"
                >
                  <div className="flex flex-col gap-2 text-sm/6">
                    <Improvements />
                  </div>
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
      <Toaster position="top-center" />
      {children}
      <Tabs
        defaultValue="assistant"
        value={activeTab}
        onValueChange={(tab) => setActiveTab(tab as 'assistant' | 'settings')}
      >
        <Sidebar side="right" collapsible="offcanvas">
          <SidebarHeader className="flex flex-col border-b border-stone-200 bg-stone-100 items-center justify-end gap-2 px-4">
            <div className="w-full flex items-center justify-between">
              <p className="text-sm/6 font-medium">
                {activeTab === 'assistant' ? 'Assistant' : 'Settings'}
              </p>
              <div className="flex gap-2">
                <DuolingoButton
                  size="icon"
                  variant={activeTab === 'settings' ? 'primary' : 'secondary'}
                  title="Settings"
                  onClick={() =>
                    setActiveTab(activeTab === 'settings' ? 'assistant' : 'settings')
                  }
                >
                  <Settings className="size-4" />
                </DuolingoButton>
                <DuolingoButton
                  onClick={() => startNewChat({ newId: nanoid() })}
                  size="icon"
                  variant="secondary"
                  title="New Chat"
                >
                  <Plus className="size-4" />
                </DuolingoButton>
                <DuolingoButton
                  onClick={toggleSidebar}
                  variant="secondary"
                  size="icon"
                  title="Close Sidebar"
                >
                  <X className="size-4" />
                </DuolingoButton>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="h-full p-4 !mb-8">
            <SidebarGroup className="h-full">
              <TabsContent className="h-full" value="assistant">
                <div className="flex flex-col-reverse space-y-reverse space-y-3 h-full overflow-y-auto">
                  {messages.length > 0 ? (
                    (() => {
                      const reversed = [...messages].reverse()
                      let lastUserIdx = reversed.findIndex((m) => m.role === 'user')
                      if (lastUserIdx === -1) lastUserIdx = 0
                      const hasAssistantAfterUser = reversed
                        .slice(0, lastUserIdx)
                        .some((m) => m.role === 'assistant')
                      const showTyping = status === 'submitted' && !hasAssistantAfterUser
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
                      return renderList.map((message, i) => {
                        // @ts-expect-error unknown property
                        if (message.typingLoader) {
                          return (
                            <Message key="__typing__">
                              <div className="flex items-start gap-3">
                                <div className="space-y-2 flex-1">
                                  <div className="flex items-center gap-2 mt-2">
                                    <Loader variant="typing" size="md" />
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
                                message.role === 'assistant'
                                  ? ''
                                  : 'bg-stone-200 w-fit pr-6'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {message.role === 'user' && (
                                  <Avatar className="size-7 flex items-center justify-center bg-stone-800 rounded-full flex-shrink-0">
                                    <p className="text-white text-[12px] font-medium">
                                      {connectedAccount.name.slice(0, 1).toUpperCase()}
                                    </p>
                                  </Avatar>
                                )}
                                <div className="space-y-2 flex-1">
                                  {message.parts.map((part, index) => {
                                    return renderPart(part, index)
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
                        <p className="text-xs text-stone-500">Examples</p>
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
                            
                            const blogDoc = exampleDocuments.find(doc => 
                              doc.title?.includes('Zod') || doc.type === 'url'
                            )
                            
                            if (blogDoc) {
                              addKnowledgeAttachment(blogDoc)
                              
                              editor.update(() => {
                                const root = $getRoot()
                                const p = $createParagraphNode()
                                p.append($createTextNode('write a tweet about this article'))
                                root.clear()
                                root.append(p)
                                p.select()
                              })
                              editor.focus()
                            } else {
                              toast.error('Example blog article not found. Try adding your own content!')
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
                            
                            const imageDoc = exampleDocuments.find(doc => 
                              doc.title?.includes('React') || doc.type === 'image'
                            )
                            
                            if (imageDoc) {
                              addKnowledgeAttachment(imageDoc)
                              
                              editor.update(() => {
                                const root = $getRoot()
                                const p = $createParagraphNode()
                                p.append($createTextNode('tweet i just learned about this'))
                                root.clear()
                                root.append(p)
                                p.select()
                              })
                              editor.focus()
                            } else {
                              toast.error('Example code image not found. Try uploading your own image!')
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
              </TabsContent>

              <TabsContent className="h-full" value="settings">
                <div className="flex flex-col h-full p-4 space-y-6">
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2 justify-start items-center">
                        <h3 className="text-sm font-medium text-stone-800 dark:text-stone-200">
                          Connect Account
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="w-full flex items-center space-x-2">
                        <DuolingoInput
                          fullWidth
                          className="flex-1 w-full"
                          type="text"
                          placeholder="@joshtriedcoding"
                          value={twitterUsername}
                          onChange={(e) => setTwitterUsername(e.target.value)}
                        />
                        <DuolingoButton
                          variant="dashedOutline"
                          size="sm"
                          className="w-fit"
                          onClick={() => connectAccount({ username: twitterUsername })}
                          disabled={isConnecting}
                        >
                          {isConnecting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            'Connect'
                          )}
                        </DuolingoButton>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2 justify-start items-center">
                        <h3 className="text-sm font-medium text-stone-800 dark:text-stone-200">
                          Fine-Tune Prompt
                        </h3>
                        <DuolingoBadge variant="gray" className="px-3 text-xs">
                          Optional
                        </DuolingoBadge>
                      </div>
                      <p className="text-sm text-stone-600">
                        If the agent doesn't quite get your style, fine-tune it here
                      </p>
                    </div>
                    <DuolingoTextarea
                      fullWidth
                      className="min-h-32"
                      placeholder="My tweets always use this emoji (◆) for bullet points and usually consist of a short, catchy intro hook and three bullet points. I love the 🎉 emoji"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                    />
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-stone-800 dark:text-stone-200">
                      Style Reference
                    </h3>
                    <p className="text-sm text-stone-600">
                      Paste a direct link to tweets to use as a style reference
                    </p>
                    <div className="w-full flex items-center space-x-2">
                      <DuolingoInput
                        fullWidth
                        value={tweetLink}
                        onChange={(e) => {
                          setTweetLink(e.target.value)
                        }}
                        className="flex-1 w-full"
                        type="text"
                        placeholder="https://x.com/username/status/1234567890123456789"
                      />
                      <DuolingoButton
                        onClick={() => {
                          importTweets({ link: tweetLink })
                        }}
                        disabled={isImporting}
                        variant="dashedOutline"
                        className="w-fit"
                        size="sm"
                      >
                        {isImporting ? 'Importing...' : 'Import'}
                      </DuolingoButton>
                    </div>

                    <div className="flex flex-col p-4 gap-2 items-center justify-center text-center h-full border border-dashed border-gray-200 bg-stone-100 dark:border-gray-800 rounded-lg">
                      {style?.tweets.length ? (
                        <div className="w-full h-full flex flex-col gap-2 justify-start">
                          {style.tweets.map((tweet, index) => {
                            return (
                              <div className="relative" key={index}>
                                <DuolingoButton
                                  variant="destructive"
                                  className="absolute top-3 right-3 w-fit p-1.5 text-white aspect-square"
                                  onClick={() => deleteTweet({ tweetId: tweet.id })}
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <X className="size-4" />
                                  )}
                                </DuolingoButton>
                                <TweetCard
                                  username={tweet.author.username}
                                  name={tweet.author.name}
                                  src={tweet.author.profile_image_url}
                                  text={tweet.text}
                                />
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <>
                          <Sparkles className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            No imported tweets yet
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                            Curated style presets coming soon
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </SidebarGroup>
          </SidebarContent>

          {activeTab === 'assistant' ? (
            <SidebarFooter className="p-3 border-t">
              <ChatInput />
            </SidebarFooter>
          ) : (
            <SidebarFooter className="p-3 border-t">
              <DuolingoButton
                className="w-full"
                onClick={() => savePrompt()}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-5" />
                    Save
                  </>
                )}
              </DuolingoButton>
            </SidebarFooter>
          )}
          <SidebarRail />
        </Sidebar>
      </Tabs>
    </>
  )
}
