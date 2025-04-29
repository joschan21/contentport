"use client"

import { useChat } from "@ai-sdk/react"

import {
  ArrowUp,
  Bot,
  Check,
  CheckCircle2,
  Command,
  Feather,
  Loader2,
  Plus,
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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { MentionProvider, useMentionContext } from "@/hooks/mention-ctx"
import { useTweetContext } from "@/hooks/tweet-ctx"
import { MentionPlugin } from "@/lib/mention-plugin"
import { MentionNode } from "@/lib/nodes"
import PlaceholderPlugin from "@/lib/placeholder-plugin"
import { cn } from "@/lib/utils"
import { InferInput } from "@/server"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin"
import { $getRoot } from "lexical"
import { nanoid } from "nanoid"
import { useQueryState } from "nuqs"
import { KeyboardEvent as ReactKeyboardEvent } from "react"
import { Improvements } from "./improvements"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Separator } from "./ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { EditTweetToolResult } from "@/server/routers/chat-router"
import { TextShimmer } from "./ui/text-shimmer"
import { Textarea } from "./ui/textarea"
import { Input } from "./ui/input"
import { useMutation, useQuery } from "@tanstack/react-query"
import { client } from "@/lib/client"
import { HTTPException } from "hono/http-exception"
import { toast } from "sonner"

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

