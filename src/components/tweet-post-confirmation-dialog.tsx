'use client'

import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { Modal } from './ui/modal'
import DuolingoButton from './ui/duolingo-button'
import { Icons } from './icons'
import { AccountHandle, AccountName } from '@/hooks/account-ctx'
import { Separator } from './ui/separator'
import { Checkbox } from './ui/checkbox'
import { Label } from './ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { InfoIcon } from '@phosphor-icons/react'
import { AccountSwitcher } from './account-switcher'
import { client } from '@/lib/client'
import { useQuery } from '@tanstack/react-query'

interface TweetPostConfirmationDialogProps {
  open: boolean
  onOpenChange: Dispatch<SetStateAction<boolean>>
  onConfirm: (useAutoDelay?: boolean) => void
  onCancel?: () => void
  isPosting?: boolean
  threadLength?: number
}

export default function TweetPostConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  isPosting = false,
  threadLength = 1,
}: TweetPostConfirmationDialogProps) {
  const [useAutoDelay, setUseAutoDelay] = useState<boolean>(false)

  const { data: queueSettings } = useQuery({
    queryKey: ['queue-settings'],
    queryFn: async () => {
      const response = await client.settings.get_queue_settings.$get()
      return await response.json()
    },
  })

  useEffect(() => {
    if (queueSettings?.useAutoDelayByDefault !== undefined) {
      setUseAutoDelay(queueSettings.useAutoDelayByDefault)
    }
  }, [queueSettings?.useAutoDelayByDefault])

  const handleConfirm = () => {
    onOpenChange(false)
    onConfirm(useAutoDelay)
  }

  return (
    <Modal showModal={open} setShowModal={onOpenChange} className="max-w-md bg-gray-50">
      <div className="p-6 space-y-4">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Post to Twitter</h2>
          <p className="text-base text-balance text-gray-600">
            This {threadLength > 1 ? 'thread' : 'tweet'} will be posted immediately. Would
            you like to continue?
          </p>

          <div className="w-full pt-2 space-y-3">
            <div className="w-full flex flex-col gap-1 items-start justify-between">
              <p className="font-medium text-sm text-gray-900">Posting as</p>
              <AccountSwitcher showFullDetails />
            </div>

            {threadLength > 1 && (
              <div className="flex pt-3 flex-col gap-1">
                <p className="font-medium text-sm text-gray-900">Settings</p>

                <div className="flex items-start gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="auto-delay-post"
                      checked={useAutoDelay}
                      onCheckedChange={(checked) => setUseAutoDelay(checked === true)}
                    />
                    <Label
                      htmlFor="auto-delay-post"
                      className="text-sm font-medium text-gray-800 cursor-pointer"
                    >
                      Use auto-delay for this thread
                    </Label>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon
                        weight="bold"
                        className="size-4 text-gray-500 shrink-0 mt-px cursor-help"
                      />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      When enabled, each tweet in the thread is delayed by 1 minute from
                      the previous tweet for better algorithmic performance.
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
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
