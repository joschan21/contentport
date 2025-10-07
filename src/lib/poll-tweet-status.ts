import { client } from "./client";

export const pollTweetStatus = async (
  messageId: string,
  options: { timeout?: number; interval?: number } = {},
): Promise<{ twitterId: string }> => {
  const { timeout = 10000, interval = 250 } = options

  return new Promise((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await client.tweet.post_status.$get({ messageId })
        const result = await res.json()

        if (result.isPublished && result.twitterId && !result.isError) {
          clearInterval(pollInterval)
          resolve({ twitterId: result.twitterId })
        } else if (result.isError) {
          clearInterval(pollInterval)
          reject(new Error(result.errorMessage ?? 'Failed to post tweet'))
        }
      } catch (err) {
        clearInterval(pollInterval)
        reject(err)
      }
    }, interval)

    // Set timeout
    const timeoutId = setTimeout(() => {
      clearInterval(pollInterval)
      reject(
        new Error(
          'Twitter is taking longer than usual to respond. We will keep trying, see current status in your posted tweets dashboard.',
        ),
      )
    }, timeout)

    // Clean up timeout when promise resolves/rejects
    const originalResolve = resolve
    const originalReject = reject
    resolve = (value) => {
      clearTimeout(timeoutId)
      originalResolve(value)
    }
    reject = (error) => {
      clearTimeout(timeoutId)
      originalReject(error)
    }
  })
}
