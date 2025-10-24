import Footer from '@/components/footer'
import { Icons } from '@/components/icons'
import { LogoCloud } from '@/components/logo-cloud'
import Navbar from '@/components/navbar'
import DuolingoButton from '@/components/ui/duolingo-button'
import TestimonialCard from '@/frontend/studio/components/TestimonialCard'
import { auth } from '@/lib/auth'
import MuxPlayer from '@mux/mux-player-react'
import { headers } from 'next/headers'
import Link from 'next/link'

const Page = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  return (
    <>
      <section className="bg-gray-100">
        <div className="relative max-w-7xl mx-auto">
          <Navbar title={session ? 'Studio' : 'Get Started'} />
        </div>

        <div className="relative isolate pt-20">
          <section className="py-24">
            <div className="mx-auto max-w-7xl px-6 lg:px-8 space-y-20">
              <div className="max-w-4xl mx-auto text-center">
                <div className="flex flex-col justify-center items-center">
                  <h1 className="text-5xl font-semibold tracking-tight text-balance text-gray-900 sm:text-6xl">
                    Your{' '}
                    <span className="relative whitespace-nowrap text-indigo-600">
                      <span className="absolute z-0 bg-indigo-500/10 w-[103%] h-[100%] -left-[1%] -top-[2.5%] -rotate-1" />
                      content engine <span className="hidden sm:inline">📈</span>
                    </span>{' '}
                    for growing on Twitter
                  </h1>
                  <p className="mt-6 text-gray-500 text-pretty text-lg sm:text-xl max-w-2xl">
                    Grow on Twitter 10x faster with a content engine that deeply knows you
                    and your writing style. Contentport helps you{' '}
                    <span className="text-gray-900 font-medium">
                      create & schedule twitter content at scale
                    </span>
                    .
                  </p>

                  <div className="max-w-lg w-full mt-8 flex flex-col gap-4 items-center">
                    <div className="flex mt-4 flex-col gap-2 max-w-sm w-full">
                      {session?.user ? (
                        <Link href="/studio">
                          <DuolingoButton className="w-full h-12 sm:px-8">
                            Start Growing on <Icons.twitter className="size-4 ml-1.5" />
                          </DuolingoButton>
                        </Link>
                      ) : (
                        <Link href="/sign-in">
                          <DuolingoButton className="w-full h-12 sm:px-8">
                            Start Growing on <Icons.twitter className="size-4 ml-1.5" />
                          </DuolingoButton>
                        </Link>
                      )}
                    </div>

                    <div className="mt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
                      <div className="flex -space-x-2">
                        <img
                          className="h-10 w-10 rounded-full ring-2 ring-white"
                          src="/images/user/ahmet_128.png"
                          alt="User testimonial"
                        />
                        <img
                          className="h-10 w-10 rounded-full ring-2 ring-white"
                          src="/images/user/chris_128.png"
                          alt="User testimonial"
                        />
                        <img
                          className="h-10 w-10 rounded-full ring-2 ring-white"
                          src="/images/user/justin_128.png"
                          alt="User testimonial"
                        />
                        <img
                          className="h-10 w-10 rounded-full ring-2 ring-white"
                          src="/images/user/rohit_128.png"
                          alt="User testimonial"
                        />
                        <img
                          className="h-10 w-10 rounded-full ring-2 ring-white"
                          src="/images/user/vladan_128.png"
                          alt="User testimonial"
                        />
                      </div>
                      <div className="flex flex-col justify-center items-center sm:items-start">
                        <div className="flex mb-1">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className="size-6 text-yellow-400 -mx-px fill-current"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <p className="text-base text-left text-gray-600">
                          Loved by{' '}
                          <span className="font-medium text-gray-900">1.817</span> users
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative flex items-center h-fit -m-2 rounded-xl bg-white/75 p-2 ring-1 ring-gray-900/10 ring-inset lg:-m-4 lg:rounded-2xl lg:p-4 shadow-2xl">
                <MuxPlayer
                  accentColor="#4f46e5"
                  style={{ aspectRatio: 16 / 9 }}
                  className="w-full h-full overflow-hidden rounded-lg lg:rounded-xl shadow-lg"
                  poster="https://image.mux.com/01ddBxgG7W53ZCMZ02LLP692sLD4w009XzUtoCd00NcSBO8/thumbnail.png?time=10"
                  playbackId="01ddBxgG7W53ZCMZ02LLP692sLD4w009XzUtoCd00NcSBO8"
                  playsInline
                />
              </div>

              <LogoCloud />
            </div>
          </section>

          <section className="py-24 bg-white">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
                  How does Contentport compare?
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                <div className="relative">
                  <div className="rounded-3xl border-4 border-gray-200 bg-gray-100 p-8 h-full">
                    <div className="text-left">
                      <div className="w-full h-80 bg-gray-100 rounded-2xl mb-6 overflow-hidden">
                        <img
                          src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExbG5scnI4dmJ0N3g5eWdvbjlpMzhmNG1udjhlYXNrejFpOWFpdTZ3OCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xdLH51eNWZAHrwy5mf/giphy.gif"
                          alt="You Without Social Proof"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h3 className="text-2xl sm:text-3xl  font-semibold text-gray-900 mb-6">
                        Competitors
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <svg
                          className="w-6 h-6 text-red-500 mt-0.5 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <p className="text-gray-600">Don't help you get content ideas</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <svg
                          className="w-6 h-6 text-red-500 mt-0.5 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <p className="text-gray-600">Generate obvious AI slop at best</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <svg
                          className="w-6 h-6 text-red-500 mt-0.5 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <p className="text-gray-600">
                          Don't allow you to manage multiple accounts
                        </p>
                      </div>

                      <div className="flex items-start gap-3">
                        <svg
                          className="w-6 h-6 text-red-500 mt-0.5 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <p className="text-gray-600">Use outdated AI models from 2024</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <svg
                          className="w-6 h-6 text-red-500 mt-0.5 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <p className="text-gray-600">
                          Are closed source with questionable data safety
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="rounded-3xl border-4 border-indigo-600 bg-gray-100 p-8 h-full text-white">
                    <div className="text-left">
                      <div className="w-full h-80 bg-purple-800/30 rounded-2xl mb-6 overflow-hidden border border-purple-400/20">
                        <img
                          src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExbW9udHE4eHg3eng0M3R1Y3kzcndqMjhnc3Jza2FzN2g1NGV1NHk4dCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/DhstvI3zZ598Nb1rFf/giphy.gif"
                          alt="Contentport"
                          className="w-full h-full object-cover object-top opacity-90"
                        />
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-6">
                        Contentport
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <svg
                          className="w-6 h-6 text-green-400 mt-0.5 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <p className="text-gray-600">
                          Finds high-potential content ideas for you
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <svg
                          className="w-6 h-6 text-green-400 mt-0.5 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <p className="text-gray-600">
                          Trains AI on your recent & most successful tweets
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <svg
                          className="w-6 h-6 text-green-400 mt-0.5 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <p className="text-gray-600">
                          Creates content that sounds exactly like you
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <svg
                          className="w-6 h-6 text-green-400 mt-0.5 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <p className="text-gray-600">
                          Always uses the most modern AI models available
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <svg
                          className="w-6 h-6 text-green-400 mt-0.5 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <p className="text-gray-600">
                          Is 100% open-source, transparent & auditable
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="py-24">
            <div className="space-y-12">
              <h2 className="text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl text-center">
                <span className="relative text-indigo-600">
                  <span className="absolute z-0 bg-indigo-500/10 w-[105%] h-[105%] -left-[2.5%] -top-[2.5%] -rotate-1" />
                  Within 60 seconds:
                </span>
                <span className="block mt-8 text-gray-800 text-3xl sm:text-4xl space-y-2">
                  <span className="block opacity-60">draft a tweet.</span>
                  <span className="block opacity-80">add a beautiful visual.</span>
                  <span className="block opacity-100">queue for peak activity times.</span>
                </span>
              </h2>{' '}
              <div className="max-w-xs w-full mx-auto">
                <Link href="/sign-in">
                  <DuolingoButton className="w-full h-14 sm:px-8">
                    Try For Free →
                  </DuolingoButton>
                </Link>
              </div>
            </div>
          </section>

          <section className="py-24 bg-white">
            <div className="space-y-12">
              <div className="text-center max-w-3xl mx-auto">
                <h2 className="text-4xl text-balance font-semibold tracking-tight text-gray-900 sm:text-5xl">
                  Used by busy founders & content managers
                </h2>
              </div>
              <div className="mx-auto max-w-7xl px-6 lg:px-8 space-y-12">
                <TestimonialCard />
                <div
                  className="senja-embed block w-full"
                  data-id="72519276-9e16-4bc4-9911-49ffb12b73b4"
                  data-mode="shadow"
                  data-lazyload="false"
                ></div>
              </div>
            </div>
          </section>

          <section className="py-24">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="space-y-6">
                <div className="text-center max-w-3xl mx-auto">
                  <h2 className="text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
                    What you can achieve with Contentport{' '}
                    <span className="relative text-indigo-600">
                      <span className="absolute z-0 bg-indigo-500/10 w-[105%] h-[105%] -left-[2.5%] -top-[2.5%] -rotate-1" />
                      in just 7 days
                    </span>
                  </h2>
                </div>

                <div className="grid max-w-5xl mx-auto grid-cols-1 md:grid-cols-3 gap-4 pt-16">
                  <div>
                    <div className="px-8 py-3 bg-gray-800 text-white rounded-full text-sm font-medium mb-4 w-fit mx-auto">
                      Today
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl p-8 space-y-6">
                      <h3 className="text-xl font-semibold text-gray-900">
                        Start creating
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <svg
                            className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <p className="text-gray-600">Contentport learns your style</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <svg
                            className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <p className="text-gray-600">
                            Go from idea to ready-to-post tweets
                          </p>
                        </div>
                        <div className="flex items-start gap-3">
                          <svg
                            className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <p className="text-gray-600">
                            Queue 3+ days of content so you're instantly consistent
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="px-8 py-3 bg-gray-200 text-gray-600 rounded-full text-sm font-medium mb-4 w-fit mx-auto">
                      Day 3
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl p-8 space-y-6">
                      <h3 className="text-xl font-semibold text-gray-900">
                        Grow without losing focus
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <svg
                            className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <p className="text-gray-600">
                            Multiple posts lined up and scheduled
                          </p>
                        </div>
                        <div className="flex items-start gap-3">
                          <svg
                            className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <p className="text-gray-600">
                            You keep posting, even when you're busy coding
                          </p>
                        </div>
                        <div className="flex items-start gap-3">
                          <svg
                            className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <p className="text-gray-600">Engagement starts building</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="px-8 py-3 bg-gray-200 text-gray-600 rounded-full text-sm font-medium mb-4 w-fit mx-auto">
                      Day 7
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl p-8 space-y-6">
                      <h3 className="text-xl font-semibold text-gray-900">
                        Build a system
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <svg
                            className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <p className="text-gray-600">
                            Save 5+ hours per week on content creation{' '}
                          </p>
                        </div>
                        <div className="flex items-start gap-3">
                          <svg
                            className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <p className="text-gray-600">
                            Post consistently, even on busy days
                          </p>
                        </div>
                        <div className="flex items-start gap-3">
                          <svg
                            className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <p className="text-gray-600">Repeatable, proven workflow</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-16 text-center">
                  <div className="max-w-xs mx-auto">
                    <Link href="/sign-in">
                      <DuolingoButton className="w-full h-14 sm:px-8">
                        Start Building Your System →
                      </DuolingoButton>
                    </Link>
                  </div>
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

export default Page
