import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import DuolingoButton from '@/components/ui/duolingo-button'
import { auth } from '@/lib/auth'
import MuxPlayer from '@mux/mux-player-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import Script from 'next/script'

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
            <div className="mx-auto max-w-7xl px-6 lg:px-8 space-y-20">
              <div className="max-w-4xl mx-auto text-center">
                <div className="flex flex-col justify-center items-center">
                  <h1 className="text-5xl font-semibold tracking-tight text-balance text-gray-900 sm:text-6xl">
                    Your <span className="text-indigo-600">content engine </span> for
                    growing on Twitter
                  </h1>
                  <p className="mt-8 text-gray-500 text-base text-pretty sm:text-xl/8 max-w-2xl">
                    <span className="">Contentport helps you </span>
                    <span className="text-black">
                      create, schedule & manage twitter content
                    </span>{' '}
                    <span className="">
                      at scale. Perfect for busy founders & content managers.
                    </span>
                  </p>

                  <div className="max-w-lg w-full mt-8 flex flex-col gap-4 items-center">
                    <div className="flex mt-4 flex-col gap-2 max-w-sm w-full">
                      {session?.user ? (
                        <Link href="/studio">
                          <DuolingoButton className="w-full h-12 sm:px-8">
                            Start Posting More →
                          </DuolingoButton>
                        </Link>
                      ) : (
                        <Link href="/login">
                          <DuolingoButton className="w-full h-12 sm:px-8">
                            Start Posting More →
                          </DuolingoButton>
                        </Link>
                      )}
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
                        <p className="text-base text-gray-600">
                          Trusted by{' '}
                          <span className="font-medium text-gray-900">1.140</span> founders
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative flex items-center h-fit -m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-gray-900/10 ring-inset lg:-m-4 lg:rounded-2xl lg:p-4 shadow-2xl">
                <MuxPlayer
                  accentColor="#4f46e5"
                  style={{ aspectRatio: 16 / 9 }}
                  className="w-full h-full overflow-hidden rounded-lg lg:rounded-xl shadow-lg"
                  poster="https://image.mux.com/01ddBxgG7W53ZCMZ02LLP692sLD4w009XzUtoCd00NcSBO8/thumbnail.png?time=10"
                  playbackId="01ddBxgG7W53ZCMZ02LLP692sLD4w009XzUtoCd00NcSBO8"
                  playsInline
                />
              </div>

              <>
                <Script
                  src="https://widget.senja.io/widget/72519276-9e16-4bc4-9911-49ffb12b73b4/platform.js"
                  type="text/javascript"
                  async
                ></Script>
                <div
                  className="senja-embed block w-full mt-20"
                  data-id="72519276-9e16-4bc4-9911-49ffb12b73b4"
                  data-mode="shadow"
                  data-lazyload="false"
                ></div>
              </>
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

      {/* <div className="text-left w-full max-w-md sm:max-w-2xl space-y-3 sm:space-y-2 text-sm sm:text-base px-4 sm:px-0">
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
                    </div> */}

      {/* <section className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto flex flex-col items-center max-w-3xl text-center mb-16">
            <h2 className="text-4xl text-balance font-semibold tracking-tight text-gray-900 sm:text-5xl mb-6">
              Create weeks worth of content at once
            </h2>
            <p className="max-w-xl text-base text-pretty text-gray-500 sm:text-xl/8 text-center">
              A built-in AI assistant that helps you put your ideas into clear words
              people care about.
              
            </p>
          </div>

          <div className="relative flow-root">
            <img
              src="/images/demo.png"
              className="absolute -top-40 left-0 hidden xl:block"
            />
          </div>
        </div>
      </section> */}
      <Footer />
    </>
  )
}

export default Page

// https://widget.senja.io/widget/3fae6f42-6a34-4da8-81f2-d3389606a704/platform.js
