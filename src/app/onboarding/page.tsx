'use client'

import { Input } from '@/components/ui/input'
import { ChangeEvent, useEffect, useState } from 'react'
import type { Swiper as SwiperType } from 'swiper'
import { EffectCreative } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'

import { AccountConnection } from '@/components/account-connection'
import DuolingoButton from '@/components/ui/duolingo-button'
import { Label } from '@/components/ui/label'
import { AccountProvider } from '@/hooks/account-ctx'
import { useConfetti } from '@/hooks/use-confetti'
import { client } from '@/lib/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import 'swiper/css'
import 'swiper/css/effect-creative'
import { MultiSelect } from './multi-select'

const Page = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const isAccountConnected = searchParams.get('account_connected')
  const [swiperRef, setSwiperRef] = useState<SwiperType | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [input, setInput] = useState({ name: '' })

  const { fire, isReady } = useConfetti()

  useEffect(() => {
    if (isReady) {
      fire({
        particleCount: 200,
        spread: 160,
      })
    }
  }, [isReady])

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    setInput((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const [selectedRoles, setSelectedRoles] = useState<string[]>([])

  const roleOptions = [
    {
      label: 'Founder',
      value: 'founder',
    },
    {
      label: 'Developer',
      value: 'developer',
    },
    {
      label: 'Designer',
      value: 'designer',
    },
    {
      label: 'Marketer',
      value: 'marketer',
    },
  ]

  const handleNext = () => {
    if (swiperRef) {
      swiperRef.slideNext()
    }
  }

  const handlePrev = () => {
    if (swiperRef) {
      swiperRef.slidePrev()
    }
  }

  const { mutate: createOAuthLink, isPending: isCreatingOAuthLink } = useMutation({
    mutationFn: async () => {
      const res = await client.auth_router.createTwitterLink.$get({
        action: 'onboarding',
      })
      return await res.json()
    },
    onError: () => {
      toast.error('Error, please try again')
    },
    onSuccess: ({ url }) => {
      window.location.href = url
    },
  })

  return (
    <AccountProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="grid lg:grid-cols-[60%_40%] h-screen overflow-hidden place-items-center">
          <div className="flex flex-col gap-4">
            <div className="max-w-xl w-full bg-white p-12 rounded-3xl mx-auto h-fit flex items-center justify-center border border-black border-opacity-[0.01] bg-clip-padding shadow-[0_1px_1px_rgba(0,0,0,0.05),0_4px_6px_rgba(34,42,53,0.04),0_24px_68px_rgba(47,48,55,0.05),0_2px_3px_rgba(0,0,0,0.04)]">
              <Swiper
                slidesPerView={1}
                initialSlide={isAccountConnected ? 3 : 0}
                allowTouchMove={false}
                speed={150}
                className="w-full max-w-md"
                effect="creative"
                creativeEffect={{
                  prev: {
                    translate: [0, 0, 0],
                    scale: 0.95,
                    opacity: 0,
                  },
                  next: {
                    translate: [0, 0, 0],
                    scale: 0.95,
                    opacity: 0,
                  },
                }}
                modules={[EffectCreative]}
                keyboard={{ enabled: false, onlyInViewport: true }}
                onSwiper={setSwiperRef}
                onSlideChange={(swiper) => {
                  setCurrentSlide(swiper.activeIndex)
                  setSwiperRef(swiper)
                }}
              >
                <SwiperSlide className="mx-auto w-full p-1">
                  <div className="h-full flex flex-col items-stretch gap-6">
                    <div className="relative z-10 isolate flex items-center -space-x-1.5">
                      <img
                        alt=""
                        src="/jo.jpg"
                        className="relative rotate-3 ring-3 ring-neutral-100 shadow-lg z-30 inline-block size-12 rounded-xl outline -outline-offset-1 outline-black/5"
                      />
                      <img
                        alt=""
                        src="/josh.jpg"
                        className="relative -rotate-2 ring-3 ring-neutral-100 shadow-lg z-20 inline-block size-12 rounded-xl outline -outline-offset-1 outline-black/5"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <h3 className="text-3xl font-semibold">Nice to meet you! ✌️</h3>
                      <p className="text-base text-gray-500">
                        We're Jo and Josh, the founders of Contentport. To start, why
                        don't you introduce yourself :)
                      </p>
                    </div>

                    <div className="flex flex-col gap-1">
                      <Label required>First name</Label>
                      <Input
                        autoFocus
                        name="name"
                        value={input.name}
                        onChange={handleInput}
                        placeholder="John"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <Label required>What best describes you?</Label>
                      <MultiSelect
                        options={roleOptions}
                        value={selectedRoles}
                        onChange={setSelectedRoles}
                      />
                    </div>

                    <div>
                      <DuolingoButton
                        onClick={() => {
                          if (input.name.trim() === '') {
                            toast.error('Please enter your name to continue')
                            return
                          }

                          swiperRef?.slideNext()
                        }}
                      >
                        Continue
                      </DuolingoButton>
                    </div>
                  </div>
                </SwiperSlide>
                <SwiperSlide className="mx-auto w-full p-1">
                  <div className="h-full flex flex-col items-stretch gap-6">
                    <div className="relative z-10 isolate flex items-center -space-x-1.5">
                      <img
                        alt=""
                        src="/josh.jpg"
                        className="relative rotate-3 ring-3 ring-neutral-100 shadow-lg z-30 inline-block size-12 rounded-xl outline -outline-offset-1 outline-black/5"
                      />
                      <img
                        alt=""
                        src="/jo.jpg"
                        className="relative -rotate-2 ring-3 ring-neutral-100 shadow-lg z-20 inline-block size-12 rounded-xl outline -outline-offset-1 outline-black/5"
                      />

                      <hr className="relative z-0 border-b border-dashed border-gray-300 w-12" />

                      <div className="relative z-10 ring-3 size-12 overflow-hidden rounded-xl shadow-lg ring-neutral-100">
                        <img
                          className="h-full w-full"
                          alt=""
                          src="https://www.gravatar.com/avatar/e8a0593f614e34d5d92d8a59608e06a9?d=mp"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-6">
                      <h3 className="text-3xl font-semibold">
                        Let's connect your Twitter
                      </h3>
                      <p className="text-base text-gray-500">
                        Contentport automatically learns from your recent and most
                        successful tweets.
                      </p>
                      <ul className="list-disc list-inside text-gray-500">
                        <li>📈 Analyzes your successful posts</li>
                        <li>✏️ Automatically learns your style</li>
                        <li>🔍 Learns about you & your company</li>
                      </ul>
                      <p className="text-base text-gray-500">
                        P.S: We're the only open-source product in this space. You can see
                        exactly how we handle data in our{' '}
                        <a
                          href="https://github.com/joschan21/contentport"
                          target="_blank"
                          className="underline"
                        >
                          open codebase
                        </a>
                        .
                      </p>
                    </div>

                    <div className="h-full flex-1 flex items-end">
                      <DuolingoButton
                        loading={isCreatingOAuthLink}
                        onClick={() => createOAuthLink()}
                      >
                        Connect Twitter
                      </DuolingoButton>
                    </div>
                  </div>
                </SwiperSlide>

                <SwiperSlide className="mx-auto w-full p-1">
                  <AccountConnection />
                </SwiperSlide>
              </Swiper>
            </div>

            <p className="text-center text-xs text-gray-500">
              Need help? Message us{' '}
              <a
                href="https://x.com/joshtriedcoding"
                rel="noopener noreferrer"
                target="_blank"
                className="underline"
              >
                @joshtriedcoding
              </a>
              {' or '}
              <a
                href="https://x.com/jomeerkatz"
                rel="noopener noreferrer"
                target="_blank"
                className="underline"
              >
                @jomeerkatz
              </a>
            </p>
          </div>

          <div className="relative hidden lg:block shadow-inner w-full bg-red-500 h-full overflow-hidden">
            <img
              className="object-cover pointer-events-none select-none w-full h-full"
              src="/cover.png"
            />
          </div>

          {/* Right Column - Testimonials & Images */}
          {/* <div className="w-1/2 bg-gray-50 border-l border-gray-200 flex flex-col">
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="max-w-md space-y-8">
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <div className="space-y-6">
                  <div className="flex text-indigo-400">
                    {[...Array(5)].map((_, i) => (
                      <Sparkles key={i} className="w-5 h-5 fill-current" />
                    ))}
                  </div>

                  <blockquote className="text-gray-900 text-lg leading-relaxed">
                    {mockTestimonials[currentSlide % mockTestimonials.length]?.quote
                      .split('\n\n')
                      .map((part, i) => (
                        <p key={i} className={cn(i > 0 && 'mt-4')}>
                          {part}
                        </p>
                      ))}
                  </blockquote>

                  <div className="flex items-center space-x-3 pt-4 border-t border-gray-100">
                    <img
                      src={
                        mockTestimonials[currentSlide % mockTestimonials.length]?.image
                      }
                      alt={
                        mockTestimonials[currentSlide % mockTestimonials.length]?.author
                      }
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">
                        {mockTestimonials[currentSlide % mockTestimonials.length]?.author}
                      </p>
                      <p className="text-gray-600 text-sm">
                        {mockTestimonials[currentSlide % mockTestimonials.length]?.handle}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-indigo-600">50K+</div>
                  <div className="text-sm text-gray-600">Posts Created</div>
                </div>
                <div className="bg-white rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-indigo-600">10K+</div>
                  <div className="text-sm text-gray-600">Happy Users</div>
                </div>
              </div>
            </div>
          </div>
        </div> */}
        </div>
      </div>
    </AccountProvider>
  )
}

export default Page
