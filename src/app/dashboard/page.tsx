import { SiteHeader } from "@/components/side-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { DashboardSidebar } from "./dashboard-sidebar"
import { Dialog } from "@/components/ui/dialog"
import { redis } from "@/lib/redis"
import {headers as NextHeaders} from "next/headers"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LightbulbIcon } from "lucide-react"

interface Idea {
  title: string
  content: string
}

const Page = async () => {
  const headers = await NextHeaders()
  const session = await auth.api.getSession({headers})

  if(!session) redirect("/")

  const email = session.user.email
  const [cursor, keys] = await redis.scan(0, {
    match: `idea:${email}:*`,
    count: 100
  })

  const ideas = await Promise.all(
    keys.map(async (key) => {
      const idea = await redis.json.get<Idea>(key)
      return { key, ...idea }
    })
  )

  return (
    <Dialog>
      <SidebarProvider>
        <DashboardSidebar variant="sidebar" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                {ideas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="rounded-full bg-primary/10 p-3 mb-4">
                      <LightbulbIcon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">No ideas yet</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-2">
                      Your ideas will appear here. Start by creating your first idea to get started.
                    </p>
                  </div>
                ) : (
                  ideas.map((idea) => (
                    <div key={idea.key} className="p-4 rounded-lg border">
                      <h3 className="font-medium">{idea.title}</h3>
                      <p className="text-sm text-muted-foreground">{idea.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </Dialog>
  )
}

export default Page
