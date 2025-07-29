'use client'

import * as React from 'react'
import { Icons } from '@/components/icons'
import { baseStyles, sizeStyles, variantStyles } from '@/components/ui/duolingo-button'
import GitHubStarButton from '@/components/ui/github-star-button'
import { cn } from '@/lib/utils'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { GITHUB_REPO } from '@/constants/misc'

const Logo = ({ className }: { className?: string }) => (
  <Link href="/" className={cn('-m-1.5 p-1.5 flex items-center gap-1.5', className)}>
    <Icons.logo className="size-5" />
    <span className="font-medium">contentport</span>
  </Link>
)

const ActionButtons = ({
  className,
  onLinkClick,
}: {
  className?: string
  onLinkClick?: () => void
}) => (
  <div className={cn('flex gap-2 items-center', className)}>
    <GitHubStarButton
      className={cn(
        'whitespace-nowrap',
        className?.includes('w-full') && 'w-full justify-center'
      )}
      repo={GITHUB_REPO}
    />
    <Link
      className={cn(
        baseStyles,
        variantStyles.primary,
        sizeStyles.sm,
        className?.includes('w-full') && 'w-full justify-center'
      )}
      href="/login"
      onClick={onLinkClick}
    >
      Get Started
    </Link>
  </div>
)

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

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
    <header className="absolute inset-x-0 top-0 z-50">
      <nav aria-label="Global" className="flex items-center justify-between p-6 lg:px-8">
        <div className="flex lg:flex-1">
          <Logo />
        </div>
        <div className="flex lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
          >
            <span className="sr-only">Open main menu</span>
            <Menu aria-hidden="true" className="size-6" />
          </button>
        </div>
        <div className="hidden lg:flex gap-4 lg:flex-1 lg:justify-end">
          <ActionButtons />
        </div>
      </nav>

      <div className={cn('lg:hidden', mobileMenuOpen ? 'fixed inset-0 z-50' : 'hidden')}>
        <div
          className="fixed inset-0 bg-black bg-opacity-25"
          onClick={() => setMobileMenuOpen(false)}
        />
        <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
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
              <div className="py-6 space-y-4">
                <ActionButtons
                  className="flex-col space-y-4 w-full"
                  onLinkClick={() => setMobileMenuOpen(false)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar
