"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, X, FileText, ChevronsLeft, Twitter } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "./ui/sidebar"
import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { InferOutput } from "@/server"
import { SerializedEditorState, SerializedLexicalNode } from "lexical"
import { client } from "@/lib/client"
import { useTweetContext } from "@/hooks/tweet-ctx"

interface Document {
  id: string
  title: string
  updatedAt: Date
}

interface DocumentListResponse {
  success: boolean
  documents: Array<{
    id: string
    title: string
    updatedAt: Date
  }>
}

export function ContextSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()

  const { tweets } = useTweetContext()

  const { data: documentsData, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const res = await client.document.list.$get()
      return await res.json()
    },
  })

  const createDocument = useMutation({
    mutationFn: async () => {
      const res = await client.document.create.$post()
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] })
    },
  })

  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const res = await client.document.delete.$post({ documentId })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] })
    },
  })

  const addDocument = () => {
    createDocument.mutate()
  }

  const removeDocument = (id: string) => {
    deleteDocument.mutate(id)
    if (pathname === `/context/${id}`) {
      router.push("/main")
    }
  }

  const mainDoc = documentsData?.find((doc) => doc.id === "main")
  const contextDocs = documentsData?.filter((doc) => doc.id !== "main") ?? []

  return (
    <div className="bg-sidebar text-sidebar-foreground w-80">
      <div className="flex flex-col fixed w-80">
        <SidebarHeader className="border-b border-border/40 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg/7 tracking-tight text-stone-800 font-medium">
              Documents
            </h2>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-4 space-y-6">
          <SidebarGroup>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Main Content
            </h3>
            {tweets.map((tweet) => (
              <div
                key={tweet.id}
                className={`flex items-center gap-2 p-2 rounded-md ${
                  pathname === "/main" ? "bg-muted" : "bg-muted/50"
                } cursor-pointer`}
                onClick={() => router.push("/main")}
              >
                <Twitter className="size-4 text-blue-500 fill-blue-500" />
                <span className="text-sm font-medium">
                  {mainDoc?.id ?? "Tweet"}
                </span>
                <Badge className="text-xs ml-auto font-medium">Main</Badge>
              </div>
            ))}
          </SidebarGroup>

          <SidebarGroup>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Context Documents
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={addDocument}
                className="size-6"
                disabled={createDocument.isPending}
              >
                <Plus className="size-3" />
              </Button>
            </div>
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Loading documents...
                </div>
              ) : contextDocs.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No context documents yet
                </div>
              ) : (
                contextDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className={`flex items-center justify-between group p-2 rounded-md ${
                      pathname === `/context/${doc.id}`
                        ? "bg-muted"
                        : "hover:bg-muted/50"
                    } cursor-pointer`}
                    onClick={() => router.push(`/context/${doc.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {doc.title || `Unnamed document`}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeDocument(doc.id)
                      }}
                      disabled={deleteDocument.isPending}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </SidebarGroup>
        </SidebarContent>
        {/* <SidebarFooter className="border-t border-border/40 p-4">
        <div className="text-xs text-muted-foreground">
          Add context documents to help with your main tweet.
        </div>
      </SidebarFooter> */}
      </div>
    </div>
  )
}
