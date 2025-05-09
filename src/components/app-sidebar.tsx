"use client"

import { Message, useChat } from "@ai-sdk/react"

import {
  ArrowUp,
  CheckCircle2,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Plus,
  ReplyAllIcon,
  Settings,
  Sparkles,
  User,
  X,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { MentionProvider, useMentionContext } from "@/hooks/mention-ctx"
import { useTweetContext } from "@/hooks/tweet-ctx"
import { client } from "@/lib/client"
import { MentionPlugin } from "@/lib/mention-plugin"
import { MentionNode } from "@/lib/nodes"
import PlaceholderPlugin from "@/lib/placeholder-plugin"
import { InferInput } from "@/server"
import { EditTweetToolResult } from "@/server/routers/chat-router"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { HTTPException } from "hono/http-exception"
import { $getRoot } from "lexical"
import { nanoid } from "nanoid"
import { useQueryState } from "nuqs"
import { KeyboardEvent as ReactKeyboardEvent } from "react"
import { Improvements } from "./improvements"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Input } from "./ui/input"
import { Separator } from "./ui/separator"
import { Tabs, TabsContent } from "./ui/tabs"
import { TextShimmer } from "./ui/text-shimmer"
import { Textarea } from "./ui/textarea"
import { authClient } from "@/lib/auth-client"
import toast, { Toaster } from "react-hot-toast"
import { SidebarDoc, useDocumentContext } from "@/hooks/document-ctx"
import { useParams, useSearchParams } from "next/navigation"
import { useLocalStorage } from "@/hooks/use-local-storage"
import {
  ConnectedAccount,
  DEFAULT_CONNECTED_ACCOUNT,
} from "./tweet-editor/tweet-editor"
import { Icons } from "./icons"

const initialConfig = {
  namespace: "context-document-editor",
  theme: {
    text: {
      bold: "font-bold",
      italic: "italic",
      underline: "underline",
    },
  },
  onError: (error: Error) => {
    console.error("[Context Document Editor Error]", error)
  },
  editable: true,
  nodes: [MentionNode],
}

type ChatInput = InferInput["chat"]["generate"]
type HandleInputChange = (
  e:
    | React.ChangeEvent<HTMLInputElement>
    | React.ChangeEvent<HTMLTextAreaElement>
) => void
type HandleSubmit = (
  event?: React.FormEvent<HTMLFormElement>,
  chatRequestOptions?: any
) => void

function ChatInput({
  handleInputChange,
  handleSubmit,
  messages,
  status,
  startNewChat,
}: {
  handleInputChange: HandleInputChange
  handleSubmit: HandleSubmit
  messages: Message[]
  status: "submitted" | "streaming" | "ready" | "error"
  startNewChat: () => string
}) {
  const [editor] = useLexicalComposerContext()
  const searchParams = useSearchParams()
  let chatId = searchParams.get("chatId")

  const { attachedDocumentIDs, clearAttachedDocuments } = useMentionContext()
  const { tweets, contents } = useTweetContext()

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (messages.length === 0 && !chatId) {
      chatId = startNewChat()
    }

    const attachedDocuments = attachedDocumentIDs.map((id) => {
      const item = localStorage.getItem(`doc-${id}`)
      const parsed = JSON.parse(item!) as { title: string; content: string }
      return { id, ...parsed }
    })

    handleSubmit(e, {
      body: {
        chatId,
        attachedDocuments,
        tweet: tweets.map((tweet) => ({
          ...tweet,
          content: contents.current.get(tweet.id) ?? "",
        }))[0],
      },
    })

    // cleanup
    clearAttachedDocuments()
    editor.update(() => {
      const root = $getRoot()
      root.clear()
    })
  }

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      onSubmit(e as any)
    }
  }

  useEffect(() => {
    const removeUpdateListener = editor.registerUpdateListener(
      ({ editorState }) => {
        editorState.read(() => {
          const root = $getRoot()
          const text = root.getTextContent()
          handleInputChange({
            target: { value: text },
          } as React.ChangeEvent<HTMLInputElement>)
        })
      }
    )

    return () => {
      removeUpdateListener()
    }
  }, [editor, handleInputChange])

  return (
    <form
      onSubmit={onSubmit}
      className="flex items-center rounded-lg border bg-white p-2"
    >
      <PlainTextPlugin
        contentEditable={
          <ContentEditable
            autoFocus
            className="w-full px-2 py-1 outline-none"
            onKeyDown={handleKeyDown}
          />
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
      <PlaceholderPlugin placeholder="Write anything" />
      <HistoryPlugin />
      <MentionPlugin />

      <button
        type="submit"
        disabled={status === "submitted" || status === "streaming"}
        className="size-8 shrink-0 disabled:opacity-50 bg-stone-800 hover:bg-stone-700 rounded-full flex items-center justify-center"
      >
        {status === "submitted" || status === "streaming" ? (
          <Loader2 className="size-4 text-white animate-spin" />
        ) : (
          <ArrowUp className="size-4 text-white" />
        )}
      </button>
    </form>
  )
}