function ChatInput({
  handleInputChange,
  handleSubmit,
  chatId,
  startNewChat,
}: {
  handleInputChange: (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => void
  handleSubmit: (
    event?: React.FormEvent<HTMLFormElement>,
    chatRequestOptions?: any
  ) => void
  chatId: string
  startNewChat: () => void
}) {
  const [editor] = useLexicalComposerContext()

  const { attachedDocumentIDs } = useMentionContext()
  const { tweets, contents } = useTweetContext()
  const { messages, status } = useChat({
    id: chatId,
    body: {
      chatId,
    },
    maxSteps: 5,
    api: "/api/chat/generate",
  })

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (messages.length === 0) {
      startNewChat()
    }

    handleSubmit(e, {
      body: {
        attachedDocumentIDs,
        tweets: tweets.map((tweet) => ({
          ...tweet,
          content: contents.current.get(tweet.id),
        })),
      },
    })

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
  return (
    <div>
      <div className="my-3 !mt-5 rounded-lg bg-white border border-dashed border-stone-200 shadow-sm overflow-hidden">
        <div className="flex items-start gap-3 p-6">
          <Avatar className="h-10 w-10 rounded-full border border-border/30">
            <AvatarImage
              src="/images/profile_picture.jpg"
              alt="@joshtriedcoding"
            />
            <AvatarFallback className="bg-primary/10 text-primary text-sm/6">
              J
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base leading-relaxed font-semibold">
                Josh tried coding
              </span>
              <span className="text-sm/6 text-muted-foreground">
                @joshtriedcoding
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
  const { acceptSuggestion, rejectSuggestion } = useTweetContext()

  return (
    <div className="w-full">
      <div className="text-left rounded-lg bg-white shadow overflow-hidden">
        <div className="flex items-start gap-3 p-6">
          <Avatar className="h-10 w-10 rounded-full border border-border/30">
            <AvatarImage
              src="/images/profile_picture.jpg"
              alt="@joshtriedcoding"
            />
            <AvatarFallback className="bg-primary/10 text-primary text-sm/6">
              J
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base leading-relaxed font-semibold">
                Josh tried coding
              </span>
              <span className="text-sm/6 text-muted-foreground">
                @joshtriedcoding
              </span>
            </div>
            <div className="mt-1 text-base leading-relaxed whitespace-pre-line">
              {suggestion}
            </div>
          </div>
        </div>
      </div>
      {/* <div className="flex justify-end gap-2 p-2 bg-muted/20">
        <button
          onClick={() => rejectSuggestion(id)}
          className="flex items-center gap-1 font-medium bg-red-50 text-red-700 ring-1 ring-red-600/10 ring-inset text-xs px-3 py-1.5 rounded-full bg-background hover:bg-red-100 transition-colors"
        >
          <X className="h-3 w-3" />
          <span>Reject</span>
        </button>
        <button
          onClick={() => acceptSuggestion(id, suggestion)}
          className="flex items-center gap-1 bg-stone-800 text-white font-medium ring-1 ring-stone-600/10 ring-inset text-xs px-3 py-1.5 rounded-full bg-background hover:bg-stone-900 transition-colors"
        >
          <Check className="size-3" />
          <span>Apply</span>
        </button>
      </div> */}
    </div>
  )
}

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useQueryState<
    "assistant" | "writing-style"
  >("tab", {
    defaultValue: "assistant",
    parse: (value) => (value === "assistant" ? "assistant" : "writing-style"),
    serialize: (value) => value,
  })

  const [chatId, setChatId] = useQueryState("chatId", {
    defaultValue: nanoid(),
    parse: (value) => value,
    serialize: (value) => value,
  })

  const { tweets, addImprovements } = useTweetContext()
  const { toggleSidebar } = useSidebar()

  const { messages, handleInputChange, handleSubmit, setInput } = useChat({
    id: chatId,
    body: { chatId },
    maxSteps: 5,
    api: "/api/chat/generate",
  })

  const startNewChat = () => {
    setChatId(nanoid())
    setInput("")
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
          const { id, improvedText, diffs } = part.toolInvocation
            .result as EditTweetToolResult

          addImprovements(id, diffs)

          // if (part.toolInvocation.toolName === "create_tweet") {
          //   createTweet(id)
          //   waitForEditor(id, () => {
          //     applyTweet(id, content)
          //   })
          // } else if (part.toolInvocation.toolName === "edit_tweet") {
          //   // For edit_tweet, we just apply the changes directly
          //   applyTweet(id, content)
          // }

          resultRef.current.set(part.toolInvocation.toolCallId, true)
        }
      }
    })
  }, [messages, resultRef])

  const { width } = useSidebar()
  const isNarrow = parseInt(width.replace(/[^\d.]/g, "")) * 16 < 400

  const [tweetLink, setTweetLink] = useState("")
  const [prompt, setPrompt] = useState("")

  const { data: style, refetch } = useQuery({
    queryKey: ["get-user-style"],
    queryFn: async () => {
      const res = await client.style.get.$get()
      return await res.json()
    },
  })

  // Initialize prompt from style data when it loads
  useEffect(() => {
    if (style?.prompt) {
      setPrompt(style.prompt)
    }
  }, [style?.prompt])

  const { mutate: importTweets, isPending: isImporting } = useMutation({
    mutationFn: async ({ link }: { link: string }) => {
      await client.style.import.$post({ link })
    },
    onSuccess: () => {
      setTweetLink("")
      refetch()
    },
    onError: (error: HTTPException) => {
      toast.error(error.message)
    },
  })

  const { mutate: deleteTweet, isPending: isDeleting } = useMutation({
    mutationFn: async ({ tweetId }: { tweetId: string }) => {
      await client.style.delete.$post({ tweetId })
    },
    onSuccess: () => {
      refetch()
    },
    onError: (error: HTTPException) => {
      toast.error(error.message)
    },
  })

  const { mutate: savePrompt, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      await client.style.save.$post({ prompt })
    },
    onSuccess: () => {
      refetch()
      toast.success("Style prompt saved successfully")
    },
    onError: (error: HTTPException) => {
      toast.error(error.message)
    },
  })

  return (
    <>
      {children}
      <Tabs
        defaultValue="assistant"
        value={activeTab}
        onValueChange={(tab) =>
          setActiveTab(tab as "assistant" | "writing-style")
        }
      >
        <Sidebar side="right" collapsible="offcanvas">
          <SidebarHeader className="flex flex-col border-b border-stone-200 items-center justify-end gap-2 px-4">
            <div className="w-full flex items-center justify-between">
              <p className="text-sm/6 font-medium">
                {activeTab === "assistant" ? "Assistant" : "Style"}
              </p>
              <div>
                {" "}
                <Button
                  size="icon"
                  variant={activeTab === "writing-style" ? "default" : "ghost"}
                  title="Customize Writing Style"
                  onClick={() =>
                    setActiveTab(
                      activeTab === "writing-style"
                        ? "assistant"
                        : "writing-style"
                    )
                  }
                >
                  <Feather className="size-4" />
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
                                          className="bg-stone-100 p-2 shadow-inner rounded-lg border border-dashed border-stone-200 rounded-b-xl"
                                        >
                                          <TweetSuggestion
                                            id={result.id}
                                            suggestion={result.improvedText}
                                          />
                                          <div className="flex flex-col gap-2 p-2 pt-4 text-sm/6">
                                            <div className="flex justify-between">
                                              <p>Suggested Changes:</p>
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

              <TabsContent className="h-full" value="writing-style">
                <div className="flex flex-col h-full p-4 space-y-6">
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
                    chatId={chatId}
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
