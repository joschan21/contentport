import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical'
import { useEditor } from './use-editors'
import { useTweets } from './use-tweets'

export const useTweetNavigation = () => {
  const {
    tweets,
    setTweetId,
    queuedImprovements,
    setQueuedImprovements,
    showImprovementsInEditor,
  } = useTweets()

  const editor = useEditor('tweet-editor')

  const navigateToTweet = (navigateToId: string) => {
    setTweetId(navigateToId)

    const tweet = tweets.find((t) => t.id === navigateToId)
    if (!tweet) return console.warn('no tweet')

    if (!editor) return console.warn('no editor')

    editor.update(
      () => {
        const root = $getRoot()
        root.clear()

        const p = $createParagraphNode()
        const text = $createTextNode(tweet.content)
        p.append(text)

        root.append(p)
      },
      { tag: 'system-update' },
    )

    if (queuedImprovements[navigateToId]) {
      showImprovementsInEditor(navigateToId, queuedImprovements[navigateToId])
      setQueuedImprovements((prev) => {
        const { [navigateToId]: _, ...rest } = prev
        return rest
      })
    }
  }

  return { navigateToTweet }
}
