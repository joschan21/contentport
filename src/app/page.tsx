import { Icons } from '@/components/icons'
import GitHubStarButton from '@/components/ui/github-star-button'
import { cn } from '@/lib/utils'
import MuxPlayer from '@mux/mux-player-react'
import { Menu } from 'lucide-react'
import Link from 'next/link'
import { Testimonials } from './_components/testimonials-lazy'
import { DuolingoAuthButtonServer } from './_components/duolingo-auth-button-server'

const Page = () => {
  return (
    <>
      <section className="bg-gray-100">
        <div className="relative max-w-7xl mx-auto">
          <header className="absolute inset-x-0 top-0 z-50">
            <nav
              aria-label="Global"
              className="flex items-center justify-between p-6 lg:px-8"
            >
              <div className="flex lg:flex-1">
                <a href="#" className="-m-1.5 p-1.5 flex items-center gap-1.5">
                  <Icons.logo className="size-5" />
                  <span className="font-medium">contentport</span>
                </a>
              </div>
              <div className="flex lg:hidden">
                <button
                  type="button"
                  className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
                >
                  <span className="sr-only">Open main menu</span>
                  <Menu aria-hidden="true" className="size-6" />
                </button>
              </div>
              <div className="hidden lg:flex gap-4 lg:flex-1 lg:justify-end">
                <div className="flex gap-2 items-center">
                  <GitHubStarButton
                    className="whitespace-nowrap"
                    repo="joschan21/contentport"
                  />

                  <DuolingoAuthButtonServer
                    childrenVariants={{
                      authenticated: 'Open Studio',
                      fallback: 'Get Started',
                    }}
                  />
                </div>
              </div>
            </nav>
          </header>
        </div>

        <div className="relative isolate pt-14">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
          >
            <div
              style={{
                clipPath:
                  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              }}
              className="relative left-[calc(50%-11rem)] aspect-1155/678 w-144.5 -translate-x-1/2 rotate-30 bg-linear-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-288.75"
            />
          </div>
          <div className="py-24 sm:pt-12 sm:pb-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="max-w-4xl mx-auto text-center">
                <div className="flex flex-col justify-center items-center">
                  <div className="flex items-center justify-center gap-2 text-sm/6 mb-4 py-1 px-4 rounded-full bg-gray-200/50 text-gray-800">
                    🎉 now open to everyone! 🎉
                  </div>
                  <h1 className="text-5xl font-semibold tracking-tight text-balance text-gray-900 sm:text-6xl">
                    The <span className="text-indigo-600">content engine </span> for
                    software companies
                  </h1>
                  <p className="mt-8 text-base text-pretty sm:text-xl/8 max-w-2xl">
                    <span className="opacity-60">Contentport helps technical teams </span>
                    <span className="opacity-100">
                      create, schedule & manage content
                    </span>{' '}
                    <span className="opacity-60">
                      at scale. Perfect for busy founders & content managers.
                    </span>
                  </p>

                  <div className="max-w-lg w-full mt-8 flex flex-col gap-4 items-center">
                    <div className="text-left w-full max-w-md sm:max-w-2xl space-y-3 sm:space-y-2 text-sm sm:text-base px-4 sm:px-0">
                      <div className="flex items-start gap-3 sm:gap-2 text-gray-500">
                        <span className="text-lg sm:text-base sm:mt-0">✅</span>
                        <p className="text-gray-800 leading-relaxed">
                          Turn ideas, company updates, or insights into content
                        </p>
                      </div>
                      <div className="flex items-start gap-3 sm:gap-2 text-gray-500">
                        <span className="text-lg sm:text-base sm:mt-0">✅</span>
                        <p className="text-gray-800 leading-relaxed">
                          Plan & schedule a week of content at once
                        </p>
                      </div>
                      <div className="flex items-start gap-3 sm:gap-2 text-gray-500">
                        <span className="text-lg sm:text-base sm:mt-0">✅</span>
                        <p className="text-gray-800 leading-relaxed">
                          Create beautiful visuals (no design skills needed)
                        </p>
                      </div>
                    </div>

                    <div className="flex mt-4 flex-col gap-2 max-w-sm w-full">
                      <DuolingoAuthButtonServer
                        className="w-full h-12 sm:px-8"
                        childrenVariants={{
                          fallback: 'Start Posting More →',
                        }}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-center gap-4">
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
                      <div className="flex flex-col items-start">
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
                        <p className="text-sm text-gray-600 ml-[4px]">
                          loved by 500+ founders
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
          >
            <div
              style={{
                clipPath:
                  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              }}
              className="relative left-[calc(50%+3rem)] aspect-1155/678 w-144.5 -translate-x-1/2 bg-linear-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-288.75"
            />
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto flex flex-col items-center max-w-3xl text-center mb-16">
            <h2 className="text-4xl text-balance font-semibold tracking-tight text-gray-900 sm:text-5xl mb-6">
              Great software doesn't sell itself.
            </h2>
            <p className="max-w-xl text-base text-pretty text-gray-500 sm:text-xl/8 text-center">
              A built-in AI assistant that helps you put your ideas into clear words
              people care about.
              {/* Contentport helps software teams turn ideas, updates, and insights into
              content that drives growth. */}
            </p>
          </div>

          <div className="relative flow-root">
            <img
              src="/images/demo.png"
              className="absolute -top-40 left-0 hidden xl:block"
            />
            <div className="relative flex items-center h-fit -m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-gray-900/10 ring-inset lg:-m-4 lg:rounded-2xl lg:p-4 shadow-2xl">
              <MuxPlayer
                accentColor="#4f46e5"
                style={{ aspectRatio: 16 / 9 }}
                className="w-full h-full overflow-hidden rounded-lg lg:rounded-xl shadow-lg"
                poster="https://image.mux.com/uJIhiNKoX00cm01QlSvoG1y2C9VCo4WljsCvBwVljCwe00/thumbnail.png?time=80"
                playbackId="uJIhiNKoX00cm01QlSvoG1y2C9VCo4WljsCvBwVljCwe00"
                playsInline
              />
            </div>

            <Testimonials />
          </div>
        </div>
      </section>

      {/* <section className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Everything you need to
              <br />
              <span className="text-indigo-600">dominate Twitter</span>
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600 max-w-xl mx-auto">
              Contentport helps you create authentic content that grows your audience
              while saving time and improving engagement.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-6xl">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-8">
              <div className="text-center">
                <div className="mx-auto mb-8 flex h-48 w-full max-w-sm items-center justify-center rounded-2xl bg-white border border-gray-200 shadow-sm">
                  <div className="flex flex-col items-center space-y-4 p-8">
                    <div className="flex items-center space-x-2">
                      <div className="h-8 w-8 rounded-lg bg-blue-500"></div>
                      <div className="text-xl font-bold">AI</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-6 w-6 rounded-full bg-red-500"></div>
                      <div className="h-6 w-6 rounded-full bg-yellow-500"></div>
                      <div className="h-6 w-6 rounded-full bg-green-500"></div>
                    </div>
                    <div className="text-sm text-gray-500">Voice Recognition</div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Voice-powered writing
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed max-w-xs mx-auto">
                  Speak naturally and watch your ideas transform into polished content
                  with advanced voice recognition.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto mb-8 flex h-48 w-full max-w-sm items-center justify-center rounded-2xl bg-white border border-gray-200 shadow-sm">
                  <div className="flex flex-col items-center space-y-4 p-8">
                    <div className="rounded-lg bg-gray-900 px-4 py-2 text-white text-sm font-medium">
                      Create content
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <div className="text-xs text-gray-500">Reply with AI</div>
                    </div>
                    <div className="flex space-x-1">
                      <div className="h-8 w-8 rounded bg-gray-200"></div>
                      <div className="h-8 w-8 rounded bg-gray-200"></div>
                      <div className="h-8 w-8 rounded bg-gray-200"></div>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Designed for simplicity
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed max-w-xs mx-auto">
                  Create, manage, and refine content easily, even without technical
                  skills.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto mb-8 flex h-48 w-full max-w-sm items-center justify-center rounded-2xl bg-white border border-gray-200 shadow-sm">
                  <div className="flex flex-col items-center space-y-4 p-8">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                        <svg
                          className="h-8 w-8 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-1 w-1 rounded-full bg-gray-400"></div>
                      ))}
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Engineered for security
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed max-w-xs mx-auto">
                  Enjoy peace of mind with robust encryption and strict compliance
                  standards.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section> */}
    </>
  )
}

export default Page
