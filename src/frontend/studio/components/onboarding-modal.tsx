'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import DuolingoButton from '@/components/ui/duolingo-button'
import { Loader } from '@/components/ui/loader'
import { Progress } from '@/components/ui/progress'
import { useConfetti } from '@/hooks/use-confetti'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { client } from '@/lib/client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import type SwiperType from 'swiper'
import { EffectCreative } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import { TWITTER_HANDLE_VALIDATOR, TwitterHandleForm } from '../lib/validators'
import './swiper-bundle.css'
import DuolingoRadioGroup from '@/components/ui/duolingo-radio'

enum SLIDES {
  WELCOME_SLIDE = 0,
  FOCUS_SLIDE = 1,
  GOAL_SLIDE = 2,
  HANDLE_SLIDE = 3,
  COMPLETED_SLIDE = 4,
}

type Field = keyof TwitterHandleForm

interface OnboardingModalProps {
  onOpenChange?: (isOpen: boolean) => void
  oauthOnboarding?: boolean
  loading?: boolean
}

const STEPS: Array<{ id: string; name: string; fields: Field[] }> = [
  { id: 'Step 0', name: 'Welcome slide', fields: [] },
  { id: 'Step 1', name: 'Goal slide', fields: [] },
  { id: 'Step 2', name: 'Focus slide', fields: [] },
  { id: 'Step 3', name: 'Handle slide', fields: ['handle'] },
  { id: 'Step 4', name: 'Completed slide', fields: [] },
]

const TWEET_GOALS = [
  { label: '1 tweet / day', value: '1_day', description: 'Build a habit' },
  { label: '2 tweets / day', value: '2_day', description: 'Grow faster' },
  { label: '3 tweets / day', value: '3_day', description: 'Go all in' },
]

const MAIN_FOCUS = [
  { label: '📈 Grow my audience', value: 'grow' },
  { label: '🧠 Build a personal brand', value: 'personal_brand' },
  { label: '💼 Promote my product or business', value: 'promote' },
  { label: '🧩 Other', value: 'other' },
]

