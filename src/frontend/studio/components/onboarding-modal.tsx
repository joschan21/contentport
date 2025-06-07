"use client"

import { DEFAULT_CONNECTED_ACCOUNT } from "@/components/tweet-editor/tweet-editor"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import DuolingoButton from "@/components/ui/duolingo-button"
import DuolingoInput from "@/components/ui/duolingo-input"
import { Progress } from "@/components/ui/progress"
import { DEFAULT_DOCS } from "@/constants/default-context-docs"
import { SidebarDoc } from "@/hooks/document-ctx"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { client } from "@/lib/client"
import { cn } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, ArrowRight, AtSign } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import toast from "react-hot-toast"
import type SwiperType from "swiper"
import { EffectCreative } from "swiper/modules"
import { Swiper, SwiperSlide } from "swiper/react"
import { TWITTER_HANDLE_VALIDATOR, TwitterHandleForm } from "../lib/validators"
import Confetti, { ConfettiRef } from "./confetti"
import "./swiper-bundle.css"

enum SLIDES {
  WELCOME_SLIDE = 0,
  HANDLE_SLIDE = 1,
  COMPLETED_SLIDE = 2,
}

type Field = keyof TwitterHandleForm

interface OnboardingModalProps {
  onOpenChange?: (isOpen: boolean) => void
}

const STEPS: Array<{ id: string; name: string; fields: Field[] }> = [
  {
    id: "Step 0",
    name: "Welcome slide",
    fields: [],
  },
  {
    id: "Step 1",
    name: "Handle slide",
    fields: ["handle"],
  },
  {
    id: "Step 2",
    name: "Completed slide",
    fields: [],
  },
]

