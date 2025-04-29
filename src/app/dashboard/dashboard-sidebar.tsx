"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  ArrowUpCircleIcon,
  LightbulbIcon,
  MessageSquare,
  LogOut,
  X,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { authClient } from "@/lib/auth-client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export const DashboardSidebar = ({
  ...props
}: React.ComponentProps<typeof Sidebar>) => {
  const session = authClient.useSession()
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSignOut = async () => {
    await authClient.signOut()
    window.location.href = "/"
  }

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) return

    setIsSubmitting(true)
    try {
      // TODO: Implement feedback submission
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setFeedback("")
      setIsFeedbackOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <span className="text-base/6 tracking-tight font-medium">
                  contentport.
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive
              className="w-full h-12 justify-start gap-2"
            >
              <LightbulbIcon className="h-4 w-4" />
              <span>Ideas</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-border/40">
        <div className="flex flex-col gap-2">
          <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Feedback
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl/8 tracking-tight font-medium">
                  Your feedback/wishes/improvements
                </DialogTitle>
              </DialogHeader>
              <div>
                <textarea
                  autoFocus
                  className="w-full min-h-[120px] p-3 rounded-lg border border-stone-200 bg-white text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500/20 focus:border-stone-500"
                  placeholder="What's working well? What can I improve?"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsFeedbackOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitFeedback}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="mr-2">Submitting</span>
                      <span className="animate-spin">...</span>
                    </>
                  ) : (
                    "Submit"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full h-10 justify-start gap-2"
              >
                <Avatar className="h-4 w-4">
                  <AvatarImage
                    src={session?.data?.user.image ?? undefined}
                    alt="User"
                  />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <span>{session.data?.user.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
