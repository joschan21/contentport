'use client'

import { useState, useEffect, useMemo } from 'react'
import { Brain, FileText, Link, Star, Search } from 'lucide-react'
import { client } from '@/lib/client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { TextShimmer } from '@/components/ui/text-shimmer'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import DuolingoButton from '@/components/ui/duolingo-button'
import { KnowledgeDocument } from '@/db/schema'
import { InferOutput } from '@/server'
import { Icons } from './icons'
import { s3UrlGenerator } from '@/lib/s3/modules/utils'

interface KnowledgeSelectorProps {
  onSelectDocument: (doc: SelectedKnowledgeDocument) => void
}

export type SelectedKnowledgeDocument =
  InferOutput['knowledge']['list']['documents'][number]

export function KnowledgeSelector({ onSelectDocument }: KnowledgeSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['knowledge-documents'],
    queryFn: async () => {
      const res = await client.knowledge.list.$get()
      return await res.json()
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const allDocuments = data?.documents || []

  const filteredDocuments = useMemo(() => {
    if (!search.trim()) return allDocuments

    const searchLower = search.toLowerCase()
    return allDocuments.filter((doc) => {
      const titleMatch = doc.title?.toLowerCase().includes(searchLower)

      return titleMatch
    })
  }, [allDocuments, search])

  const handleSelect = (doc: SelectedKnowledgeDocument) => {
    onSelectDocument(doc)
    setOpen(false)
    setSearch('')
  }

  const handlePrefetch = () => {
    queryClient.prefetchQuery({
      queryKey: ['knowledge-documents'],
      queryFn: async () => {
        const res = await client.knowledge.list.$get()
        return await res.json()
      },
      staleTime: 5 * 60 * 1000,
    })
  }

  useEffect(() => {
    if (!open) {
      setSearch('')
    }
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <DuolingoButton
          type="button"
          variant="secondary"
          size="icon"
          className="flex items-center justify-center"
          onMouseEnter={handlePrefetch}
          onFocus={handlePrefetch}
        >
          <span className="text-lg">🧠</span>
        </DuolingoButton>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-[420px] p-0" sideOffset={12}>
        <Command className="rounded-xl border-stone-200 bg-white">
          <div className="p-2 border-stone-100 bg-stone-50">
            <div className="relative">
              {/* <Search className="absolute z-10 left-3.5 top-1/2 -translate-y-1/2 size-4 text-stone-400" /> */}
              <CommandInput
                placeholder="Search knowledge base..."
                value={search}
                onValueChange={setSearch}
                // className="pl-10 h-10 bg-stone-50 border-stone-200 focus:bg-white transition-colors rounded-lg border"
              />
            </div>
          </div>

          <CommandList className="max-h-[350px] overflow-y-auto">
            {isLoading && allDocuments.filter((d) => !d.isDeleted).length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <TextShimmer
                  className="text-sm [--base-gradient-color:#78716c]"
                  duration={0.7}
                >
                  Loading knowledge base...
                </TextShimmer>
              </div>
            ) : (
              <>
                {filteredDocuments.filter((d) => !d.isDeleted).length === 0 ? (
                  <CommandEmpty className="py-12 text-center">
                    <p className="text-sm font-medium text-stone-800">
                      No documents found
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      {search
                        ? 'Try a different search term'
                        : 'No documents in your knowledge base yet'}
                    </p>
                  </CommandEmpty>
                ) : (
                  <CommandGroup className="p-2 [&_[cmdk-group-heading]]:hidden">
                    {filteredDocuments
                      .filter((d) => !d.isDeleted)
                      .map((doc) => (
                        <CommandItem
                          key={doc.id}
                          value={`${doc.title}}`}
                          onSelect={() => handleSelect(doc)}
                          className="flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer data-[selected=true]:bg-stone-100"
                        >
                          <div className="flex items-center justify-center size-10 rounded-lg bg-stone-200 transition-colors">
                            {doc.type === 'image' ? (
                              <img
                                src={s3UrlGenerator(doc.s3Key)}
                                alt={doc.title ?? 'document preview'}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : doc.type === 'pdf' ? (
                              <Icons.pdf className="size-7 -ml-[1px]" />
                            ) : doc.type === 'docx' ? (
                              <Icons.docx className="size-7 -ml-[1px]" />
                            ) : doc.type === 'txt' ? (
                              <Icons.txt className="size-7 -ml-[1px]" />
                            ) : doc.type === 'url' ? (
                              <span className="text-xl">🔗</span>
                            ) : null}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <p className="font-medium text-sm text-stone-900 truncate">
                                {doc.title}
                              </p>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {doc.isStarred && (
                                  <Star className="size-3.5 fill-yellow-500 text-yellow-500" />
                                )}
                                {/* <span className="text-xs text-stone-400">
                                {formatDistanceToNow(new Date(doc.updatedAt), {
                                  addSuffix: false,
                                })}
                              </span> */}
                              </div>
                            </div>
                            {/* <p className="text-xs text-stone-500 truncate">
                            {doc.content.replace(/\n/g, " ").trim()}
                          </p> */}
                          </div>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
