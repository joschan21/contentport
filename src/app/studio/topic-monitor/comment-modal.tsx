'use client'

import { MATCHERS } from '@/components/tweet-editor/tweet-item'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import DuolingoButton from '@/components/ui/duolingo-button'
import { AccountAvatar } from '@/hooks/account-ctx'
import { PayloadTweet } from '@/hooks/use-tweets-v2'
import { client } from '@/lib/client'
import { LinkPreviewPlugin } from '@/lib/lexical-plugins/link-preview-plugin'
import MentionsPlugin from '@/lib/lexical-plugins/mention-plugin'
import { MentionTooltipPlugin } from '@/lib/lexical-plugins/mention-tooltip-plugin'
import PlaceholderPlugin from '@/lib/placeholder-plugin'
import { AutoLinkPlugin } from '@lexical/react/LexicalAutoLinkPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import { useMutation } from '@tanstack/react-query'
import { format } from 'date-fns'
import isHotkey from 'is-hotkey'
import { $getRoot, COMMAND_PRIORITY_HIGH, KEY_ENTER_COMMAND } from 'lexical'
import {
  ArrowRight,
  ArrowUp,
  AtSign,
  CornerDownLeft,
  ImageIcon,
  Paperclip,
  Smile,
} from 'lucide-react'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  TweetBody,
  TweetContainer,
  TweetHeader,
  TweetInReplyTo,
  TweetMedia,
  type EnrichedTweet,
} from 'react-tweet'
import { QuotedTweet } from './quoted-tweet'
import Link from 'next/link'

interface CommentModalProps {
  isOpen: boolean
  onClose: () => void
  tweet: EnrichedTweet
  onSubmit: () => void
}

export function CommentModal({ isOpen, onClose, tweet, onSubmit }: CommentModalProps) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const removeCommand = editor?.registerCommand(
      KEY_ENTER_COMMAND,
      (event: KeyboardEvent | null) => {
        return true
      },
      COMMAND_PRIORITY_HIGH,
    )

    return removeCommand
  }, [editor])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isHotkey('Enter', e)) {
        e.preventDefault()
        console.log('ENTER')
        handleSubmit()

        return
      }

      if (isHotkey('Escape', e)) {
        e.preventDefault()
        onClose()
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        console.log('Mention shortcut triggered')
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const { mutate: sendReply } = useMutation({
    mutationFn: async () => {
      const content = editor.read(() => $getRoot().getTextContent().trim())
      const payload: PayloadTweet = {
        content,
        id: tweet.id_str,
        index: 0,
        media: [],
      }

      const res = await client.tweet.postImmediate.$post({
        thread: [payload],
        replyToTwitterId: tweet.id_str,
      })

      return await res.json()
    },
    onSuccess: () => {
      onClose()
      toast.success(
        <div className="flex flex-col gap-3">
          <div>
            <p className="font-medium">Reply is being posted!</p>
            <p className="text-sm text-gray-600">
              Track the status of your post in the queue
            </p>
          </div>
          <Link
            href="/studio/scheduled"
            className="text-sm text-indigo-600 decoration-2 underline-offset-2 flex items-center gap-1 underline shrink-0 bg-white/10 hover:bg-white/20 transition-colors"
          >
            See status <ArrowRight className="size-3.5" />
          </Link>
        </div>,
        { duration: 6000 },
      )
    },
  })

  const handleSubmit = async () => {
    const content = editor.read(() => $getRoot().getTextContent().trim())

    if (!content) {
      toast.error('Cant post an empty reply')
    }

    onSubmit()
    sendReply()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          editor.focus()
        }}
        className="max-w-xl p-0 gap-0"
      >
        <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b border-border space-y-0">
          <DialogTitle className="text-lg font-semibold">
            Reply to @{tweet.user.screen_name}
          </DialogTitle>
        </DialogHeader>

        {/* Original Tweet */}
        <div className="px-6 py-4 border-b border-border bg-muted/20">
          <article className='max-h-96 overflow-y-scroll'>
            <TweetHeader tweet={tweet} />
            {tweet.in_reply_to_status_id_str && <TweetInReplyTo tweet={tweet} />}
            <TweetBody tweet={tweet} />
            {tweet.mediaDetails?.length ? (
              <div className="max-w-full">
                <TweetMedia tweet={tweet} />
              </div>
            ) : null}
            {tweet.quoted_tweet && <QuotedTweet tweet={tweet.quoted_tweet} isNestedQuote={false} />}
            <p className="text-[15px] mt-2 text-gray-500">
              {format(new Date(tweet.created_at), 'h:mm a · MMM d, yyyy')}
            </p>
          </article>
        </div>

        {/* Comment Form */}
        <div className="px-6 py-4">
          <div className="flex gap-3 mb-4">
            <AccountAvatar className="size-8 flex-shrink-0" />
            <div className="flex-1 mt-1.5">
              <PlainTextPlugin
                contentEditable={
                  <ContentEditable className="min-h-[120px] max-h-[240px] overflow-y-auto focus:border-transparent outline-none resize-none border-0 p-0 text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 leading-relaxed" />
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
              <PlaceholderPlugin placeholder="Post your reply..." />
              <HistoryPlugin />
              <MentionsPlugin />
              <MentionTooltipPlugin />
              <AutoLinkPlugin matchers={[MATCHERS]} />
              <LinkPreviewPlugin shouldShowLink />
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-muted-foreground hover:text-blue-600 hover:bg-blue-50/80 rounded-full transition-all"
                title="Add image"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-muted-foreground hover:text-blue-600 hover:bg-blue-50/80 rounded-full transition-all"
                title="Add emoji"
              >
                <Smile className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-muted-foreground hover:text-blue-600 hover:bg-blue-50/80 rounded-full transition-all"
                title="Mention someone (⌘K)"
              >
                <AtSign className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-muted-foreground hover:text-blue-600 hover:bg-blue-50/80 rounded-full transition-all"
                title="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <DuolingoButton onClick={handleSubmit} size="sm">
                Reply
              </DuolingoButton>
              {/* <Button
                onClick={handleSubmit}
                disabled={!comment.trim() || isSending}
                size="sm"
                className="h-9 px-6 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 rounded-full font-medium transition-all shadow-sm hover:shadow-md disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-2" />
                    Reply
                  </>
                )}
              </Button> */}
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="px-6 py-3 border-t border-border bg-muted/10">
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <kbd className="inline-flex items-center px-2 py-1 text-[10px] font-mono bg-background border border-border rounded shadow-sm">
                <CornerDownLeft className="size-3" />
              </kbd>
              <span className="font-medium">Send</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="inline-flex items-center px-2 py-1 text-[10px] font-mono bg-background border border-border rounded shadow-sm">
                <ArrowUp className="size-3" />
              </kbd>
              <span className="text-muted-foreground/70">+</span>
              <kbd className="inline-flex items-center px-2 py-1 text-[10px] font-mono bg-background border border-border rounded shadow-sm">
                <CornerDownLeft className="size-3" />
              </kbd>
              <span className="font-medium">New line</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="inline-flex items-center px-2 py-1 text-[10px] font-mono bg-background border border-border rounded shadow-sm">
                Esc
              </kbd>
              <span className="font-medium">Close</span>
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
