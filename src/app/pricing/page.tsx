import Footer from '@/components/footer'
import Navbar from '@/components/navbar'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { Card } from '@/components/ui/card'
import DuolingoButton from '@/components/ui/duolingo-button'
import Pricing from '@/frontend/studio/components/Pricing'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import Link from 'next/link'

const PricingPage = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  return (
    <>
      <section className="bg-gray-100 min-h-screen">
        <div className="relative max-w-7xl mx-auto">
          <Navbar title={session ? 'Studio' : 'Get Started'} />
        </div>

        <div className="relative isolate pt-20">
          <section>
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <Pricing targetUrl="/sign-in" />
            </div>
          </section>

          <section className="py-12 bg-gray-100">
            <div className="mx-auto max-w-5xl px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
                  Frequently asked questions
                </h2>
              </div>

              <Card>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-xl pt-0 font-semibold text-gray-900">
                      Can I switch plans at any time?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      Yes! You can upgrade or downgrade your plan at any time. Changes
                      take effect immediately.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger className="text-xl font-semibold text-gray-900">
                      What happens if I hit my limits on the free plan?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      You can always see your usage in your account settings. You can
                      upgrade to Pro at any time for unlimited scheduling, AI messages,
                      and more accounts.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger className="text-xl font-semibold text-gray-900">
                      Can I cancel anytime?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      Absolutely. You can cancel your Pro subscription anytime from your
                      account settings. You'll keep Pro access until the end of your
                      billing period.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4">
                    <AccordionTrigger className="text-xl font-semibold text-gray-900">
                      Do you offer refunds?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      Yes. You can request a refund within 7 days of being charged. Just
                      reach out to us in this time frame.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-5">
                    <AccordionTrigger className="text-xl font-semibold text-gray-900">
                      Do I need to share my Twitter password with you?
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      No, we never ask for or store your passwords. We use Twitter's
                      official authentication method, which means you log in securely
                      through their official login page.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-6">
                    <AccordionTrigger className="text-xl pb-0 font-semibold text-gray-900">
                      I have another question
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 pt-4">
                      Great! DM us directly{' '}
                      <Link
                        href="https://x.com/jomeerkatz"
                        className="underline font-medium text-gray-800"
                      >
                        @jomeerkatz
                      </Link>{' '}
                      or{' '}
                      <Link
                        href="https://x.com/joshtriedcoding"
                        className="underline font-medium text-gray-800"
                      >
                        @joshtriedcoding
                      </Link>
                      , we usually respond within a few hours!
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            </div>
          </section>

          <section className="py-24 bg-white">
            <div className="mx-auto max-w-5xl px-6 lg:px-8 text-center">
              <div className="rounded-3xl bg-gray-900 px-8 py-16 sm:px-16">
                <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Ready to grow on Twitter?
                </h2>
                <p className="mt-6 text-lg text-gray-300">
                  Join <span className="font-medium text-gray-100">1,817 users</span>{' '}
                  already using Contentport to create better content, faster.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/sign-in">
                    <DuolingoButton className="w-full sm:w-auto h-12 px-8">
                      Try for Free &rarr;
                    </DuolingoButton>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <Footer />
    </>
  )
}

export default PricingPage
