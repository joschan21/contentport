import { z } from "zod"

export const tweet = z.object({
  id: z.string(),
  content: z.string(),
  suggestion: z.string().nullable(),
})

export type Tweet = z.infer<typeof tweet>
