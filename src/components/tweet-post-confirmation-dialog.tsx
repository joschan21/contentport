'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import DuolingoButton from './ui/duolingo-button'
import { Icons } from './icons'
import { AccountAvatar, AccountHandle, AccountName } from '@/hooks/account-ctx'

interface TweetPostConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  onCancel?: () => void
  isPosting?: boolean
}

export default function TweetPostConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  isPosting = false,
}: TweetPostConfirmationDialogProps) {
  const [skipPostConfirmation, setSkipPostConfirmation] = useState(false)

  useEffect(() => {
    setSkipPostConfirmation(localStorage.getItem('skipPostConfirmation') === 'true')
  }, [])

  const toggleSkipConfirmation = (checked: boolean) => {
    setSkipPostConfirmation(checked)
    if (checked) {
      localStorage.setItem('skipPostConfirmation', 'true')
    } else {
      localStorage.removeItem('skipPostConfirmation')
    }
  }

  const handleConfirm = () => {
    onOpenChange(false)
    onConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">Post to Twitter</DialogTitle>
        </DialogHeader>
        <div className="">
          <p className="text-base opacity-60 mb-4">
            This will post to Twitter. Continue?
          </p>
        </div>

        <div>
          <p className="text-sm opacity-60 mb-2.5">Posting as</p>
          <div className="flex flex-row max-w-full items-center flex-wrap gap-3.5 h-[38px]">
            <AccountAvatar className="size-9" />
            <div className="flex flex-col flex-wrap gap-0">
              <AccountName className="font-medium leading-[1.2]" />
              <AccountHandle className="leading-[1.2]" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <DuolingoButton
            variant="secondary"
            size="sm"
            onClick={() => {
              onOpenChange(false)
              onCancel?.()
            }}
          >
            Cancel
          </DuolingoButton>
          <DuolingoButton size="sm" onClick={handleConfirm} disabled={isPosting}>
            <Icons.twitter className="size-4 mr-2" />
            {isPosting ? 'Posting...' : 'Post Now'}
          </DuolingoButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}
