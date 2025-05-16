"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { SidebarDoc, useDocumentContext } from "@/hooks/document-ctx"
import { useTweetContext } from "@/hooks/tweet-ctx"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import { useQueryClient } from "@tanstack/react-query"
import { FileText, Plus, Twitter, X } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useRef } from "react"
import { NavLink, useLocation, useNavigate, useParams } from "react-router"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "./ui/sidebar"
import DuolingoButton from "./ui/duolingo-button"
import DuolingoBadge from "./ui/duolingo-badge"

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
  const { id } = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const { data } = authClient.useSession()
  const { docs, setDocs } = useDocumentContext()

  const { tweets } = useTweetContext()

  // const createDocument = useMutation({
  //   mutationFn: async () => {
  //     const res = await client.document.create.$post()
  //     return res.json()
  //   },
  //   onMutate: async () => {
  //     const doc = {
  //       id: crypto.randomUUID(),
  //       title: "",
  //       updatedAt: new Date(),
  //     }

  //     await queryClient.setQueryData(["documents"], (old: Document[] = []) => {
  //       return [doc, ...old]
  //     })

  //     console.log("PUSH 2")
  //     router.push(`/studio/context/${doc.id}`)

  //     return { id: doc.id }
  //   },
  //   onSuccess: (data, _, context) => {
  //     console.log("PUSH 3")
  //     router.push(`/studio/context/${data.documentId}`)
  //     if (context?.id) {
  //       queryClient.setQueryData(["documents"], (old: Document[] = []) => {
  //         return old.map((doc) =>
  //           doc.id === context.id ? { ...doc, id: data.documentId } : doc
  //         )
  //       })
  //     }
  //   },
  //   onError: (_, __, context) => {
  //     if (context?.id) {
  //       queryClient.setQueryData(["documents"], (old: Document[] = []) => {
  //         return old.filter((doc) => doc.id !== context.id)
  //       })
  //     }
  //   },
  // })

  // const deleteDocument = useMutation({
  //   mutationFn: async (documentId: string) => {
  //     const res = await client.document.delete.$post({ documentId })
  //     return res.json()
  //   },
  //   onMutate: async (documentId) => {
  //     await queryClient.setQueryData(["documents"], (old: Document[] = []) => {
  //       return old.filter((doc) => doc.id !== documentId)
  //     })
  //     return { documentId }
  //   },
  //   onError: (_, __, context) => {
  //     if (context?.documentId) {
  //       queryClient.setQueryData(["documents"], (old: Document[] = []) => {
  //         const deletedDoc = contextDocs.find(
  //           (doc) => doc.id === context.documentId
  //         )
  //         if (deletedDoc) {
  //           return [...old, deletedDoc]
  //         }
  //         return old
  //       })
  //     }
  //   },
  // })

  // const addDocument = () => {
  //   // createDocument.mutate()
  // }

  // const removeDocument = (id: string) => {
  //   if (pathname === `/studio/context/${id}`) {
  //     console.log("PUSH 1")
  //     router.push("/studio")
  //   }
  //   deleteDocument.mutate(id)
  // }

  // const contextDocs = documentsData?.filter((doc) => doc.id !== "main") ?? []

  // const prefetchDocument = (id: string) => {
  //   queryClient.prefetchQuery({
  //     queryKey: ["document", id],
  //     queryFn: async () => {
  //       const res = await client.document.get.$get({
  //         documentId: id,
  //       })
  //       return res.json()
  //     },
  //   })
  // }

  const newId = useRef(crypto.randomUUID())
  const navigate = useNavigate()
  const searchParams = useSearchParams()

  const getSearchString = () => {
    return searchParams ? `?${searchParams.toString()}` : ""
  }

  return (
    <div className="bg-light-gray text-sidebar-foreground w-80">
      <div className="h-full flex flex-col fixed w-80">
        <SidebarHeader className="border-b h-16 border-border/40 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg/7 tracking-tight text-stone-800 font-medium">
              Documents
            </h2>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-4 space-y-6">
          <SidebarGroup>
            <h3 className="text-sm font-medium text-stone-800 mb-2">
              Main Content
            </h3>

            <NavLink
              to={"/studio" + getSearchString()}
              className={`flex h-11 items-center gap-2 p-2 rounded-md ${
                pathname === "/studio" ? "bg-stone-200" : "hover:bg-stone-100"
              } cursor-pointer`}
            >
              <Twitter className="size-4 text-blue-500 fill-blue-500" />
              <span className="text-sm font-medium">Tweet</span>
              <DuolingoBadge className="text-xs ml-auto px-3">Main</DuolingoBadge>
            </NavLink>
          </SidebarGroup>

          <SidebarGroup>
            <div className="flex flex-col items-center justify-between mb-2">
              <h3 className="w-full text-sm font-medium text-stone-800">
                Context Documents
              </h3>
              <NavLink
              className="w-full mt-2"
                to={`/studio/context/${newId.current}${getSearchString()}`}
                onClick={() => {
                  const newDoc: SidebarDoc = {
                    id: newId.current,
                    title: "",
                    updatedAt: new Date(),
                  }
                  setDocs((prev) => [newDoc, ...prev])
                  newId.current = crypto.randomUUID()
                }}
              >
                <DuolingoButton
                  className="w-full h-10"
                >
                  <Plus className="size-4 mr-1.5" />
                  <span className="text-sm">Add</span>
                </DuolingoButton>
              </NavLink>
            </div>
            <div className="space-y-2 mt-1">
              {docs.length === 0
                ? null
                : docs.map((doc) => (
                    <NavLink
                      key={doc.id}
                      to={`/studio/context/${doc.id}${getSearchString()}`}
                      className={`flex h-11 items-center justify-between group p-2 rounded-md ${
                        pathname === `/studio/context/${doc.id}`
                          ? "bg-stone-200"
                          : "hover:bg-stone-100"
                      } cursor-pointer`}
                    >
                      <div className="flex items-center gap-2 pr-1.5 break-words">
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {doc.title || "Untitled document"}
                        </span>
                      </div>
                      <DuolingoButton
                        variant="destructive"
                        size="icon"
                        className="size-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setDocs((prev) =>
                            prev.filter((document) => document.id !== doc.id)
                          )
                          localStorage.removeItem(
                            `doc-${doc.id.replace(/^doc-/, "")}`
                          )
                          if (id === doc.id) navigate("/studio")
                        }}
                      >
                        <X className="size-3" />
                      </DuolingoButton>
                    </NavLink>
                  ))}
            </div>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-border/40 p-4">
          <div className="flex flex-col gap-2">
            {data?.user && (
              <NavLink
                to={`/settings${getSearchString()}`}
                className={cn(
                  buttonVariants({
                    variant: "outline",
                    className:
                      "flex items-center gap-2 justify-start px-3 py-2",
                  }),
                  "h-16"
                )}
              >
                <Avatar className="size-9 border-2 border-white shadow-md">
                  <AvatarImage
                    src={data.user.image || undefined}
                    alt={data.user.name ?? "Profile"}
                  />
                  <AvatarFallback>
                    {data.user.name?.charAt(0) ?? null}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start min-w-0">
                  <span className="truncate text-sm font-medium text-stone-800">
                    {data.user.name ?? "Account"}
                  </span>
                  {data.user.plan && (
                    <span className="truncate text-xs text-muted-foreground">
                      {data.user.plan === "free" ? "Free" : null}
                    </span>
                  )}
                </div>
              </NavLink>
            )}
            <Link
              href="https://docs.google.com/forms/d/e/1FAIpQLSdCtO75IY051uoGcxBQ_vK3uNnNnokb_Z8VTrp5JZJnzUI02g/viewform?usp=dialog"
              className={buttonVariants({ variant: "outline" })}
              target="_blank"
              rel="noopener noreferrer"
            >
              Feedback 🫶
            </Link>
          </div>
        </SidebarFooter>
      </div>
    </div>
  )
}
