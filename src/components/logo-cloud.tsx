import { Icons } from './icons'

const logos = [
  {
    name: 'v0',
    url: 'https://v0.app',
    type: 'custom' as const,
    render: () => <Icons.v0 className="h-14" />,
  },
  {
    name: 'Upstash',
    url: 'https://upstash.com',
    type: 'image' as const,
    src: '/logo/upstash.png',
  },
  {
    name: 'Vercel',
    url: 'https://vercel.com',
    type: 'icon' as const,
    Icon: Icons.vercel,
  },
  {
    name: 'Context7',
    url: 'https://context7.com',
    type: 'custom' as const,
    render: () => (
      <>
        <div className="flex shrink-0 size-10 items-center justify-center rounded bg-stone-800 transition-all group-hover:scale-110">
          <Icons.context7 className="size-7" />
        </div>
        <span className="px-2 text-lg sm:text-2xl font-inter font-semibold leading-none text-stone-800 transition-all group-hover:text-stone-950">
          Context7
        </span>
      </>
    ),
  },
  {
    name: 'Encore',
    url: 'https://encore.dev',
    type: 'icon' as const,
    Icon: Icons.encore,
  },
]

export const LogoCloud = () => {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8">
      <h2 className="text-center text-base/7 text-gray-500">Used by teams at</h2>
      <div className="mx-auto mt-10 grid grid-cols-2 max-w-lg items-center gap-8 sm:gap-8 sm:max-w-xl lg:mx-0 lg:max-w-none lg:grid-cols-5 lg:gap-10">
        {logos.map((logo) => (
          <a
            key={logo.name}
            href={logo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-center w-full h-16 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300 ease-in-out hover:scale-105"
          >
            {logo.type === 'image' && (
              <img
                alt={logo.name}
                src={logo.src}
                className="max-h-12 w-full object-contain"
              />
            )}
            {logo.type === 'icon' && logo.Icon && <logo.Icon className="h-8 w-auto" />}
            {logo.type === 'custom' && logo.render && (
              <div className="flex items-center justify-center w-full">
                {logo.render()}
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}
