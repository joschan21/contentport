"use client"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { FolderClock } from "lucide-react"
import { useDocumentContext } from "@/hooks/document-ctx"
import Link from "next/link"

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
  const { documentTitles } = useDocumentContext()

  const { tweets } = useTweetContext()

  const { data: documentsData, isPending } = useQuery({
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
    onMutate: async () => {
      const doc = {
        id: crypto.randomUUID(),
        title: "",
        updatedAt: new Date(),
      }

      await queryClient.setQueryData(["documents"], (old: Document[] = []) => {
        return [doc, ...old]
      })

      console.log("PUSH 2")
      router.push(`/studio/context/${doc.id}`)

      return { id: doc.id }
    },
    onSuccess: (data, _, context) => {
      console.log("PUSH 3")
      router.push(`/studio/context/${data.documentId}`)
      if (context?.id) {
        queryClient.setQueryData(["documents"], (old: Document[] = []) => {
          return old.map((doc) =>
            doc.id === context.id ? { ...doc, id: data.documentId } : doc
          )
        })
      }
    },
    onError: (_, __, context) => {
      if (context?.id) {
        queryClient.setQueryData(["documents"], (old: Document[] = []) => {
          return old.filter((doc) => doc.id !== context.id)
        })
      }
    },
  })

  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const res = await client.document.delete.$post({ documentId })
      return res.json()
    },
    onMutate: async (documentId) => {
      await queryClient.setQueryData(["documents"], (old: Document[] = []) => {
        return old.filter((doc) => doc.id !== documentId)
      })
      return { documentId }
    },
    onError: (_, __, context) => {
      if (context?.documentId) {
        queryClient.setQueryData(["documents"], (old: Document[] = []) => {
          const deletedDoc = contextDocs.find(
            (doc) => doc.id === context.documentId
          )
          if (deletedDoc) {
            return [...old, deletedDoc]
          }
          return old
        })
      }
    },
  })

  const addDocument = () => {
    createDocument.mutate()
  }

  const removeDocument = (id: string) => {
    if (pathname === `/studio/context/${id}`) {
      console.log("PUSH 1")
      router.push("/studio")
    }
    deleteDocument.mutate(id)
  }

  const mainDoc = documentsData?.find((doc) => doc.id === "main")
  const contextDocs = documentsData?.filter((doc) => doc.id !== "main") ?? []

  const prefetchDocument = (id: string) => {
    queryClient.prefetchQuery({
      queryKey: ["document", id],
      queryFn: async () => {
        const res = await client.document.get.$get({
          documentId: id,
        })
        return res.json()
      },
    })
  }

  return (
    <div className="bg-sidebar text-sidebar-foreground w-72">
      <div className="h-full flex flex-col fixed w-72">
        <SidebarHeader className="border-b h-16 border-border/40 p-4">
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
              <Link
                href="/studio"
                key={tweet.id}
                className={`flex items-center gap-2 p-2 rounded-md ${
                  pathname === "/studio" ? "bg-muted" : "bg-muted/50"
                } cursor-pointer`}
              >
                <Twitter className="size-4 text-blue-500 fill-blue-500" />
                <span className="text-sm font-medium">
                  {mainDoc?.id ?? "Tweet"}
                </span>
                <Badge className="text-xs ml-auto font-medium">Main</Badge>
              </Link>
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
              {isPending ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Loading documents...
                </div>
              ) : contextDocs.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No context documents yet
                </div>
              ) : (
                contextDocs.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/studio/context/${doc.id}`}
                    className={`flex items-center justify-between group p-2 rounded-md ${
                      pathname === `/studio/context/${doc.id}`
                        ? "bg-muted"
                        : "hover:bg-muted/50"
                    } cursor-pointer`}
                    onMouseEnter={() => prefetchDocument(doc.id)}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {documentTitles[doc.id] ||
                          doc.title ||
                          "Untitled document"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        removeDocument(doc.id)
                      }}
                      disabled={deleteDocument.isPending}
                    >
                      <X className="size-3" />
                    </Button>
                  </Link>
                ))
              )}
            </div>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-border/40 p-4">
          <Link
            href="https://docs.google.com/forms/d/e/1FAIpQLSdCtO75IY051uoGcxBQ_vK3uNnNnokb_Z8VTrp5JZJnzUI02g/viewform?usp=dialog"
            className={buttonVariants({variant: "outline"})}
            target="_blank"
            rel="noopener noreferrer"
          >
            Feedback 🫶
          </Link>
        </SidebarFooter>
      </div>
    </div>
  )
}
