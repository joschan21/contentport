'use client'
import { Container } from '@/components/container'
import { Card, CardContent } from '@/components/ui/card'
import DuolingoButton from '@/components/ui/duolingo-button'

export default function SupportPage() {
  return (
    <Container
      className="pb-24"
      title="Support"
      description="If you have any questions or need assistance, feel free to contact us."
    >
      <div className="max-w-2xl mx-auto mt-6">
        <Card className="border border-black border-opacity-[0.01] bg-clip-padding shadow-[0_1px_1px_rgba(0,0,0,0.05),0_4px_6px_rgba(34,42,53,0.04),0_24px_68px_rgba(47,48,55,0.05),0_2px_3px_rgba(0,0,0,0.04)]">
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center space-y-6">
              {/* Overlapping Images */}
              <div className="relative z-10 isolate flex items-center -space-x-1.5">
                <img
                  alt="Jo"
                  src="/jo.jpg"
                  className="relative rotate-3 ring-3 ring-neutral-100 shadow-lg z-30 inline-block size-16 rounded-xl outline -outline-offset-1 outline-black/5"
                />
                <img
                  alt="Josh"
                  src="/josh.jpg"
                  className="relative -rotate-2 ring-3 ring-neutral-100 shadow-lg z-20 inline-block size-16 rounded-xl outline -outline-offset-1 outline-black/5"
                />
              </div>

              {/* Names and Twitter Handles */}
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold text-gray-900">Jo & Josh</h3>
              </div>

              {/* Support Message */}
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  If you have any issues, found bugs, or need some help, feel free to
                  contact us directly through Twitter DMs.
                </p>
                <p>
                  Our DMs are open and we try to read and come back to you as soon as
                  possible!
                </p>
              </div>

              {/* Call to Action */}
              <div className="pt-4 space-y-4">
                <p className="text-sm text-gray-500">
                  💬 Just send us a DM - we're here to help!
                </p>

                {/* Recommended Twitter Post */}
                <div className="space-y-2">
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

                {/* Twitter DM Buttons */}
                <div className="space-y-2 pt-6">
                  <p className="text-xs text-gray-400 font-medium text-center">
                    OR DM US DIRECTLY
                  </p>
                  <div className="flex gap-3 justify-center">
                    <DuolingoButton
                      size="sm"
                      onClick={() => window.open('https://x.com/jomeerkatz', '_blank')}
                    >
                      DM Jo
                    </DuolingoButton>
                    <DuolingoButton
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
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  )
}
