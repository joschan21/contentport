'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
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
      <DialogContent className="bg-white rounded-2xl p-6">
        <div className="size-12 bg-gray-100 rounded-full flex items-center justify-center">
          <Icons.twitter className="size-6" />
        </div>
        <DialogHeader className="py-2">
          <DialogTitle className="text-lg font-semibold">Post to Twitter</DialogTitle>
          <DialogDescription>
            This tweet will be posted immediately. Would you like to continue?
          </DialogDescription>
          <DialogDescription>
            <span className="font-medium text-gray-900">Posting as:</span>{' '}
            <AccountName className="font-normal text-gray-600" /> (
            <AccountHandle className="text-gray-600" />)
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DuolingoButton
            variant="secondary"
            size="sm"
            className="h-11"
            onClick={() => {
              onOpenChange(false)
              onCancel?.()
            }}
          >
            Cancel
          </DuolingoButton>
          <DuolingoButton
            loading={isPosting}
            size="sm"
            className="h-11"
            onClick={handleConfirm}
          >
            <Icons.twitter className="size-4 mr-2" />
            {isPosting ? 'Posting...' : 'Post Now'}
          </DuolingoButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
