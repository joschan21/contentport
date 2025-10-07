import DuolingoButton from '@/components/ui/duolingo-button'
import { BellRingingIcon, TimerIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import type SwiperType from 'swiper'
import { Swiper, SwiperSlide } from 'swiper/react'

import 'swiper/css'

interface InfoModalProps {
  onContinue?: () => void | Promise<void>
}

export const InfoModal = ({ onContinue }: InfoModalProps) => {
  const [swiperRef, setSwiperRef] = useState<null | SwiperType>(null)
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    const originalPointerEvents = document.body.style.pointerEvents
    
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.pointerEvents = originalPointerEvents || ''
    }
  }, [])

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-0" />
      <div className="relative z-10 flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
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
                  src="/new-monitor.png"
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
                      <div className="mt-1 flex size-8 items-center justify-center rounded-full bg-indigo-50">
                        <TimerIcon className="size-5 text-indigo-600" />
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
                      <div className="mt-1 flex size-8 items-center justify-center rounded-full bg-indigo-50">
                        <BellRingingIcon className="size-5 text-indigo-600" />
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
                  <DuolingoButton onClick={onContinue}>
                    Show my feed &rarr;
                  </DuolingoButton>
                </div>
              </div>
            </div>
          </SwiperSlide>
        </Swiper>
      </div>
    </>
  )
}
