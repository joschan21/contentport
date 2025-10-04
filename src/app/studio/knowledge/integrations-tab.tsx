import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import DuolingoButton from '@/components/ui/duolingo-button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { client } from '@/lib/client'
import { ArrowsClockwiseIcon, LinkIcon, PlusIcon } from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { HTTPException } from 'hono/http-exception'
import { Loader2, MoreHorizontal, RefreshCw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

export const IntegrationsTab = () => {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', url: '' })

  const { data: sitemaps, isPending } = useQuery({
    queryKey: ['sitemaps'],
    queryFn: async () => {
      const res = await client.knowledge.get_sitemaps.$get()
      const data = await res.json()
      return data
    },
  })

  const {
    mutate: deleteSitemap,
    isPending: isDeletingSitemap,
    variables: deleteVariables,
  } = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await client.knowledge.delete_sitemap.$post({ id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sitemaps'] })
      toast.success('Integration deleted successfully')
    },
    onError: (error: HTTPException) => {
      toast.error(error.message || 'Failed to delete integration')
    },
  })

  const {
    mutate: refreshSitemap,
    isPending: isRefreshingSitemap,
    variables: refreshVariables,
  } = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await client.knowledge.refresh_sitemap.$post({ id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sitemaps'] })
      toast.success('Sitemap refreshed!')
    },
    onError: (error: HTTPException) => {
      toast.error(error.message || 'Failed to refresh integration')
    },
  })

  const { mutate: addSitemap, isPending: isAddingSitemap } = useMutation({
    mutationFn: async ({ url, name }: { url: string; name: string }) => {
      await client.knowledge.index_sitemap.$post({ name, url })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sitemaps'] })
      toast.success('Integration added!')
      setIsDialogOpen(false)
      setFormData({ name: '', url: '' })
    },
    onError: (error: HTTPException) => {
      toast.error(error.message || 'Failed to add integration')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.url.trim()) {
      toast.error('Please fill in both name and URL fields')
      return
    }

    try {
      new URL(formData.url)
    } catch {
      toast.error('Please enter a valid URL')
      return
    }

    addSitemap({ name: formData.name.trim(), url: formData.url.trim() })
  }

  const isValidUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Integrations</h2>
          <p className="text-sm text-gray-600">
            Connect your documentation, changelog or blog to power your content engine
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <DuolingoButton className="flex items-center gap-2 w-fit">
              <PlusIcon className="size-4" />
              Add Integration
            </DuolingoButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Integration</DialogTitle>
              <DialogDescription>
                Connect a website, documentation, or blog to power your content engine.
                We'll index all pages from the provided URL.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Integration Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Documentation, Blog, Company Website"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">Website URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, url: e.target.value }))
                  }
                  required
                />
                <p className="text-xs text-gray-500">
                  We'll automatically discover and index all pages from this domain
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <DuolingoButton
                  type="button"
                  variant="secondary"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isAddingSitemap}
                >
                  Cancel
                </DuolingoButton>
                <DuolingoButton
                  type="submit"
                  disabled={
                    isAddingSitemap ||
                    !formData.name.trim() ||
                    !formData.url.trim() ||
                    !isValidUrl(formData.url)
                  }
                  className="flex items-center gap-2"
                >
                  {isAddingSitemap && <Loader2 className="size-4 animate-spin" />}
                  {isAddingSitemap ? 'Adding...' : 'Add Integration'}
                </DuolingoButton>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isPending ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {sitemaps?.sitemaps &&
            Object.entries(sitemaps.sitemaps).map(([key, sitemap]) => (
              <Card key={key} className="max-w-md gap-4">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle>{sitemap.name}</CardTitle>
                      <CardDescription>{sitemap.url}</CardDescription>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <DuolingoButton
                          variant="secondary"
                          size="icon"
                          className="size-8"
                        >
                          <MoreHorizontal className="size-4" />
                        </DuolingoButton>
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] p-1" align="end">
                        <div className="space-y-1">
                          <button
                            onClick={() => refreshSitemap({ id: sitemap.id })}
                            disabled={
                              isRefreshingSitemap && refreshVariables?.id === sitemap.id
                            }
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-stone-100 transition-colors disabled:opacity-50"
                          >
                            {isRefreshingSitemap &&
                            refreshVariables?.id === sitemap.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <RefreshCw className="size-4" />
                            )}
                            <p className="truncate inline-flex items-start flex-col">
                              <span>Refresh Now</span>
                              <span className="text-xs text-stone-500">
                                Re-index all pages from sitemap
                              </span>
                            </p>
                          </button>

                          <button
                            onClick={() => deleteSitemap({ id: sitemap.id })}
                            disabled={
                              isDeletingSitemap && deleteVariables?.id === sitemap.id
                            }
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-red-50 text-red-600 transition-colors disabled:opacity-50"
                          >
                            {isDeletingSitemap && deleteVariables?.id === sitemap.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                            <p className="truncate inline-flex items-start flex-col">
                              <span>Delete</span>
                              <span className="text-xs text-red-500 opacity-80">
                                Remove sitemap and all indexed content
                              </span>
                            </p>
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardHeader>

                <CardFooter className="flex flex-col">
                  <CardDescription className="inline-flex items-center gap-1.5">
                    <LinkIcon className="size-3.5" weight="bold" />
                    {sitemap.length} indexed URLs
                  </CardDescription>
                  <CardDescription className="inline-flex items-center gap-1.5">
                    <ArrowsClockwiseIcon className="size-3.5" weight="bold" />
                    Refreshed {formatDistanceToNow(sitemap.updatedAt)} ago{' '}
                  </CardDescription>
                </CardFooter>
              </Card>
            ))}
        </div>
      )}
    </div>
  )
}
