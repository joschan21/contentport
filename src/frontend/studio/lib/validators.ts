import * as z from "zod"

export const TWITTER_HANDLE_VALIDATOR = z.object({
  handle: z
    .string()
    .min(1, { message: "Twitter handle is required" })
    .transform((val) => val.replace(/^@/, "")),
})

export type TwitterHandleForm = z.infer<typeof TWITTER_HANDLE_VALIDATOR>
