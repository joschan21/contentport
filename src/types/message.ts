import { UIMessage, UserContent } from 'ai'

export type TestUIMessage = Omit<UIMessage, "content" | "parts" > & {
  content: UserContent
  metadata?: Record<string, any>
}