export const OnboardingModal = ({
  onOpenChange,
  oauthOnboarding = false,
  loading = false,
}: OnboardingModalProps) => {
  const [swiperRef, setSwiperRef] = useState<null | SwiperType>(null)
  const [progress, setProgress] = useState<number>(0)
  const [isOpen, setIsOpen] = useState<boolean>(true)
  const { fire } = useConfetti()
  const [exampleDocsCreated, setExampleDocsCreated] = useState(false)
  const [tweetGoal, setTweetGoal] = useState('')
  const [mainFocus, setMainFocus] = useState('')

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

  useEffect(() => {
    fire()
  }, [fire])

  // Update parent component when modal is closed
  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(isOpen)
    }
  }, [isOpen, onOpenChange])

  // Create example documents when reaching the completion slide
  useEffect(() => {
    if (swiperRef?.activeIndex === SLIDES.COMPLETED_SLIDE && !exampleDocsCreated) {
      setExampleDocsCreated(true)
    }
  }, [swiperRef?.activeIndex])

  const queryClient = useQueryClient()

  const {
    trigger,
    watch,
    formState: { errors },
  } = useForm<TwitterHandleForm>({
    resolver: zodResolver(TWITTER_HANDLE_VALIDATOR),
    defaultValues: {
      handle: '',
    },
  })

  const handleNext = async () => {
    if (!swiperRef) return
    const currentSlide = swiperRef.activeIndex
    if (currentSlide === SLIDES.GOAL_SLIDE && !tweetGoal) return
    if (currentSlide === SLIDES.FOCUS_SLIDE && !mainFocus) return
    const fields = STEPS[currentSlide]?.fields ?? []
    const isValid = await trigger(fields, { shouldFocus: true })
    if (!isValid) return
    if (currentSlide === SLIDES.HANDLE_SLIDE) {
      // handleSubmit(onSubmit)()
    } else if (currentSlide === SLIDES.COMPLETED_SLIDE) {
      queryClient.invalidateQueries({ queryKey: ['get-active-account'] })
      setIsOpen(false)
    } else {
      swiperRef.slideNext()
    }
  }

  const handleBack = () => {
    if (!swiperRef) return
    swiperRef.slidePrev()
  }

  // Calculate progress percentage based on current slide
  useEffect(() => {
    if (swiperRef) {
      const totalSlides = STEPS.length - 1 // Excluding the last slide
      const currentSlide = swiperRef.activeIndex
      const progressPercentage = (currentSlide / totalSlides) * 100
      setProgress(progressPercentage)
    }
  }, [swiperRef?.activeIndex])

  useEffect(() => {
    if (swiperRef?.activeIndex === SLIDES.COMPLETED_SLIDE) {
      fire({ angle: 75, spread: 90 })
      fire({ angle: 90, spread: 90 })
      fire({ angle: 105, spread: 90 })
    }
  }, [swiperRef?.activeIndex, fire])

  // Determine if the button should be disabled
  const isButtonDisabled = () => {
    // if (isPending) return true
    if (swiperRef?.activeIndex === SLIDES.GOAL_SLIDE && !tweetGoal) return true
    if (swiperRef?.activeIndex === SLIDES.FOCUS_SLIDE && !mainFocus) return true
    if (swiperRef?.activeIndex === SLIDES.HANDLE_SLIDE && !watch('handle').trim())
      return true
    return false
  }

  useEffect(() => {
    if (oauthOnboarding && swiperRef) {
      swiperRef.slideTo(SLIDES.COMPLETED_SLIDE)
    }
  }, [oauthOnboarding, swiperRef])

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open)
          if (onOpenChange) {
            onOpenChange(open)
          }
        }}
      >
        <DialogTitle className="sr-only">title</DialogTitle>
        <DialogContent
          noClose
          className="border-none max-w-md p-8"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[300px]">
              <Loader variant="typing" className="mb-2" />
              <p className="text-lg text-stone-700">Finishing onboarding...</p>
            </div>
          ) : (
            <Swiper
              centeredSlides={true}
              keyboard={{ enabled: false, onlyInViewport: true }}
              allowTouchMove={false}
              className="relative w-full"
              onSwiper={setSwiperRef}
              onSlideChange={() => {
                const totalSlides = STEPS.length - 1
                const currentSlide = swiperRef?.activeIndex || 0
                const progressPercentage = (currentSlide / totalSlides) * 100
                setProgress(progressPercentage)
              }}
              effect="creative"
              speed={150}
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
              initialSlide={oauthOnboarding ? SLIDES.COMPLETED_SLIDE : 0}
            >
              <SwiperSlide className="relative space-y-6">
                <div className="flex flex-col items-center gap-1 text-center">
                  <p className="text-2xl font-semibold text-gray-900">
                    Welcome to contentport 🎉
                  </p>
                  <p className="text-stone-600 text-balance">
                    Just{' '}
                    <span className="font-medium text-stone-800">2 quick questions</span>{' '}
                    before we write your first tweet!
                  </p>
                </div>
                <div className="aspect-video w-full overflow-hidden rounded-lg bg-gray-100">
                  <img
                    className="h-full w-full object-cover"
                    src="https://media.giphy.com/media/UtzyBJ9trryNO4R3Ee/giphy.gif"
                  />
                </div>
              </SwiperSlide>

              <SwiperSlide>
                <div className="flex flex-col gap-6 w-full">
                  <div className="flex w-full items-center">
                    <DuolingoButton
                      variant="secondary"
                      size="icon"
                      onClick={handleBack}
                      className="mr-2 bg-stone-100 hover:bg-stone-100 rounded-full"
                    >
                      <ArrowLeft className="size-5" />
                    </DuolingoButton>
                    <Progress value={progress} className="h-2 flex-1" />
                  </div>

                  <div className="flex flex-col items-center gap-1 text-center">
                    <p className="text-2xl font-semibold text-gray-900">
                      What brings you here?
                    </p>
                  </div>

                  <div className="w-full">
                    <DuolingoRadioGroup
                      name="main-focus"
                      options={MAIN_FOCUS}
                      value={mainFocus}
                      onChange={setMainFocus}
                    />
                  </div>
                </div>
              </SwiperSlide>

              <SwiperSlide>
                <div className="flex flex-col gap-6 w-full">
                  <div className="flex w-full items-center">
                    <DuolingoButton
                      variant="secondary"
                      size="icon"
                      onClick={handleBack}
                      className="mr-2 bg-stone-100 hover:bg-stone-100 rounded-full"
                    >
                      <ArrowLeft className="size-5" />
                    </DuolingoButton>
                    <Progress value={progress} className="h-2 flex-1" />
                  </div>

                  <div className="flex flex-col items-center gap-1 text-center">
                    <p className="text-2xl font-semibold text-gray-900">
                      What's your daily posting goal?
                    </p>
                  </div>

                  <div className="w-full">
                    <DuolingoRadioGroup
                      name="tweet-goal"
                      options={TWEET_GOALS}
                      value={tweetGoal}
                      onChange={setTweetGoal}
                    />
                  </div>
                </div>
              </SwiperSlide>

              <SwiperSlide className="px-1">
                <div className="flex w-full space-y-6 flex-col items-center justify-center">
                  <div className="flex w-full items-center">
                    <DuolingoButton
                      variant="secondary"
                      size="icon"
                      onClick={handleBack}
                      className="mr-2 bg-stone-100 hover:bg-stone-100 rounded-full"
                    >
                      <ArrowLeft className="size-5" />
                    </DuolingoButton>
                    <Progress value={progress} className="h-2 flex-1" />
                  </div>

                  <div className="flex flex-col items-center gap-1 text-center">
                    <p className="text-2xl font-semibold text-gray-900">
                      Let's connect your Twitter
                    </p>
                    <p className="text-center text-gray-600">
                      This allows you to schedule posts, publish directly, and helps us learn your style.
                    </p>
                  </div>

                  <DuolingoButton
                    loading={isCreatingOAuthLink}
                    className="relative z-20"
                    onClick={() => createOAuthLink()}
                  >
                    Connect Twitter
                  </DuolingoButton>
                </div>
              </SwiperSlide>

              <SwiperSlide>
                <div className="flex w-full space-y-6 flex-col items-center justify-center">
                  <div className="flex w-full flex-col items-center gap-1 text-center">
                    <p className="text-2xl font-semibold text-gray-900">You're in! 🎉</p>
                    <p className="text-gray-600">
                      We've analyzed your{' '}
                      <span className="font-medium text-stone-800">
                        20 best recent tweets
                      </span>{' '}
                      - contentport is already learning your style.
                    </p>
                  </div>
                  <div className="relative w-full aspect-video overflow-hidden rounded-lg bg-gray-100">
                    <img
                      className="h-full w-full object-cover object-top"
                      src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExbW9udHE4eHg3eng0M3R1Y3kzcndqMjhnc3Jza2FzN2g1NGV1NHk4dCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/DhstvI3zZ598Nb1rFf/giphy.gif"
                      alt="Success animation"
                    />
                  </div>
                </div>
              </SwiperSlide>
            </Swiper>
          )}
          <div className="mt-8 flex flex-col gap-6">
            <div className="w-full">
              <DuolingoButton onClick={handleNext} disabled={isButtonDisabled()}>
                {swiperRef?.activeIndex === 0
                  ? 'Continue'
                  : swiperRef?.activeIndex === SLIDES.GOAL_SLIDE
                    ? "I'm committed"
                    : swiperRef?.activeIndex === SLIDES.COMPLETED_SLIDE
                      ? 'Start posting'
                      : 'Continue'}
                <ArrowRight className="ml-1.5 size-4" />
              </DuolingoButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