export const OnboardingModal = ({ onOpenChange }: OnboardingModalProps) => {
  const [swiperRef, setSwiperRef] = useState<null | SwiperType>(null)
  const [progress, setProgress] = useState<number>(0)
  const [isOpen, setIsOpen] = useState<boolean>(true)
  const confettiRef = useRef<ConfettiRef>(null)
  const router = useRouter()
  const [exampleDocsCreated, setExampleDocsCreated] = useState(false)
  const [contextDocs, setContextDocs] = useLocalStorage<SidebarDoc[]>(
    "context-docs",
    []
  )

  useEffect(() => {
    if (confettiRef.current) {
      confettiRef.current.fire()
    }
  }, [])

  // Update parent component when modal is closed
  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(isOpen)
    }
  }, [isOpen, onOpenChange])

  // Create example documents when reaching the completion slide
  useEffect(() => {
    if (
      swiperRef?.activeIndex === SLIDES.COMPLETED_SLIDE &&
      !exampleDocsCreated
    ) {
      createExampleDocuments()
      setExampleDocsCreated(true)
    }
  }, [swiperRef?.activeIndex])

  const createExampleDocuments = () => {
    const currentDate = new Date()

    const sidebarDocs = DEFAULT_DOCS.map((doc) => ({
      id: doc.id,
      title: doc.title,
      updatedAt: currentDate,
    }))

    setContextDocs(sidebarDocs)

    DEFAULT_DOCS.forEach((doc) => {
      localStorage.setItem(
        `doc-${doc.id}`,
        JSON.stringify({
          title: doc.title,
          content: doc.content,
        })
      )
    })
  }

  const [, setConnectedAccount] = useLocalStorage(
    "connected-account",
    DEFAULT_CONNECTED_ACCOUNT
  )
  const queryClient = useQueryClient()

  const {
    data,
    mutate: connectAccount,
    isPending,
  } = useMutation({
    mutationFn: async ({ username }: { username: string }) => {
      const res = await client.settings.onboarding.$post({ username })
      return await res.json()
    },
    onSuccess: ({ data }) => {
      queryClient.setQueryData(["connected-account"], data)
      queryClient.invalidateQueries({ queryKey: ["account-style"] })
      queryClient.invalidateQueries({ queryKey: ["get-connected-account"] })
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] })
      setConnectedAccount(data)
      swiperRef?.slideNext()
    },
    onError: (error) => {
      toast.error(error.message)
      setFocus("handle")
    },
  })

  const {
    handleSubmit,
    trigger,
    register,
    setFocus,
    watch,
    formState: { errors },
  } = useForm<TwitterHandleForm>({
    resolver: zodResolver(TWITTER_HANDLE_VALIDATOR),
    defaultValues: {
      handle: "",
    },
  })

  const onSubmit = async ({ handle }: TwitterHandleForm) => {
    connectAccount({ username: handle })
  }

  const handleNext = async () => {
    if (!swiperRef) return

    const currentSlide = swiperRef.activeIndex
    const fields = STEPS[currentSlide]?.fields ?? []
    const isValid = await trigger(fields, { shouldFocus: true })

    if (!isValid) {
      return
    }

    if (currentSlide === 0) {
      setFocus("handle")
    }

    if (currentSlide === SLIDES.HANDLE_SLIDE) {
      handleSubmit(onSubmit)()
    } else if (currentSlide === SLIDES.COMPLETED_SLIDE) {
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
    if (
      swiperRef?.activeIndex === SLIDES.COMPLETED_SLIDE &&
      confettiRef.current
    ) {
      confettiRef.current.fire({ angle: 75, spread: 90 })
      confettiRef.current.fire({ angle: 90, spread: 90 })
      confettiRef.current.fire({ angle: 105, spread: 90 })
    }
  }, [swiperRef?.activeIndex])

  // Determine if the button should be disabled
  const isButtonDisabled = () => {
    if (isPending) return true
    if (
      swiperRef?.activeIndex === SLIDES.HANDLE_SLIDE &&
      !watch("handle").trim()
    )
      return true
    return false
  }

  return (
    <>
      <Confetti
        ref={confettiRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-[1000] h-full w-full"
      />

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
          >
            <SwiperSlide className="relative space-y-6">
              <div className="flex flex-col items-center gap-1 text-center">
                <p className="text-2xl font-semibold text-gray-900">
                  Welcome to contentport 🎉
                </p>
                <p className="text-stone-600">
                  Just{" "}
                  <span className="font-medium text-stone-800">
                    1 quick question
                  </span>{" "}
                  to get you started!
                </p>
              </div>
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-gray-100">
                <img
                  className="h-full w-full object-cover"
                  src="https://media.giphy.com/media/UtzyBJ9trryNO4R3Ee/giphy.gif"
                />
              </div>
            </SwiperSlide>

            <SwiperSlide className="">
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
                    What's your Twitter handle?
                  </p>
                  <p className="text-center text-gray-600">
                    We'll use this to personalize your experience.
                  </p>
                </div>

                <div className="mx-1 w-full space-y-1.5 px-1 pb-1">
                  <div className="mt-2 grid grid-cols-1">
                    <DuolingoInput
                      icon={
                        <AtSign
                          aria-hidden="true"
                          className="pointer-events-none col-start-1 row-start-1 ml-3 size-5 self-center text-gray-400 sm:size-4"
                        />
                      }
                      {...register("handle")}
                      placeholder="joshtriedcoding"
                      className={cn("col-start-1 row-start-1 z-10 w-full")}
                    />
                  </div>

                  <p className="text-xs pt-1 pl-1 text-stone-500">
                    You can always change your handle later
                  </p>

                  {!!errors.handle && (
                    <p className="text-sm text-red-600">
                      {errors.handle.message}
                    </p>
                  )}
                </div>
              </div>
            </SwiperSlide>

            <SwiperSlide>
              <div className="flex w-full space-y-6 flex-col items-center justify-center">
                <div className="flex w-full flex-col items-center gap-1 text-center">
                  <p className="text-2xl font-semibold text-gray-900">
                    You're in! 🎉
                  </p>
                  {data?.data && data?.data.userTweetCount < 20 ? (
                    <p className="text-gray-600">
                      We've imported your <span className="font-medium text-stone-800">best recent tweets</span> and <span className="font-medium text-stone-800">high-performing
                      examples</span> - contentport is already learning your
                      style.
                    </p>
                  ) : (
                    <p className="text-gray-600">
                      We've imported your{" "}
                      <span className="font-medium text-stone-800">
                        best {data?.data.userTweetCount ?? 20} recent tweets
                      </span>{" "}
                      - contentport is already learning your style.
                    </p>
                  )}
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
          <div className="mt-8 flex flex-col gap-6">
            <div className="w-full">
              <DuolingoButton
                loading={isPending}
                onClick={handleNext}
                disabled={isButtonDisabled()}
              >
                {swiperRef?.activeIndex === 0
                  ? "Get Started"
                  : swiperRef?.activeIndex === SLIDES.COMPLETED_SLIDE
                    ? "Write My First Tweet"
                    : "Continue"}
                <ArrowRight className="size-4" />
              </DuolingoButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
