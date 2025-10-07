import { Icons } from './icons'

export const LogoCloud = () => {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8">
      <h2 className="text-center text-base/7 text-gray-500">Trusted by teams at</h2>
      <div className="mx-auto mt-10 grid grid-cols-1 sm:grid-cols-2 max-w-lg items-center gap-x-8 gap-y-10 sm:max-w-xl sm:gap-x-10 lg:mx-0 lg:max-w-none md:grid-cols-5 grayscale opacity-50">
        <img
          alt="zerodotemail"
          src="/logo/zerodotemail.svg"
          width={158}
          height={48}
          className="max-h-12 w-full object-contain lg:col-span-1"
        />

        <img
          alt="Upstash"
          src="/logo/upstash.png"
          width={158}
          height={48}
          className="max-h-12 w-full object-contain lg:col-span-1 dark:hidden"
        />

        <img
          alt="v0"
          src="/logo/v0.svg"
          width={158}
          height={48}
          className="max-h-10 w-full object-contain lg:col-span-1"
        />

        <div className="flex justify-center w-full items-center">
          <div className="flex shrink-0 size-12 items-center justify-center rounded bg-stone-800">
            <Icons.context7 className="size-8" />
          </div>
          <span className="px-2 text-lg font-inter font-semibold leading-none text-stone-800">
            Context7
          </span>
        </div>

        <div className="w-full flex items-center justify-center">
          <Icons.databuddy className="size-12" />
        </div>
      </div>
    </div>
  )
}
