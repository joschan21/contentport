'use client'

import * as React from 'react'
import { Icons } from '@/components/icons'
import { baseStyles, sizeStyles, variantStyles } from '@/components/ui/duolingo-button'
import { cn } from '@/lib/utils'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { GITHUB_REPO } from '@/constants/misc'
import { authClient } from '@/lib/auth-client'

const Logo = ({ className }: { className?: string }) => (
  <Link href="/" className={cn('-m-1.5 p-1.5 flex items-center gap-1.5', className)}>
    <Icons.logo className="size-5" />
    <span>contentport</span>
  </Link>
)

const NavigationLinks = ({
  className,
  isAuthenticated,
}: {
  className?: string
  isAuthenticated: boolean
}) => (
  <div className={cn('flex justify-center items-center gap-6', className)}>
    <Link
      href={`https://github.com/${GITHUB_REPO}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-gray-700 w-fit hover:text-gray-900 transition-colors font-medium"
    >
      GitHub
    </Link>
  </div>
)

const PrimaryButton = ({
  className,
  onClick,
  isAuthenticated,
}: {
  className?: string
  onClick?: () => void
  isAuthenticated: boolean
}) => (
  <Link
    className={cn(
      baseStyles,
      variantStyles.primary,
      sizeStyles.sm,
      className?.includes('w-full') && 'w-full justify-center',
    )}
    href={isAuthenticated ? '/studio' : '/login'}
    onClick={onClick}
  >
    {isAuthenticated ? 'Studio' : 'Get Started'}
  </Link>
)

const Navbar = ({ title }: { title: string }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const { data: session } = authClient.useSession()
  const isAuthenticated = !!session?.session

  React.useEffect(() => {
    const originalOverflow = document.body.style.overflow

    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = originalOverflow
    }

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [mobileMenuOpen])

  return (
    <>
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[50] bg-black bg-opacity-50" />
      )}
      <header className="fixed inset-x-0 top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black border-opacity-[0.1] h-16">
        <nav className="max-w-7xl mx-auto h-full flex items-center px-6 lg:px-8">
          <div className="flex sm:flex-1">
            <Logo />
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
          <div className="hidden sm:flex items-center gap-8">
            <NavigationLinks isAuthenticated={isAuthenticated} />
            <PrimaryButton isAuthenticated={isAuthenticated} />
          </div>

          <div
            className={cn(
              'sm:hidden',
              mobileMenuOpen ? 'fixed inset-0 z-[100]' : 'hidden',
            )}
          >
            <div className="absolute top-0 inset-x-0 bg-white right-0 z-[100] w-full overflow-y-auto px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
              <div className="flex items-center justify-between">
                <Logo />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="-m-2.5 rounded-md p-2.5 text-gray-700"
                >
                  <span className="sr-only">Close menu</span>
                  <X aria-hidden="true" className="size-6" />
                </button>
              </div>
              <div className="mt-6 flow-root">
                <div className="-my-6 divide-y divide-gray-500/10">
                  <div className="py-6 space-y-6">
                    <NavigationLinks
                      className="flex justify-center sm:flex-col items-start gap-4"
                      isAuthenticated={isAuthenticated}
                    />
                    <PrimaryButton
                      className="w-full"
                      onClick={() => setMobileMenuOpen(false)}
                      isAuthenticated={isAuthenticated}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </header>
    </>
  )
}

export default Navbar