function TweetSuggestionLoader() {
  const [connectedAccount] = useLocalStorage(
    "connected-account",
    DEFAULT_CONNECTED_ACCOUNT
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
              {account.verified && (
                <Icons.verificationBadge className="h-4 w-4" />
              )}
              <span className="text-stone-400 text-base">
                @{account.handle}
              </span>
            </div>
            <div className="mt-1 text-base leading-relaxed whitespace-pre-line">
              <TextShimmer
                className=" [--base-gradient-color:#78716c]"
                duration={0.7}
              >
                Creating...
              </TextShimmer>
            </div>
          </div>
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
              <span className="text-sm/6 text-muted-foreground">
                @{username}
              </span>
            </div>
            <div className="mt-1 text-base whitespace-pre-line">{text}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TweetSuggestion({
  id,
  suggestion,
  
}: {
  id: string
  suggestion: string
}) {
  const { updateTweet } = useTweetContext()
  const [connectedAccount] = useLocalStorage(
    "connected-account",
    DEFAULT_CONNECTED_ACCOUNT
  )

  const reapply = () => {
    updateTweet(id, suggestion)
  }

  return (
    <div className="relative w-full">
      <div className="relative text-left rounded-lg bg-white shadow overflow-hidden">
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
  const id = useRef(nanoid())
  const { addImprovements, rejectAllImprovements } = useTweetContext()

  const [activeTab, setActiveTab] = useQueryState<"assistant" | "settings">(
    "tab",
    {
      defaultValue: "assistant",
      parse: (value) => {
        if (value === "assistant") return "assistant"
        return "settings"
      },
      serialize: (value) => value,
    }
  )

  const [chatId, setChatId] = useQueryState("chatId", {
    defaultValue: id.current,
    parse: (value) => {
      id.current = value
      return value
    },
    serialize: (value) => value,
  })

  const { toggleSidebar } = useSidebar()

  const { data } = useQuery({
    queryKey: ["get-chat-messages", chatId],
    queryFn: async () => {
      const res = await client.chat.chat_messages.$get({ chatId })
      return await res.json()
    },
  })

  const { messages, handleInputChange, handleSubmit, setInput, status } =
    useChat({
      initialMessages: data?.chat?.messages,
      id: chatId,
      maxSteps: 5,
      api: "/api/chat/generate",
      // only send the last message to the server:
      experimental_prepareRequestBody({ messages, requestBody, requestData }) {
        console.log("body, data", requestBody, requestData)
        return {
          // remove trailing \n from pressing enter if there is one
          message: {
            ...messages[messages.length - 1],
            content: messages[messages.length - 1]?.content.trimEnd(),
          },
          ...requestBody,
        }
      },
      onError(err) {
        toast.error(err.message)
      },
    })

  const startNewChat = () => {
    const newId = nanoid()
    id.current = newId

    setActiveTab("assistant")
    setChatId(id.current)
    setInput("")

    return id.current
  }

  const resultMap = new Map<string, boolean>()
  const resultRef = useRef(resultMap)

  useEffect(() => {
    const lastMessage = messages[messages.length - 1]

    lastMessage?.parts.forEach((part) => {
      if (part.type === "tool-invocation") {
        const hasFired = resultRef.current.get(part.toolInvocation.toolCallId)

        if (!hasFired && part.toolInvocation.state === "result") {
          // tool is done generating tweet
          const { id, diffs } = part.toolInvocation
            .result as EditTweetToolResult

          addImprovements(id, diffs)

          resultRef.current.set(part.toolInvocation.toolCallId, true)
        }
      }
    })
  }, [messages, resultRef])

  const [tweetLink, setTweetLink] = useState("")
  const [prompt, setPrompt] = useState("")
  const [twitterUsername, setTwitterUsername] = useState("")

  const { mutate: importTweets, isPending: isImporting } = useMutation({
    mutationFn: async ({ link }: { link: string }) => {
      await client.style.import.$post({ link })
    },
    onSuccess: () => {
      setTweetLink("")
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
      await queryClient.cancelQueries({ queryKey: ["account-style"] })
      const previousStyle = queryClient.getQueryData(["account-style"])

      queryClient.setQueryData(["account-style"], (oldData: any) => {
        if (!oldData?.tweets) return oldData
        return {
          ...oldData,
          tweets: oldData.tweets.filter((tweet: any) => tweet.id !== tweetId),
        }
      })

      return { previousStyle }
    },
    onError: (error: HTTPException, _, context) => {
      queryClient.setQueryData(["account-style"], context?.previousStyle)
      toast.error(error.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["account-style"] })
    },
  })

  const { mutate: savePrompt, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      await client.style.save.$post({ prompt })
    },
    onSuccess: () => {
      refetchStyle()
      toast.success("Style saved")
    },
    onError: (error: HTTPException) => {
      toast.error(error.message)
    },
  })

  const [connectedAccount, setConnectedAccount] = useLocalStorage(
    "connected-account",
    DEFAULT_CONNECTED_ACCOUNT
  )

  const { data: style, refetch: refetchStyle } = useQuery({
    queryKey: ["account-style"],
    queryFn: async () => {
      const res = await client.style.get.$get()
      return await res.json()
    },
  })

  useEffect(() => {
    if (style?.prompt) setPrompt(style.prompt)
  }, [style])

  const { data: account } = useQuery<ConnectedAccount>({
    queryKey: ["connected-account"],
    queryFn: async () => {
      const res = await client.settings.connectedAccount.$get()
      const { account } = await res.json()
      return account ?? DEFAULT_CONNECTED_ACCOUNT
    },
    initialData: connectedAccount,
  })

  useEffect(() => {
    if (account.username) {
      setTwitterUsername("@" + account.username)
    }
  }, [account])

  const { mutate: connectAccount, isPending: isConnecting } = useMutation({
    mutationFn: async ({ username }: { username: string }) => {
      const res = await client.settings.connect.$post({ username })
      return await res.json()
    },
    onSuccess: ({ data }) => {
      queryClient.setQueryData(["connected-account"], data)
      setConnectedAccount(data)
      toast.success("Account connected!")
    },
    onError: (error: HTTPException) => {
      toast.error(error.message)
    },
  })

  return (
    <>
      <Toaster position="top-center" />
      {children}
      <Tabs
        defaultValue="assistant"
        value={activeTab}
        onValueChange={(tab) => setActiveTab(tab as "assistant" | "settings")}
      >
        <Sidebar side="right" collapsible="offcanvas">
          <SidebarHeader className="flex flex-col border-b border-stone-200 items-center justify-end gap-2 px-4">
            <div className="w-full flex items-center justify-between">
              <p className="text-sm/6 font-medium">
                {activeTab === "assistant" ? "Assistant" : "Settings"}
              </p>
              <div>
                <Button
                  size="icon"
                  variant={activeTab === "settings" ? "default" : "ghost"}
                  title="Settings"
                  onClick={() =>
                    setActiveTab(
                      activeTab === "settings" ? "assistant" : "settings"
                    )
                  }
                >
                  <Settings className="size-4" />
                </Button>
                <Button
                  onClick={startNewChat}
                  size="icon"
                  variant="ghost"
                  title="New Chat"
                >
                  <Plus className="size-4" />
                </Button>
                <Button
                  onClick={toggleSidebar}
                  variant="ghost"
                  size="icon"
                  title="Close Sidebar"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="h-full p-4 !mb-8">
            <SidebarGroup className="h-full">
              <TabsContent className="h-full" value="assistant">
                <div className="flex flex-col-reverse space-y-reverse space-y-4 h-full overflow-y-auto">
                  {messages.length > 0 ? (
                    [...messages].reverse().map((message) => (
                      <div
                        key={message.id}
                        className={`w-full text-left p-4 rounded-2xl relative ${
                          message.role === "assistant" ? "" : "bg-stone-200/75"
                        }`}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          {message.role === "assistant" ? (
                            <Sparkles className="size-3.5 text-primary" />
                          ) : (
                            <User className="size-3.5 text-primary" />
                          )}
                          <span className="text-xs font-medium text-primary/80">
                            {message.role === "assistant" ? "Assistant" : "You"}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {message.parts.map((part, index) => {
                            switch (part.type) {
                              case "text":
                                return (
                                  <p
                                    key={index}
                                    className="text-base leading-relaxed text-stone-800"
                                  >
                                    {part.text}
                                  </p>
                                )
                              case "step-start":
                                return index > 0 ? (
                                  <Separator key={index} className="!my-5" />
                                ) : null
                              case "tool-invocation":
                                switch (part.toolInvocation.state) {
                                  case "partial-call":
                                  case "call":
                                    return <TweetSuggestionLoader key={index} />
                                  case "result":
                                    if (
                                      part.toolInvocation.toolName ===
                                        "edit_tweet" ||
                                      part.toolInvocation.toolName ===
                                        "create_tweet"
                                    ) {
                                      const result = part.toolInvocation.result
                                      return (
                                        <div
                                          key={result.id}
                                          className="group bg-stone-100 p-2 shadow-inner rounded-lg border border-dashed border-stone-200 rounded-b-xl"
                                        >
                                          <TweetSuggestion
                                            id={result.id}
                                            suggestion={result.improvedText}
                                          />
                                          <div className="flex flex-col gap-2 p-2 pt-4 text-sm/6">
                                            <div className="flex justify-between">
                                              <p>Suggestions:</p>
                                            </div>

                                            <Improvements />
                                          </div>
                                        </div>
                                      )
                                    }
                                    return (
                                      <div
                                        key={index}
                                        className="bg-gradient-to-br from-emerald-50/50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/30 border border-emerald-200/30 dark:border-emerald-700/30 p-3 rounded-lg"
                                      >
                                        <div className="flex items-center gap-2 mb-2">
                                          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                            Tool result:{" "}
                                            {part.toolInvocation.toolName}
                                          </p>
                                        </div>
                                        <div className="text-sm bg-white/50 dark:bg-black/20 p-2 rounded">
                                          {typeof part.toolInvocation.result ===
                                          "object"
                                            ? JSON.stringify(
                                                part.toolInvocation.result,
                                                null,
                                                2
                                              )
                                            : part.toolInvocation.result}
                                        </div>
                                      </div>
                                    )
                                  default:
                                    return null
                                }
                              default:
                                return null
                            }
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex h-full flex-1 flex-col items-center justify-center text-center p-8">
                      <p className="text-4xl leading-relaxed">🗣️</p>
                      <p className="text-base text-stone-800 font-medium">
                        Start a conversation
                      </p>
                      <p className="text-sm/6 text-muted-foreground mt-1">
                        Ask about your writing or request changes
                      </p>
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
                        <Input
                          className="flex-1 w-full bg-stone-100"
                          type="text"
                          placeholder="@joshtriedcoding"
                          value={twitterUsername}
                          onChange={(e) => setTwitterUsername(e.target.value)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            connectAccount({ username: twitterUsername })
                          }
                          disabled={isConnecting}
                        >
                          {isConnecting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            "Connect"
                          )}
                        </Button>
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
                        <span className="text-xs px-2 py-0.5 bg-stone-200 text-stone-600 rounded-full">
                          Optional
                        </span>
                      </div>
                      <p className="text-sm text-stone-600">
                        If the agent doesn't quite get your style, fine-tune it
                        here
                      </p>
                    </div>
                    <Textarea
                      className="min-h-24"
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
                    <div className="flex items-center justify-between">
                      <div className="w-full flex items-center space-x-2">
                        <Input
                          value={tweetLink}
                          onChange={(e) => {
                            setTweetLink(e.target.value)
                          }}
                          className="flex-1 w-full bg-stone-100"
                          type="text"
                          placeholder="https://x.com/username/status/1234567890123456789"
                        />
                        <Button
                          onClick={() => {
                            importTweets({ link: tweetLink })
                          }}
                          disabled={isImporting}
                          variant="outline"
                          size="sm"
                        >
                          {isImporting ? "Importing..." : "Import"}
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col p-4 gap-2 items-center justify-center text-center h-full border border-dashed border-gray-200 bg-stone-100 dark:border-gray-800 rounded-lg">
                      {style?.tweets.length ? (
                        <div className="w-full h-full flex flex-col gap-2 justify-start">
                          {style.tweets.map((tweet, index) => {
                            return (
                              <div className="relative" key={index}>
                                <Button
                                  variant="ghost"
                                  className="absolute top-3 right-3 !p-1.5 aspect-square"
                                  onClick={() =>
                                    deleteTweet({ tweetId: tweet.id })
                                  }
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? (
                                    <Loader2 className="size-4 text-stone-500 animate-spin" />
                                  ) : (
                                    <X className="size-4 text-stone-500" />
                                  )}
                                </Button>
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

          {activeTab === "assistant" ? (
            <SidebarFooter className="p-3 border-t">
              <MentionProvider>
                <LexicalComposer initialConfig={initialConfig}>
                  <ChatInput
                    handleInputChange={handleInputChange}
                    handleSubmit={handleSubmit}
                    messages={messages}
                    status={status}
                    startNewChat={startNewChat}
                  />
                </LexicalComposer>
              </MentionProvider>
            </SidebarFooter>
          ) : (
            <SidebarFooter className="p-3 border-t">
              <Button
                className="w-full h-12"
                onClick={() => savePrompt()}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Style"
                )}
              </Button>
            </SidebarFooter>
          )}
          <SidebarRail />
        </Sidebar>
      </Tabs>
    </>
  )
}
