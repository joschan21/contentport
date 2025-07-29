import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { DuolingoAuthButtonServer } from './duolingo-auth-button-server'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import GitHubStarButton from '@/components/ui/github-star-button'

export function NavbarMobile() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent className="p-5">
        <SheetHeader>
          <SheetTitle>Welcome to Contentport!</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4">
          <DuolingoAuthButtonServer
            childrenVariants={{ fallback: 'Get Started' }}
            reflectAuth
          />
          <GitHubStarButton className="whitespace-nowrap" repo="joschan21/contentport" />
        </div>
      </SheetContent>
    </Sheet>
  )
}
