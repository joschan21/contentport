import { client } from '@/lib/client'
import { ArrowLeftIcon, BellRingingIcon, TimerIcon } from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Hash, Plus, X } from 'lucide-react'
import { useState } from 'react'
import type SwiperType from 'swiper'
import { Swiper, SwiperSlide } from 'swiper/react'
import DuolingoButton from '@/components/ui/duolingo-button'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'

import 'swiper/css'

interface InfoModalProps {
  onContinue?: () => void | Promise<void>
}

export const InfoModal = ({ onContinue }: InfoModalProps) => {
  const [swiperRef, setSwiperRef] = useState<null | SwiperType>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [input, setInput] = useState('')
  const [isNavigating, setIsNavigating] = useState(false)
  const queryClient = useQueryClient()
  const [keywords, setKeywords] = useState<string[]>([])
  const { data: userData } = authClient.useSession()

  const { mutate: saveKeywords } = useMutation({
    mutationFn: async (keywords: string[]) => {
      const res = await client.feed.save_keywords.$post({
        keywords,
      })
      return await res.json()
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['get-keywords'] })
      queryClient.setQueryData(['get-keywords'], { keywords })

      if (onContinue) {
        await onContinue()
      }
    },
  })

  const addKeyword = () => {
    setKeywords((prev) => [...prev, input.trim()])
    setInput('')
  }

  const removeKeyword = (index: number) => {
    setKeywords((prev) => prev.filter((_, i) => index !== i))
  }

  const handleKeywordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addKeyword()
    }
  }

  const handleContinue = async () => {
    setIsNavigating(true)
    saveKeywords(keywords)
  }

  const goToNext = () => {
    if (currentSlide < 1) {
      swiperRef?.slideNext()
    }
  }

  const goToPrev = () => {
    if (currentSlide > 0) {
      swiperRef?.slidePrev()
    }
  }

  const isAtLimit = Boolean(
    userData?.user.plan === 'pro' ? keywords.length >= 5 : keywords.length >= 1,
  )
  const canContinue = keywords.length > 0

  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
      <Swiper
        onSwiper={setSwiperRef}
        allowTouchMove={false}
        className="relative w-full"
        slidesPerView={1}
        onSlideChange={(swiper) => setCurrentSlide(swiper.activeIndex)}
      >
        <SwiperSlide className="p-5">
          <div className="flex h-full flex-grow flex-col">
            <div className="aspect-video w-full h-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
              <img
                alt="Onboarding decoration image"
                src="https://static.ferndesk.com/assets/helpdesk-setup-2.webp"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex h-full flex-grow flex-col pt-5">
              <div className="flex-grow flex-1 text-left">
                <h2 className="mb-2 text-2xl font-bold text-gray-900">
                  Create your topic monitor
                </h2>
                <p className="mb-5 text-pretty text-sm text-gray-600">
                  Engage anytime someone mentions your product or company on twitter.
                </p>
                <div className="mb-8 space-y-4 text-left">
                  <div className="flex items-start space-x-3">
                    <div className="mt-1 flex size-8 items-center justify-center rounded-full bg-emerald-50">
                      <TimerIcon className="size-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700">
                        Takes 60 seconds to set up
                      </h4>
                      <p className="text-sm text-gray-600">
                        Add keywords and we'll track all mentions.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="mt-1 flex size-8 items-center justify-center rounded-full bg-emerald-50">
                      <BellRingingIcon className="size-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700">
                        Monitor all Twitter mentions
                      </h4>
                      <p className="text-sm text-gray-600">
                        See everytime someone talks about you or your brand.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-auto flex flex-col gap-4 justify-between items-center">
                <DuolingoButton onClick={goToNext}>
                  Get Started <ChevronRight className="w-4 h-4 ml-1" />
                </DuolingoButton>
              </div>
            </div>
          </div>
        </SwiperSlide>

        <SwiperSlide className="p-5 h-auto min-h-0">
          <div className="flex space-y-6 h-full flex-1 flex-grow flex-col">
            <button
              onClick={goToPrev}
              className="-ml-2 mb-2 w-fit flex items-center gap-2 rounded-lg p-2 py-1 text-xs font-medium text-gray-400 hover:bg-neutral-100"
            >
              <ArrowLeftIcon className="size-4" />
              Back
            </button>

            <div className="flex-grow flex-1 h-full">
              <h2 className="mb-2 text-2xl text-pretty font-bold text-gray-900">
                Which keywords do you want to monitor?
              </h2>

              <div className="space-y-4 mt-5">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">
                    Keywords to Monitor ({keywords.length}/
                    {userData?.user.plan === 'pro' ? '5' : '1'})
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a keyword..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeywordKeyPress}
                      className="flex-1 h-12 px-4 text-base border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-indigo-500/20 transition-all duration-200"
                      disabled={isAtLimit}
                    />
                    <DuolingoButton
                      onClick={addKeyword}
                      disabled={!input.trim() || isAtLimit}
                      variant="icon"
                      size="icon"
                      className="h-12 w-12 rounded-xl"
                    >
                      <Plus className="w-4 h-4" />
                    </DuolingoButton>
                  </div>

                  {keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg border border-indigo-200"
                        >
                          <Hash className="w-3 h-3" />
                          {keyword}
                          <button
                            onClick={() => removeKeyword(index)}
                            className="ml-1 w-4 h-4 flex items-center justify-center text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100 rounded-full transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-2">
                    Press Enter or click + to add keywords
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    You can also change these later
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-auto flex justify-between items-center">
              <DuolingoButton
                onClick={handleContinue}
                disabled={!canContinue || isNavigating}
                variant={canContinue ? 'primary' : 'disabled'}
              >
                Start tracking &rarr;
              </DuolingoButton>
            </div>
          </div>
        </SwiperSlide>
      </Swiper>
    </div>
  )
}
