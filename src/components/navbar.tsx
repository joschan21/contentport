'use client'

import { Icons } from '@/components/icons'
import DuolingoButton from '@/components/ui/duolingo-button'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

const Navbar = ({ title }: { title: string }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const { data: session } = authClient.useSession()
  const isAuthenticated = Boolean(session?.session)

  React.useEffect(() => {
    const originalOverflow = document.body.style.overflow
    const originalPointerEvents = document.body.style.pointerEvents

    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = originalOverflow
      document.body.style.pointerEvents = originalPointerEvents || ''
    }

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.pointerEvents = originalPointerEvents || ''
    }
  }, [mobileMenuOpen])

  return (
    <>
      {mobileMenuOpen && <div className="fixed inset-0 z-[50] bg-black bg-opacity-50" />}
      <header className="fixed inset-x-0 top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black border-opacity-[0.1] h-16">
        <nav className="max-w-7xl mx-auto h-full flex items-center px-6 lg:px-8">
          <div className="flex sm:flex-1">
            <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-1.5">
              <Icons.logo className="size-5" />
              <span className="font-medium">Contentport</span>
            </Link>
          </div>
          <div className="hidden sm:flex items-center gap-6 h-full">
            <Link
              href="/pricing"
              className="text-sm px-4 group/pricing flex items-center font-medium h-full text-gray-700 hover:text-gray-900 transition-colors"
            >
              <p className="group-hover/pricing:text-gray-900 group-hover/pricing:underline">
                Pricing
              </p>
            </Link>
          </div>
          <div className="flex ml-auto sm:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
            >
              <span className="sr-only">Open main menu</span>
              <Menu aria-hidden="true" className="size-6" />
            </button>
          </div>
          <div className="hidden sm:flex items-center h-full">
            {!isAuthenticated ? (
              <Link
                href="/sign-in"
                className="text-sm px-4 group/sign-in flex items-center font-medium h-full text-gray-700 hover:text-gray-900 transition-colors"
              >
                <p className="group-hover/sign-in:text-gray-900 group-hover/sign-in:underline">
                  Sign In
                </p>
              </Link>
            ) : null}
            {isAuthenticated ? (
              <Link href="/studio" className="h-full flex items-center px-2">
                <DuolingoButton size="sm" className="whitespace-nowrap">
                  Dashboard
                </DuolingoButton>
              </Link>
            ) : (
              <Link href="/sign-up" className="h-full flex items-center px-2">
                <DuolingoButton size="sm" className="whitespace-nowrap">
                  Get Started
                </DuolingoButton>
              </Link>
            )}
          </div>

          <div
            className={cn(
              'sm:hidden',
              mobileMenuOpen ? 'fixed inset-0 z-[100]' : 'hidden',
            )}
          >
            <div className="absolute top-0 inset-x-0 bg-white right-0 z-[100] w-full overflow-y-auto px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
              <div className="flex items-center justify-between">
                <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-1.5">
                  <Icons.logo className="size-5" />
                  <span className="font-medium">Contentport</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="-m-2.5 rounded-md p-2.5 text-gray-700"
                >
                  <span className="sr-only">Close menu</span>
                  <X aria-hidden="true" className="size-6" />
                </button>
              </div>
              <div className="py-6">
                <Link
                  href="/pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="-mx-3 block rounded-lg px-3 py-4 text-base font-medium text-gray-900"
                >
                  Pricing
                </Link>
                {!isAuthenticated ? (
                  <Link
                    href="/sign-in"
                    onClick={() => setMobileMenuOpen(false)}
                    className="-mx-3 block rounded-lg px-3 py-4 text-base font-medium text-gray-900"
                  >
                    Sign In
                  </Link>
                ) : null}

                {isAuthenticated ? (
                  <Link href="/studio" className="block pt-4">
                    <DuolingoButton size="sm" className="whitespace-nowrap">
                      Dashboard
                    </DuolingoButton>
                  </Link>
                ) : (
                  <Link href="/sign-up" className="block pt-4">
                    <DuolingoButton size="sm" className="whitespace-nowrap">
                      Get Started
                    </DuolingoButton>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </nav>
      </header>
    </>
  )
}

export default Navbar
