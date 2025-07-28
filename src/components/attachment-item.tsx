import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useState } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import DuolingoButton from './ui/duolingo-button'
import { Attachment } from '@/server/routers/chat/chat-router'
import { LocalAttachment, useAttachments } from '@/hooks/use-attachments'
import { useQuery } from '@tanstack/react-query'
import { client } from '@/lib/client'
import Link from 'next/link'
import { s3 } from '@/lib/s3/s3'

interface AttachmentItemProps {
  attachment: Attachment | LocalAttachment
  onRemove?: () => void
  onPromoteToKnowledge?: () => void
  variant?: 'compact' | 'detailed'
}

export const AttachmentItem = ({
  attachment,
  onRemove,
  onPromoteToKnowledge,
}: AttachmentItemProps) => {
  if (attachment.type === 'image') {
    return (
      <ImageAttachment
        attachment={attachment}
        onRemove={onRemove}
        onPromote={onPromoteToKnowledge}
      />
    )
  }

  return (
    <DocumentAttachment
      attachment={attachment}
      onRemove={onRemove}
      onPromote={onPromoteToKnowledge}
    />
  )

  // const isTemporary = reference.lifecycle === "session"
  // const isImage = reference.type === "image"
  // const canPromote =
  //   isTemporary &&
  //   "canPromoteToKnowledge" in reference &&
  //   reference.canPromoteToKnowledge

  // const { data: knowledgeDocument } = useQuery({
  //   queryKey: [
  //     "get-attachment",
  //     "id" in attachment ? attachment.id : undefined,
  //   ],
  //   queryFn: async () => {
  //     if (!("id" in attachment)) return null

  //     const res = await client.knowledge.getDocument.$get({ id: attachment.id })
  //     const data = await res.json()
  //     return data
  //   },
  //   enabled: "id" in attachment,
  // })

  // if (attachment.variant === "knowledge-document") {
  // return (
  //   <ImageAttachment
  //     reference={reference}
  //     onRemove={onRemove}
  //     onPromote={canPromote ? onPromoteToKnowledge : undefined}
  //   />
  // )
  // }

  // return (
  // <DocumentAttachment
  //   reference={reference}
  //   onRemove={onRemove}
  //   onPromote={canPromote ? onPromoteToKnowledge : undefined}
  //   variant={variant}
  // />
  // )
}

interface ImageReferenceProps {
  attachment: Attachment | LocalAttachment
  className?: string
  onRemove?: () => void
  onPromote?: () => void
}

interface DocumentReferenceProps {
  attachment: Attachment | LocalAttachment
  className?: string
  onRemove?: () => void
  onPromote?: () => void
  variant?: 'compact' | 'detailed'
}

function DocumentAttachment({ attachment, onRemove, className }: DocumentReferenceProps) {
  return (
    <div
      className={cn(
        'flex w-fit items-center gap-2 bg-stone-200 px-3 py-2 rounded-lg',
        className,
      )}
    >
      <Link
        href={`/studio/knowledge/${attachment.id}`}
        className="flex items-center gap-2"
      >
        <span className="text-base">
          {attachment.variant === 'knowledge' ? '🧠' : '📎'}
        </span>
        {'title' in attachment ? (
          <span className="text-sm text-stone-700 font-medium max-w-[120px] truncate">
            {attachment.title}
          </span>
        ) : null}
      </Link>
      {onRemove && (
        <button onClick={onRemove} className="hover:bg-stone-300 rounded-full p-1 ml-1">
          <X className="size-3" />
        </button>
      )}
    </div>
  )
}

function ImageAttachment({ attachment, onRemove, className }: ImageReferenceProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data } = useQuery({
    queryKey: ['get-remote-attachment', attachment.id],
    queryFn: async () => {
      const res = await client.knowledge.getDocument.$get({ id: attachment.id })
      const { document } = await res.json()
      const url = s3.utils.urlGenerator(document.s3Key)

      return { url }
    },
    enabled: attachment.variant === 'knowledge',
  })

  const isUploading = 'uploadProgress' in attachment && !attachment.isUploadDone
  const uploadProgress = 'uploadProgress' in attachment ? attachment.uploadProgress : 0

  const circumference = 2 * Math.PI * 12
  const strokeDashoffset = circumference - (uploadProgress / 100) * circumference

  return (
    <div
      className={cn(
        'flex flex-col gap-2 bg-stone-200 rounded-lg size-20 relative',
        className,
      )}
    >
      <div className="relative">
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <img
              src={'localUrl' in attachment ? attachment.localUrl : data?.url}
              className="size-20 object-cover object-center rounded-md cursor-pointer hover:opacity-90 transition-opacity"
            />
          </DialogTrigger>
          <DialogContent
            className="max-w-4xl w-full h-fit max-h-[90vh] p-0 bg-transparent border-none shadow-none"
            noClose
          >
            <DialogTitle className="sr-only">Image Zoom View</DialogTitle>
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="relative">
                <img
                  src={'localUrl' in attachment ? attachment.localUrl : data?.url}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
                <DialogClose className="absolute top-2 right-2" asChild>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-2 transition-all"
                  >
                    <X className="size-5" />
                  </button>
                </DialogClose>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-md flex items-center justify-center">
            <div className="relative flex items-center justify-center">
              <div className="h-10 w-10">
                <svg className="-rotate-90 w-full h-full">
                  <circle
                    className="text-white/30"
                    strokeWidth="2"
                    stroke="currentColor"
                    fill="transparent"
                    r="12"
                    cx="20"
                    cy="20"
                  />
                  <circle
                    className="text-white transition-all duration-200"
                    strokeWidth="2"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="12"
                    cx="20"
                    cy="20"
                  />
                </svg>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {Math.round(uploadProgress)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {onRemove && !isUploading && (
          <DuolingoButton
            variant="destructive"
            size="icon"
            className="absolute z-10 top-1.5 right-1.5 size-6 shrink-0"
            onClick={onRemove}
          >
            <X className="size-3" />
          </DuolingoButton>
        )}
      </div>
    </div>
  )
}
