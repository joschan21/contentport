'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import DuolingoBadge from '@/components/ui/duolingo-badge'
import DuolingoButton from '@/components/ui/duolingo-button'
import { client } from '@/lib/client'
import { s3UrlGenerator } from '@/lib/s3/modules/utils'
import { cn } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  ChevronDown,
  FilePlus,
  FileText,
  FolderOpen,
  Globe,
  Grid,
  List,
  Plus,
  Search,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { NavLink } from 'react-router'

interface Document {
  id: string
  title: string
  content: string
  updatedAt: Date
  category: 'url' | 'file' | 'manual'
  wordCount: number
  isStarred: boolean
}

const categoryColors = {
  url: 'bg-blue-100 text-blue-800 border-blue-200',
  file: 'bg-green-100 text-green-800 border-green-200',
  manual: 'bg-purple-100 text-purple-800 border-purple-200',
}

const categoryBadgeVariants = {
  url: 'notification' as const,
  file: 'achievement' as const,
  manual: 'streak' as const,
}

const categoryIcons = {
  url: '🔗',
  file: '📄',
  manual: '📝',
}

export default function KnowledgePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const queryClient = useQueryClient()

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i]
  }

  const { data: documentsData, isPending } = useQuery({
    queryKey: ['knowledge-documents'],
    queryFn: async () => {
      const res = await client.knowledge.list.$get({})
      return await res.json()
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const allDocuments = documentsData?.documents || []

  const documents = useMemo(() => {
    if (!searchQuery.trim()) return allDocuments

    const searchLower = searchQuery.toLowerCase()
    return allDocuments.filter((doc) => {
      const titleMatch = doc.title?.toLowerCase().includes(searchLower)

      return titleMatch
    })
  }, [allDocuments, searchQuery])

  const { mutate: deleteDocument } = useMutation({
    mutationFn: async (documentId: string) => {
      const res = await client.knowledge.delete.$post({ id: documentId })
      return res.json()
    },
    onMutate: async (documentId) => {
      queryClient.setQueryData(['knowledge-documents'], (old: any) => {
        if (old?.documents) {
          return {
            ...old,
            documents: old.documents.filter((doc: Document) => doc.id !== documentId),
          }
        }
        return old
      })
    },
    onError: (err) => {
      console.error(err)
      toast.error('Failed to delete document')
      queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] })
    },
  })

  return (
    <div className="relative z-10 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-gray-900">Knowledge Base</h1>
                <DuolingoBadge variant="achievement" className="px-2" size="md">
                  {documents.filter((d) => !d.isDeleted).length}
                </DuolingoBadge>
              </div>
              <p className="text-lg text-gray-600 max-w-prose">
                Teach contentport new knowledge by uploading assets (e.g., product
                details, business bio) and reference specific content so it always writes
                factually.
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <DuolingoButton className="w-auto">
                  <Plus className="size-5 mr-2" />
                  <span className="whitespace-nowrap">Add Knowledge</span>
                  <ChevronDown className="size-4 ml-2" />
                </DuolingoButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-96 p-3 border-2 shadow-xl">
                <div className="space-y-2">
                  <DropdownMenuItem asChild>
                    <NavLink
                      to="/studio/knowledge/new?type=upload"
                      className="flex items-center gap-4 p-5 rounded-2xl hover:bg-indigo-50 transition-all cursor-pointer border-0 w-full group hover:shadow-sm"
                    >
                      <div className="flex-shrink-0 w-14 h-14 bg-gray-50 group-hover:bg-indigo-100 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105">
                        <FolderOpen className="size-7 text-gray-500 group-hover:text-indigo-600 transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">📁</span>
                          <h4 className="font-bold text-gray-900 group-hover:text-indigo-900 transition-colors">
                            Upload Document
                          </h4>
                        </div>
                        <p className="text-sm text-gray-500 leading-relaxed">
                          Upload pdf, docx, text or images
                        </p>
                      </div>
                    </NavLink>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <NavLink
                      to="/studio/knowledge/new?type=url"
                      className="flex items-center gap-4 p-5 rounded-2xl hover:bg-indigo-50 transition-all cursor-pointer border-0 w-full group hover:shadow-sm"
                    >
                      <div className="flex-shrink-0 w-14 h-14 bg-gray-50 group-hover:bg-indigo-100 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105">
                        <Globe className="size-7 text-gray-500 group-hover:text-indigo-600 transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">🌐</span>
                          <h4 className="font-bold text-gray-900 group-hover:text-indigo-900 transition-colors">
                            Add from Website
                          </h4>
                        </div>
                        <p className="text-sm text-gray-500 leading-relaxed">
                          Extract knowledge from articles and blog posts
                        </p>
                      </div>
                    </NavLink>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 size-5" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors bg-white shadow-sm"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-3 transition-colors',
                    viewMode === 'grid'
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'text-gray-400 hover:text-gray-600',
                  )}
                >
                  <Grid className="size-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-3 transition-colors',
                    viewMode === 'list'
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'text-gray-400 hover:text-gray-600',
                  )}
                >
                  <List className="size-5" />
                </button>
              </div>
            </div>
          </div>

          {/* <div className="flex flex-wrap gap-3 mb-6">
            <DuolingoBadge variant="achievement" size="md">
              <Star className="size-3 mr-1" />
              {mockDocuments.filter(doc => doc.isStarred).length} Starred
            </DuolingoBadge>
            <DuolingoBadge variant="streak" size="md">
              <TrendingUp className="size-3 mr-1" />
              {getRecentDocumentsCount()} This Week
            </DuolingoBadge>
            <DuolingoBadge variant="xp" size="md">
              <span className="text-xs mr-1">{categoryIcons[categoryStats.mostUsed as keyof typeof categoryIcons]}</span>
              Most Used: {categoryStats.mostUsed} ({categoryStats.count})
            </DuolingoBadge>
            {selectedCategory !== "all" && (
              <DuolingoBadge variant="notification" size="md">
                {filteredDocuments.length} {selectedCategory}s
              </DuolingoBadge>
            )}
          </div> */}
        </div>

        {documents.filter((d) => !d.isDeleted).length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <FileText className="size-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {isPending ? 'Loading documents...' : 'No knowledge yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {isPending
                ? ''
                : searchQuery
                  ? 'Try adjusting your search terms'
                  : 'Add knowledge to get started'}
            </p>
          </div>
        ) : (
          <div
            className={cn(
              'gap-2',
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'flex flex-col space-y-4',
            )}
          >
            {documents
              .filter((d) => !d.isDeleted)
              .map((doc) => (
                <div
                  key={doc.id}
                  className={cn(
                    'group relative h-full',
                    viewMode === 'list' ? 'w-full' : '',
                  )}
                >
                  <a
                    href={
                      doc.type === 'url' && doc.sourceUrl
                        ? doc.sourceUrl
                        : s3UrlGenerator(doc.s3Key)
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn('block h-full', viewMode === 'list' ? 'w-full' : '')}
                  >
                    <div
                      className={cn(
                        'bg-white rounded-2xl border-2 border-gray-200 hover:border-indigo-300 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 p-6',
                        viewMode === 'list'
                          ? 'flex items-center gap-6'
                          : 'h-full flex flex-col justify-between',
                      )}
                    >
                      <div
                        className={cn(
                          'flex flex-wrap items-center gap-2 mb-4',
                          viewMode === 'list' ? 'mb-0 flex-shrink-0' : '',
                        )}
                      >
                        <DuolingoBadge className="px-2" variant="achievement">
                          {doc.type === 'url' ? 'website' : doc.type}
                        </DuolingoBadge>
                        {doc.isExample && (
                          <DuolingoBadge className="px-2" variant="streak">
                            example
                          </DuolingoBadge>
                        )}
                        {doc.isStarred && <div className="text-yellow-500 ">⭐</div>}
                      </div>

                      <div className={cn(viewMode === 'list' ? 'flex-1 min-w-0' : '')}>
                        <h3
                          className={cn(
                            'font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors',
                            viewMode === 'list'
                              ? 'text-lg mb-1 line-clamp-1'
                              : 'text-xl mb-3 line-clamp-2',
                          )}
                        >
                          {doc.title}
                        </h3>

                        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                          {doc.description}
                        </p>

                        {doc.type === 'image' ? (
                          <img
                            className="w-full bg-[size:10px_10px] border border-gray-200 bg-fixed bg-[image:repeating-linear-gradient(315deg,rgba(209,213,219,0.4)_0,rgba(209,213,219,0.4)_1px,_transparent_0,_transparent_50%)] max-h-40 object-contain rounded-md"
                            src={s3UrlGenerator(doc.s3Key)}
                          />
                        ) : null}
                      </div>

                      <div
                        className={cn(
                          'flex items-center gap-5 text-sm text-gray-500',
                          viewMode === 'list'
                            ? 'flex-shrink-0 flex-col items-end gap-1'
                            : 'mt-auto pt-4',
                        )}
                      >
                        <div className="flex items-center gap-2 text-xs">
                          <span>{format(doc.createdAt, 'MMM dd')}</span>
                          {doc.type !== 'url' && doc.sizeBytes && (
                            <span>・ {formatBytes(doc.sizeBytes)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </a>
                  <DuolingoButton
                    variant="destructive"
                    size="icon"
                    className="absolute top-4 right-4 size-8 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      deleteDocument(doc.id)
                    }}
                  >
                    <X className="size-4" />
                  </DuolingoButton>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
