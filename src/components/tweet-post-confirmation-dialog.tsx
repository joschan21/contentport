'use client'

import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { Modal } from './ui/modal'
import DuolingoButton from './ui/duolingo-button'
import { Icons } from './icons'
import { AccountHandle, AccountName } from '@/hooks/account-ctx'
import { Separator } from './ui/separator'

interface TweetPostConfirmationDialogProps {
  open: boolean
  onOpenChange: Dispatch<SetStateAction<boolean>>
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
  const handleConfirm = () => {
    onOpenChange(false)
    onConfirm()
  }

  return (
    <Modal showModal={open} setShowModal={onOpenChange} className="max-w-md">
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Post to Twitter</h2>
          <p className="text-gray-500">
            This tweet will be posted immediately. Continue?
          </p>

          <div className="">
            <hr className="h-px bg-stone-200 my-4 w-12" />
          </div>

          <p className="font-medium text-gray-900">
            <span>Posting as:</span> <AccountName />
          </p>
        </div>

        <div className="flex gap-3">
          <DuolingoButton
            variant="secondary"
            size="sm"
            className="h-11 flex-1"
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
            className="h-11 flex-1"
            onClick={handleConfirm}
          >
            <Icons.twitter className="size-4 mr-2" />
            {isPosting ? 'Posting...' : 'Post Now'}
          </DuolingoButton>
        </div>
      </div>
    </Modal>
  )
}
