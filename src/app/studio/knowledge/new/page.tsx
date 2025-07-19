'use client'

import DuolingoBadge from '@/components/ui/duolingo-badge'
import DuolingoButton from '@/components/ui/duolingo-button'
import DuolingoInput from '@/components/ui/duolingo-input'
import { Label } from '@/components/ui/label'
import { client } from '@/lib/client'
import { cn } from '@/lib/utils'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileText, FolderOpen, Link, Upload, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'

interface UploadState {
  file: File
  localUrl?: string
  uploadProgress: number
  isUploadDone: boolean
  xhr?: XMLHttpRequest
}

export default function NewKnowledgePage() {
  const searchParams = useSearchParams()
  const type = searchParams.get('type') || 'manual'

  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [uploadState, setUploadState] = useState<UploadState | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (getDisabled()) return

    if (type === 'upload') {
      if (data) processFile({ ...data, title })
    }
    if (type === 'url') {
      if (url) importUrl(url)
    }
  }

  const { mutate: importUrl, isPending: isImporting } = useMutation({
    mutationFn: async (url: string) => {
      const res = await client.knowledge.importUrl.$post({ url })
      return res.json()
    },
    onSuccess: (data) => {
      posthog.capture('knowledge_imported', {
        source: 'url',
        url: data.url,
        title: data.title,
      })

      queryClient.refetchQueries({ queryKey: ['knowledge-documents'] })
      toast.success(`Successfully imported content from ${data.url}`)
      setTitle('')
      setUrl('')
    },
    onError: (error) => {
      console.error('Error importing URL:', error)
      toast.error('Failed to import URL. Please try again.')
    },
  })

  const queryClient = useQueryClient()

  const {
    mutate: upload,
    isPending: isUploading,
    data,
    reset,
  } = useMutation({
    mutationFn: async ({ file, title }: { file: File; title: string }) => {
      let localUrl: string | undefined = undefined

      if (file.type.startsWith('image/')) {
        localUrl = URL.createObjectURL(file)
      }

      const xhr = new XMLHttpRequest()

      setUploadState({
        file,
        localUrl,
        uploadProgress: 0,
        isUploadDone: false,
        xhr,
      })

      const res = await client.file.upload.$post({
        fileName: file.name,
        fileType: file.type,
        source: 'knowledge',
      })

      const { url, fields, fileKey, type } = await res.json()

      const formData = new FormData()

      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value as string)
      })

      formData.append('file', file)

      await new Promise<void>((resolve, reject) => {
        xhr.open('POST', url, true)
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const uploadProgress = (event.loaded / event.total) * 100

            setUploadState((prev) => (prev ? { ...prev, uploadProgress } : null))
          }
        }
        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 204) {
            setUploadState((prev) => (prev ? { ...prev, isUploadDone: true } : null))
            resolve()
          } else {
            toast.error(`Upload failed with status ${xhr.status}`)
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        }
        xhr.onerror = () => {
          toast.error('Network error, please try again.')
          reject(new Error('Network error occurred during upload'))
        }
        xhr.onabort = () => {
          toast.success('Upload cancelled')
          reject(new Error('Upload aborted'))
        }
        xhr.send(formData)
      })

      return { fileKey, fileName: file.name, type }
    },
    onError: () => {
      setUploadState(null)
    },
  })

  interface ProcessFileArgs {
    fileKey: string
    fileName: string
    title: string
  }

  const {
    mutate: processFile,
    isPending: isProcessing,
    reset: resetProcessing,
  } = useMutation({
    mutationFn: async ({ fileKey, fileName, title }: ProcessFileArgs) => {
      const res = await client.file.promoteToKnowledgeDocument.$post({
        fileKey,
        fileName,
        title,
      })

      return await res.json()
    },
    onSuccess: (data, variables) => {
      posthog.capture('knowledge_imported', {
        source: 'upload',
        title: variables.title,
        fileKey: variables.fileKey,
      })

      toast.success('Knowledge added!')
      setUploadState(null)
      setTitle('')
      queryClient.refetchQueries({ queryKey: ['knowledge-documents'] })
    },
  })

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0 && files[0]) {
      const file = files[0]
      upload({ file, title })
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      upload({ file, title })
    }
  }

  const renderFilePreview = () => {
    if (!uploadState) return null

    const { file, localUrl, uploadProgress, isUploadDone } = uploadState

    const isImage = file.type.startsWith('image/')

    return (
      <div className="relative border-2 border-gray-200 shadow-[0_2px_0_#E5E7EB] rounded-2xl p-6 bg-white">
        <div className="flex items-center gap-4">
          {isImage && localUrl ? (
            <div className="relative size-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <img
                src={localUrl}
                alt={file.name}
                className="w-full h-full object-cover"
              />
              {!isUploadDone && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="relative size-8">
                    <svg className="size-8 transform" viewBox="0 0 36 36">
                      <path
                        className="text-gray-300"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-white"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray={`${uploadProgress}, 100`}
                        strokeLinecap="round"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative size-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <FileText className="size-8 text-gray-400" />
              {!isUploadDone && (
                <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                  <div className="relative size-8">
                    <svg className="size-8 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-gray-300"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-indigo-600"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray={`${uploadProgress}, 100`}
                        strokeLinecap="round"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {file.name}
              </h3>
              {isUploadDone && (
                <DuolingoBadge variant="green" className="px-2 text-xs">
                  ✔︎ Uploaded
                </DuolingoBadge>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
            </p>
            {!isUploadDone && (
              <p className="text-sm text-indigo-600 mt-1">
                Uploading... {Math.round(uploadProgress)}%
              </p>
            )}
          </div>
        </div>

        <DuolingoButton
          variant="destructive"
          size="icon"
          className="absolute size-8 top-2 right-2"
          onClick={() => {
            if (uploadState?.xhr && !uploadState.isUploadDone) {
              uploadState.xhr.abort()
            }
            if (uploadState?.localUrl) {
              URL.revokeObjectURL(uploadState.localUrl)
            }
            setUploadState(null)
            reset()
            resetProcessing()
            setTitle('')
          }}
        >
          <X className="size-4" />
        </DuolingoButton>
      </div>
    )
  }

  const renderUploadView = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        {uploadState ? (
          renderFilePreview()
        ) : (
          <div
            className={cn(
              'relative border-2 border-gray-200 shadow-[0_2px_0_#E5E7EB] rounded-2xl p-12 text-center transition-all duration-200',
              { 'border-indigo-500 bg-indigo-50 scale-[1.01]': isDragging },
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <FolderOpen className="mx-auto size-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Drag n' drop or browse
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              pdf, docx, txt and images up to 10MB
            </p>
            <div className="w-full flex justify-center">
              <label htmlFor="file-upload" className="cursor-pointer">
                <DuolingoButton
                  variant="secondary"
                  size="sm"
                  className="w-auto pointer-events-none"
                >
                  <Upload className="size-4 mr-2" />
                  Browse Files
                </DuolingoButton>
              </label>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt,.md,.csv,.jpg,.jpeg,.png,.gif,.webp,.svg"
                onChange={handleFileSelect}
                disabled={isUploading || isProcessing}
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Label>Title</Label>
        <DuolingoInput
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSubmit(e)
            }
          }}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          placeholder="My document title"
        />
      </div>
    </form>
  )

  const renderUrlView = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1">
        <Label>Link to website</Label>
        <DuolingoInput
          autoFocus
          fullWidth
          icon={<Link className="size-5 text-gray-400" />}
          placeholder="https://example.com/article"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 w-full"
        />
      </div>

      <div className="space-y-1">
        <Label>Title</Label>
        <DuolingoInput
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSubmit(e)
            }
          }}
          disabled={isImporting}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          placeholder="My document title"
        />
      </div>
    </form>
  )

  const getDisabled = () => {
    if (type === 'upload') {
      return !Boolean(title) || !Boolean(uploadState?.isUploadDone)
    }
    if (type === 'url') {
      return !Boolean(title) || !Boolean(url)
    }
    return false
  }

  const router = useRouter()

  return (
    <div className="relative z-10 min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <DuolingoButton
          variant="secondary"
          className="w-fit mb-8"
          size="sm"
          onClick={() => router.push('/studio/knowledge')}
        >
          <ArrowLeft className="size-8 shrink-0 mr-2" />
          Back to Knowledge Base
        </DuolingoButton>

        <div className="bg-white p-6 space-y-4 rounded-3xl border-2 border-gray-200 shadow-xl">
          <div>
            {type === 'upload' && renderUploadView()}
            {type === 'url' && renderUrlView()}
          </div>

          <DuolingoButton
            loading={isProcessing || isImporting}
            onClick={handleSubmit}
            disabled={getDisabled()}
          >
            Add Knowledge
          </DuolingoButton>
        </div>
      </div>
    </div>
  )
}
