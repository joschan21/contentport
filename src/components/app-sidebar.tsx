"use client"

import { useChat } from "@ai-sdk/react"

import {
  ArrowUp,
  AudioWaveform,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  Command,
  Frame,
  GalleryVerticalEnd,
  Loader2,
  MessageSquare,
  PieChart,
  SendIcon,
  Settings2,
  Sparkles,
  SquareTerminal,
  Target,
  User,
  X,
  Zap,
} from "lucide-react"
import { useRef, useState, useEffect, useLayoutEffect } from "react"

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
import { InferInput } from "@/server"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin"
import { $getRoot } from "lexical"
import { useQueryState } from "nuqs"
import { KeyboardEvent as ReactKeyboardEvent } from "react"
import { nanoid } from "nanoid"
import PlaceholderPlugin from "@/lib/placeholder-plugin"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Separator } from "./ui/separator"
import { Improvements } from "./improvements"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { cn } from "@/lib/utils"

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
    body: { chatId },
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

export function TweetSuggestion({
  id,
  suggestion,
}: {
  id: string
  suggestion: string
}) {
  const { acceptSuggestion, rejectSuggestion } = useTweetContext()

  return (
    <div>
      <div className="my-3 !mt-5 rounded-lg bg-white border border-dashed border-stone-200 shadow-sm overflow-hidden">
        <div className="flex items-start gap-3 p-6">
          <Avatar className="h-10 w-10 rounded-full border border-border/30">
            <AvatarImage src="/images/profile_picture.jpg" alt="@joshtriedcoding" />
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
      <div className="flex justify-end gap-2 p-2 bg-muted/20">
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
      </div>
    </div>
  )
}

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useQueryState<"improvements" | "assistant">(
    "tab",
    {
      defaultValue: "improvements",
      parse: (value): "improvements" | "assistant" =>
        value === "assistant" ? "assistant" : "improvements",
      serialize: (value) => value,
    }
  )

  const [chatId, setChatId] = useQueryState("chatId", {
    defaultValue: nanoid(),
    parse: (value) => value,
    serialize: (value) => value,
  })

  const { tweets, addSuggestion } = useTweetContext()

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
          const { id, content } = part.toolInvocation.result

          addSuggestion(id, content)

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

  return (
    <>
      {children}
      <Tabs
        defaultValue="improvements"
        value={activeTab}
        onValueChange={(tab) =>
          setActiveTab(tab as "assistant" | "improvements")
        }
      >
        <Sidebar side="right" collapsible="icon">
          <SidebarHeader className="border-b border-border/40 p-4">
            {/* <TabsList className={`w-full ${isNarrow ? 'grid grid-cols-1' : 'flex'} items-center gap-1 rounded-lg`}> */}
            <TabsList
              className={cn(
                {
                  "grid grid-cols-1 !h-auto": isNarrow,
                  "flex !h-auto": !isNarrow,
                },
                "items-center gap-2 bg-stone-100 p-2 rounded-md"
              )}
            >
              <TabsTrigger
                value="improvements"
                className={`flex items-center ${isNarrow ? "w-full" : "flex-1"} gap-1 px-3 border border-transparent py-2 text-stone-800 data-[state=active]:bg-white data-[state=active]:border data-[state=active]:border-stone-200 data-[state=active]:shadow-sm rounded-md`}
              >
                <Sparkles className="size-4" />
                <span className="text-sm font-medium">Improvements</span>
              </TabsTrigger>
              <TabsTrigger
                value="assistant"
                className={`flex ${isNarrow ? "w-full" : "flex-1"} items-center border border-transparent gap-1 px-3 py-2 text-stone-800 data-[state=active]:bg-white data-[state=active]:border data-[state=active]:border-stone-200 data-[state=active]:shadow-sm rounded-md`}
              >
                <Bot className="size-4" />
                <span className="text-sm font-medium">Assistant</span>
              </TabsTrigger>
            </TabsList>
            {activeTab === "assistant" && (
              <button
                onClick={startNewChat}
                className="ml-auto text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                New Chat
              </button>
            )}
          </SidebarHeader>
          <SidebarContent className="p-4 h-full">
            <SidebarGroup className="h-full">
              <TabsContent value="improvements">
                <SidebarGroupLabel>Improvements</SidebarGroupLabel>
                <Improvements />
              </TabsContent>

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
                                    return (
                                      <div
                                        key={index}
                                        className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-lg animate-pulse"
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className="size-2 rounded-full bg-blue-400/30 dark:bg-blue-400/50" />
                                          <p className="text-sm text-blue-600/70 dark:text-blue-300/70">
                                            Processing...
                                          </p>
                                        </div>
                                      </div>
                                    )
                                  case "call":
                                    return (
                                      <div
                                        key={index}
                                        className="bg-gradient-to-br from-blue-50/50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/30 border border-blue-200/30 dark:border-blue-700/30 p-3 rounded-lg"
                                      >
                                        <div className="flex items-center gap-2 mb-2">
                                          <Command className="size-4 text-blue-600 dark:text-blue-400" />
                                          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                            Using tool:{" "}
                                            {part.toolInvocation.toolName}
                                          </p>
                                        </div>
                                        <pre className="text-xs bg-white/50 dark:bg-black/20 p-2 rounded overflow-x-auto">
                                          {JSON.stringify(
                                            part.toolInvocation.args,
                                            null,
                                            2
                                          )}
                                        </pre>
                                      </div>
                                    )
                                  case "result":
                                    if (
                                      part.toolInvocation.toolName ===
                                        "edit_tweet" ||
                                      part.toolInvocation.toolName ===
                                        "create_tweet"
                                    ) {
                                      const result = part.toolInvocation.result
                                      return (
                                        <TweetSuggestion
                                          key={result.id}
                                          id={result.id}
                                          suggestion={result.content}
                                        />
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
            </SidebarGroup>
          </SidebarContent>

          {activeTab === "assistant" && (
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
          )}
          <SidebarRail />
        </Sidebar>
      </Tabs>
    </>
  )
}
