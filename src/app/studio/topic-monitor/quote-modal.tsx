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
  ArrowUp,
  AtSign,
  CornerDownLeft,
  ImageIcon,
  Paperclip,
  Quote,
  Smile,
} from 'lucide-react'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  TweetBody,
  TweetHeader,
  TweetInReplyTo,
  TweetMedia,
  type EnrichedTweet,
} from 'react-tweet'
import { QuotedTweet } from './quoted-tweet'

interface QuoteModalProps {
  isOpen: boolean
  onClose: () => void
  tweet: EnrichedTweet
  onSubmit: () => void
}

export function QuoteModal({ isOpen, onClose, tweet, onSubmit }: QuoteModalProps) {
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

  const { mutate: sendQuote } = useMutation({
    mutationFn: async () => {
      const content = editor.read(() => $getRoot().getTextContent().trim())
      // const tweetUrl = `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`
      // const quotedContent = `${content}\n\n${tweetUrl}`

      const payload: PayloadTweet = {
        content,
        id: tweet.id_str,
        index: 0,
        media: [],
      }

      const res = await client.tweet.postImmediate.$post({
        thread: [payload],
        quoteToTwitterId: tweet.id_str,
      })

      return await res.json()
    },
    onMutate: () => {
      toast.success('Quote tweet is being sent!')
      onClose()
    },
  })

  const handleSubmit = async () => {
    const content = editor.read(() => $getRoot().getTextContent().trim())

    if (!content) {
      toast.error('Add your thoughts to quote this tweet')
      return
    }

    onSubmit()
    sendQuote()
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
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            Quote @{tweet.user.screen_name}
          </DialogTitle>
        </DialogHeader>

        {/* Quote Form */}
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
              <PlaceholderPlugin placeholder="Add your thoughts..." />
              <HistoryPlugin />
              <MentionsPlugin />
              <MentionTooltipPlugin />
              <AutoLinkPlugin matchers={[MATCHERS]} />
              <LinkPreviewPlugin shouldShowLink />
            </div>
          </div>

          {/* Original Tweet Preview */}
          <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-muted/20">
            <article className="max-h-96 overflow-y-scroll">
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
                Quote
              </DuolingoButton>
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
