import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { PropsWithChildren } from 'react'
import { memo, useState, useRef, useEffect } from 'react'
import { ThumbsUp, ThumbsDown, RotateCcw, Pencil, Copy, Check } from 'lucide-react'
import { AttachmentItem } from '../attachment-item'
import { AnimatedLogo } from './animated-logo'
import { Metadata } from '@/server/routers/chat/chat-router'
import { useChatContext } from '@/hooks/use-chat'
import DuolingoButton from '../ui/duolingo-button'

interface MessageWrapperProps extends PropsWithChildren {
  id: string
  metadata?: Metadata
  isUser: boolean
  className?: string
  disableAnimation?: boolean
  animateLogo?: boolean
  showOptions?: boolean
}

export const MessageWrapper = memo(
  ({
    id,
    metadata,
    children,
    isUser,
    className,
    disableAnimation = false,
    animateLogo = false,
    showOptions = false,
  }: MessageWrapperProps) => {
    const { regenerate, setMessages, messages } = useChatContext()
    const [vote, setVote] = useState<'up' | 'down' | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editedText, setEditedText] = useState('')
    const [isHovered, setIsHovered] = useState(false)
    const [isCopied, setIsCopied] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
      if (isEditing && textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
      }
    }, [isEditing])

    const handleEdit = () => {
      const message = messages.find((m) => m.id === id)
      if (message) {
        const textPart = message.parts.find((p) => p.type === 'text')
        if (textPart && textPart.type === 'text') {
          setEditedText(message.metadata?.userMessage || textPart.text || '')
          setIsEditing(true)
        }
      }
    }

    const handleSaveEdit = () => {
      if (!editedText.trim()) return

      const messageIndex = messages.findIndex((m) => m.id === id)
      if (messageIndex === -1) return

      const updatedMessages = messages.slice(0, messageIndex + 1)
      const currentMessage = updatedMessages[messageIndex]

      if (!currentMessage || !currentMessage.parts) return

      const updatedMessage = {
        ...currentMessage,
        parts: currentMessage.parts.map((part) =>
          part.type === 'text' ? { ...part, text: editedText } : part,
        ),
        metadata: currentMessage.metadata
          ? { ...currentMessage.metadata, userMessage: editedText, isRegenerated: true }
          : undefined,
      }

      updatedMessages[messageIndex] = updatedMessage
      setMessages(updatedMessages)
      setIsEditing(false)

      regenerate({ messageId: id, metadata: { isRegenerated: true } })
    }

    const handleCancelEdit = () => {
      setIsEditing(false)
      setEditedText('')
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSaveEdit()
      }
      if (e.key === 'Escape') {
        handleCancelEdit()
      }
    }

    const handleCopy = () => {
      const message = messages.find((m) => m.id === id)
      if (message) {
        const text = isUser
          ? message.metadata?.userMessage
          : message.parts.reduce(
              (acc, curr) =>
                curr.type === 'text'
                  ? acc + curr.text
                  : curr.type === 'data-main-response'
                    ? acc + curr.data.text
                    : curr.type === 'data-tool-output'
                      ? acc + '\n---\n' + curr.data.text + '\n---\n'
                      : acc,
              '',
            )
        navigator.clipboard.writeText(text || '')
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      }
    }

    return (
      <motion.div
        initial={disableAnimation ? false : { opacity: 0, y: 10 }}
        animate={disableAnimation ? false : { opacity: 1, y: 0 }}
        className={cn(
          'w-full flex flex-col gap-2',
          isUser ? 'justify-self-end items-end' : 'justify-self-start items-start',
        )}
      >
        {metadata?.attachments.map((attachment) => {
          return <AttachmentItem key={attachment.id} attachment={attachment} />
        })}

        <div
          className={cn(
            'w-full grid grid-cols-[40px,1fr] gap-3.5',
            isUser ? 'justify-self-end' : 'justify-self-start',
            className,
          )}
        >
          {!isUser && (
            <div className="flex-shrink-0 col-start-1 mt-1.5 size-10 bg-gray-100 rounded-full flex items-center justify-center">
              <AnimatedLogo isAnimating={animateLogo} className="size-7 text-gray-500" />
            </div>
          )}
          <div className="w-full col-start-2 flex-1 space-y-2">
            <div
              className={cn('relative', { 'ml-auto w-fit': isUser })}
              onMouseEnter={() => isUser && setIsHovered(true)}
              onMouseLeave={() => isUser && setIsHovered(false)}
            >
              <div
                className={cn(
                  'space-y-4 rounded-2xl',
                  isUser
                    ? 'bg-stone-800 p-3.5 w-fit justify-self-end text-white rounded-br-sm'
                    : 'text-gray-800 pt-3.5 rounded-bl-sm',
                )}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      ref={textareaRef}
                      value={editedText}
                      onChange={(e) => {
                        setEditedText(e.target.value)
                        e.target.style.height = 'auto'
                        e.target.style.height = e.target.scrollHeight + 'px'
                      }}
                      onKeyDown={handleKeyDown}
                      className="w-full min-w-[300px] bg-stone-700 text-white rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-stone-500"
                      rows={1}
                    />
                    <div className="flex gap-2 justify-end">
                      <DuolingoButton
                        onClick={handleCancelEdit}
                        size="sm"
                        className="w-fit"
                        variant="destructive"
                      >
                        Cancel
                      </DuolingoButton>
                      {/* <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 text-sm rounded-lg bg-stone-700 hover:bg-stone-600 transition-colors"
                      >
                        Cancel
                      </button> */}
                      <DuolingoButton
                        onClick={handleSaveEdit}
                        disabled={!editedText.trim()}
                        size="sm"
                        className="w-fit"
                        variant="secondary"
                      >
                        Send
                      </DuolingoButton>
                      {/* <button
                        onClick={handleSaveEdit}
                        disabled={!editedText.trim()}
                        className="px-3 py-1 text-sm rounded-lg bg-white text-stone-800 hover:bg-stone-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Save & Regenerate
                      </button> */}
                    </div>
                  </div>
                ) : (
                  children
                )}
                {!isUser && (
                  <div className={cn('flex justify-start items-center gap-1', {})}>
                    <button
                      onClick={handleCopy}
                      className="flex items-center justify-center size-7 rounded-lg transition-all duration-200 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    >
                      {isCopied ? (
                        <Check className="size-3.5" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => setVote(vote === 'up' ? null : 'up')}
                      className={cn(
                        'flex items-center justify-center size-7 rounded-lg transition-all duration-200 group',
                        vote === 'up'
                          ? 'text-green-600 bg-green-100'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
                      )}
                    >
                      <ThumbsUp className="size-3.5 transition-transform duration-200" />
                    </button>
                    <button
                      onClick={() => setVote(vote === 'down' ? null : 'down')}
                      className={cn(
                        'flex items-center justify-center size-7 rounded-lg transition-all duration-200 group',
                        vote === 'down'
                          ? 'text-red-600 bg-red-100'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
                      )}
                    >
                      <ThumbsDown className="size-3.5 transition-transform duration-200" />
                    </button>
                    <button className="flex items-center justify-center size-7 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 group">
                      <RotateCcw
                        onClick={() => {
                          regenerate({ messageId: id, metadata: { isRegenerated: true } })
                        }}
                        className="size-3.5 transition-transform duration-200"
                      />
                    </button>
                  </div>
                )}
              </div>
              {isUser && !isEditing && (
                <div
                  className={cn('flex justify-end items-center gap-1 pt-2', {
                    // visible: isHovered,
                  })}
                  // onMouseEnter={() => setIsHovered(true)}
                  // onMouseLeave={() => setIsHovered(false)}
                >
                  <button
                    onClick={handleCopy}
                    className={cn(
                      'flex items-center justify-center size-7 rounded-lg transition-all duration-200 text-gray-400 hover:text-gray-600 hover:bg-gray-100',
                    )}
                  >
                    {isCopied ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                  <button
                    onClick={handleEdit}
                    className="flex items-center justify-center size-7 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    )
  },
)

MessageWrapper.displayName = 'MessageWrapper'
