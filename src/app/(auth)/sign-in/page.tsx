'use client'

import { Icons } from '@/components/icons'
import { SignInForm } from './sign-in-form'

const SignInPage = () => {
  return (
    <div className="grid min-h-svh bg-gray-50 lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            <SignInForm />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:flex items-center justify-center">
        <div className="max-w-lg mx-auto">
          <div className="flex flex-col">
            <Icons.upstash className="w-32 h-20 self-start" />

            <figure className="mt-5 flex flex-auto flex-col justify-between">
              <blockquote className="text-lg/8 text-gray-900">
                <p>
                  “I've tried a lot of online image editing tools, but Contentport easily
                  has the best one I've used for making beautiful Twitter visuals. It's
                  also ridiculously simple to use. The topic monitor makes it super easy
                  to see how people feel about your product. I genuinely use both of these
                  features almost every day for Context7 and Upstash.”
                </p>
              </blockquote>
              <figcaption className="mt-10 flex items-center gap-x-3">
                <img
                  alt=""
                  src="/images/user/abdush_128.jpg"
                  className="relative -rotate-2 ring-3 ring-neutral-100 shadow-lg z-20 inline-block size-12 rounded-xl outline -outline-offset-1 outline-black/5"
                />
                {/* <img
                  alt=""
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  className="size-14 rounded-full bg-gray-50"
                /> */}
                <div className="text-base flex flex-col gap-1">
                  <a
                    href="https://x.com/abdushbag"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold hover:underline text-gray-900 leading-none"
                  >
                    Abdullah Enes <span className='hover:underline font-normal text-gray-500'>@abdushbag</span>
                  </a>
                  <div className="mt-1 text-gray-500 leading-none">
                    Engineer at Context7 (30,000+ GitHub stars)
                  </div>
                </div>
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignInPage
