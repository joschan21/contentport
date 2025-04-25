export const ContextSidebar = () => {
  return <div className="w-80">stuff</div>
}

// import { Badge } from "@/components/ui/badge"

// import { AlertCircle, CheckCircle2, MessageSquare, Zap } from "lucide-react"
// import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader } from "../multi-sidebar-provider"


// interface ScoreCategory {
//   name: string
//   score: number
//   icon: React.ReactNode
//   color: string
// }

// const categories: ScoreCategory[] = [
//   {
//     name: "Correctness",
//     score: 92,
//     icon: <CheckCircle2 className="size-4" />,
//     color: "text-emerald-500",
//   },
//   {
//     name: "Clarity",
//     score: 88,
//     icon: <MessageSquare className="size-4" />,
//     color: "text-blue-500",
//   },
//   {
//     name: "Engagement",
//     score: 95,
//     icon: <Zap className="size-4" />,
//     color: "text-amber-500",
//   },
//   {
//     name: "Delivery",
//     score: 90,
//     icon: <AlertCircle className="size-4" />,
//     color: "text-purple-500",
//   },
// ]

// export function ContextSidebar({
//   ...props
// }: React.ComponentProps<typeof Sidebar>) {
//   const overallScore = Math.round(
//     categories.reduce((acc, cat) => acc + cat.score, 0) / categories.length
//   )

//   return (
//     <Sidebar {...props}>
//       <SidebarHeader className="border-b border-border/40 p-4">
//         <div className="flex items-center justify-between">
//           <h2 className="text-lg font-semibold">Writing Score</h2>
//           <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
//             <span className="text-xl font-bold">{overallScore}</span>
//           </div>
//         </div>
//       </SidebarHeader>
//       <SidebarContent className="p-4">
//         <SidebarGroup className="space-y-4">
//           {categories.map((category) => (
//             <div
//               key={category.name}
//               className="flex items-center justify-between"
//             >
//               <div className="flex items-center gap-2">
//                 <div className={category.color}>{category.icon}</div>
//                 <span className="text-sm font-medium">{category.name}</span>
//               </div>
//               <Badge variant="outline" className="font-mono">
//                 {category.score}
//               </Badge>
//             </div>
//           ))}
//         </SidebarGroup>
//       </SidebarContent>
//       <SidebarFooter className="border-t border-border/40 p-4">
//         <div className="text-xs text-muted-foreground">
//           Scores are calculated based on various writing metrics and best
//           practices.
//         </div>
//       </SidebarFooter>
//     </Sidebar>
//   )
// }
