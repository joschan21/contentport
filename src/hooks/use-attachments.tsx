import { client } from '@/lib/client'
import { Attachment } from '@/server/routers/chat/chat-router'
import { useMutation } from '@tanstack/react-query'
import { nanoid } from 'nanoid'
import { createContext, PropsWithChildren, useContext, useState } from 'react'
import toast from 'react-hot-toast'

export interface LocalAttachment {
  variant: 'chat'
  id: string
  title: string
  type: 'image'
  localUrl: string
  uploadProgress: number
  isUploadDone: boolean
}

interface AttachmentManager {
  attachments: (Attachment | LocalAttachment)[]
  addChatAttachment: (file: File) => void
  addVideoAttachment: (s3Key: string, fileName?: string) => void
  removeAttachment: ({ id }: { id: string }) => void
  hasUploading: boolean
}

const AttachmentsContext = createContext<AttachmentManager | null>(null)

export const AttachmentsProvider = ({ children }: PropsWithChildren) => {
  const [attachments, setAttachments] = useState<(Attachment | LocalAttachment)[]>([])

  const hasUploading = attachments.some(
    (attachment) => 'uploadProgress' in attachment && !attachment.isUploadDone,
  )

  const { mutate: uploadAttachment } = useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      const id = nanoid()

      let localUrl: string | undefined = undefined

      if (file.type.startsWith('image/')) {
        localUrl = URL.createObjectURL(file)
        setAttachments((prev) => [
          ...prev,
          {
            localUrl,
            id,
            uploadProgress: 0,
            title: file.name,
            type: 'image',
            variant: 'chat',
            isUploadDone: false,
          },
        ])
      } else {
        setAttachments((prev) => [
          ...prev,
          {
            localUrl,
            id,
            uploadProgress: 0,
            title: file.name,
            // doesnt really matter, any document type is fine here
            // (just display as document, not image)
            type: 'docx',
            variant: 'chat',
            isUploadDone: false,
          },
        ])
      }

      const res = await client.file.upload.$post({
        fileName: file.name,
        fileType: file.type,
        source: 'chat',
      })

      const { url, fields, fileKey, type } = await res.json()

      const formData = new FormData()

      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value as string)
      })

      formData.append('file', file)

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', url, true)
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const uploadProgress = (event.loaded / event.total) * 100

            setAttachments((prev) =>
              prev.map((attachment) => {
                if (attachment.id === id) {
                  return { ...attachment, uploadProgress }
                }

                return attachment
              }),
            )
          }
        }
        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 204) {
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
          toast.error('Network error, please try again.')
          reject(new Error('Upload aborted'))
        }
        xhr.send(formData)
      })

      setAttachments((prev) =>
        prev.map((attachment) => {
          if (attachment.id === id) {
            return { ...attachment, isUploadDone: true }
          }

          return attachment
        }),
      )

      return { fileKey, type, id, localUrl, variant: 'chat' as const, title: file.name }
    },
    onSuccess: (attachment) => {
      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id))
      setAttachments((prev) => [...prev, attachment])
    },
  })

  const addChatAttachment = async (file: File) => uploadAttachment({ file })

  const addVideoAttachment = (s3Key: string, fileName?: string) => {
    setAttachments((prev) => {
      const newAttachment: Attachment = {
        id: s3Key,
        type: 'video',
        fileKey: s3Key,
        title: fileName || s3Key,
        variant: 'chat',
      }

      return [...prev, newAttachment]
    })
  }

  const removeAttachment = async ({ id }: { id: string }) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id))
  }

  return (
    <AttachmentsContext.Provider
      value={{
        attachments,
        addChatAttachment,
        addVideoAttachment,
        removeAttachment,
        hasUploading,
      }}
    >
      {children}
    </AttachmentsContext.Provider>
  )
}

export function useAttachments() {
  const context = useContext(AttachmentsContext)

  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }

  return context
}
