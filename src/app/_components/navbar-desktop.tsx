import GitHubStarButton from '@/components/ui/github-star-button'
import { DuolingoAuthButtonServer } from './duolingo-auth-button-server'

export function NavbarDesktop() {
  return (
    <div className="flex gap-4">
      <div className="flex gap-2 items-center">
        <GitHubStarButton className="whitespace-nowrap" repo="joschan21/contentport" />
        <DuolingoAuthButtonServer
          childrenVariants={{
            authenticated: 'Open Studio',
            fallback: 'Get Started',
          }}
        />
      </div>
    </div>
  )
}
