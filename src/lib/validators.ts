import { z } from "zod"

export const tweet = z.object({
  id: z.string(),
  content: z.string(),
})

export type Tweet = z.infer<typeof tweet>
