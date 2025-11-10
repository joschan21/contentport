'use client'

import { Modal } from '@/components/ui/modal'
import { Card, CardContent } from '@/components/ui/card'
import DuolingoButton from '@/components/ui/duolingo-button'
import { Dispatch, SetStateAction } from 'react'

export function SupportModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: Dispatch<SetStateAction<boolean>>
}) {
  return (
    <Modal showModal={open} setShowModal={onOpenChange} className="max-w-lg">
      <div className="p-6">
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Reach out to us! </h2>
          </div>

          <Card className="border border-black border-opacity-[0.01] bg-clip-padding shadow-[0_1px_1px_rgba(0,0,0,0.05),0_4px_6px_rgba(34,42,53,0.04),0_24px_68px_rgba(47,48,55,0.05),0_2px_3px_rgba(0,0,0,0.04)]">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="relative z-10 isolate flex items-center -space-x-1.5">
                  <img
                    alt="Jo"
                    src="/jo.jpg"
                    className="relative rotate-3 ring-3 ring-neutral-100 shadow-lg z-30 inline-block size-12 rounded-xl outline -outline-offset-1 outline-black/5"
                  />
                  <img
                    alt="Josh"
                    src="/josh.jpg"
                    className="relative -rotate-2 ring-3 ring-neutral-100 shadow-lg z-20 inline-block size-12 rounded-xl outline -outline-offset-1 outline-black/5"
                  />
                </div>

                <h3 className="text-lg font-semibold text-gray-900">Jo & Josh</h3>

                <p>
                  If you have any issues, found bugs, or need help, feel free to chat with
                  us on Twitter DMs.
                </p>

                <div className="pt-2 space-y-3 w-full">
                  <p className="text-xs text-gray-400 font-medium text-center">
                    RECOMMENDED
                  </p>
                  <DuolingoButton
                    onClick={() =>
                      window.open(
                        'https://x.com/intent/tweet?text=Hey @jomeerkatz @joshtriedcoding, I have an issue with Contentport:',
                        '_blank',
                      )
                    }
                    className="w-full"
                  >
                    📱 Post Issue on Twitter
                  </DuolingoButton>
                  <p className="text-xs text-gray-500 text-center">
                    Share screenshots, videos, or describe your issue publicly
                  </p>
                </div>

                <div className="space-y-2 pt-4 w-full">
                  <p className="text-xs text-gray-400 font-medium text-center">
                    OR DM US DIRECTLY
                  </p>
                  <div className="flex gap-3 justify-center">
                    <DuolingoButton
                      variant="secondary"
                      size="sm"
                      onClick={() => window.open('https://x.com/jomeerkatz', '_blank')}
                    >
                      DM Jo
                    </DuolingoButton>
                    <DuolingoButton
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        window.open('https://x.com/joshtriedcoding', '_blank')
                      }
                    >
                      DM Josh
                    </DuolingoButton>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Modal>
  )
}
