import LinkPreview from '@/components/tweet-editor/link-preview'
import { useTweetsV2 } from '@/hooks/use-tweets-v2'
import { AutoLinkNode } from '@lexical/link'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getNodeByKey } from 'lexical'
import { useEffect, useState } from 'react'

export const LinkPreviewPlugin = ({ tweetId }: { tweetId: string }) => {
  const [editor] = useLexicalComposerContext()
  const { tweets } = useTweetsV2()

  const [previewLinks, setPreviewLinks] = useState<{ url: string; dismissed: boolean }[]>(
    [],
  )

  useEffect(() => {
    const removeListener = editor.registerMutationListener(
      AutoLinkNode,
      (map) => {
        const payload: { url: string; dismissed: boolean }[] = []

        editor.read(() => {
          map.entries().forEach((entry) => {
            const [key, action] = entry
            const node = $getNodeByKey(key)

            if (node && action !== 'destroyed') {
              const url = node.getTextContent()
              payload.push({ url, dismissed: false })
            }
          })
        })

        setPreviewLinks(payload)
      },
      { skipInitialization: false },
    )

    return () => {
      removeListener()
    }
  }, [editor])

  const firstLink = previewLinks[0]
  const tweet = tweets.find((t) => t.id === tweetId)

  if (firstLink && !Boolean(tweet?.mediaFiles.length)) {
    return <LinkPreview url={firstLink.url} />
  }

  return null
}

// 'use client'

// import { useTweetsV2 } from '@/hooks/use-tweets-v2'
// import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
// import { $getRoot } from 'lexical'
// import { useEffect, useRef } from 'react'

// export function LinkPreviewPlugin({ tweetId }: { tweetId: string }) {
//   const [editor] = useLexicalComposerContext()
//   const { tweets, setPreviewLink, clearPreviewLinks } = useTweetsV2()

//   const currentTweet = tweets.find((t) => t.id === tweetId)
//   const currentPreviewLink = currentTweet?.previewLinks.find((link) => !link.dismissed)

//   useEffect(() => {
//     const checkForUrls = () => {
//       console.log('checking')
//       const content = editor.read(() => $getRoot().getTextContent()) || ''

//       const urlRegex =
//         /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi
//       const urls = content.match(urlRegex)

//       if (urls && urls.length > 0) {
//         const candidate = urls[0]
//         try {
//           new URL(candidate)

//           const isDismissed = currentTweet?.previewLinks.some(
//             (link) => link.url === candidate && link.dismissed,
//           )

//           if (isDismissed || candidate === currentPreviewLink?.url) {
//             return
//           }

//           setPreviewLink(tweetId, candidate)
//         } catch {
//           clearPreviewLinks(tweetId)
//         }
//       } else {
//         clearPreviewLinks(tweetId)
//       }
//     }

//     const unregister = editor.registerUpdateListener(({ tags }) => {
//       if (!tags.has('force-sync') && !tags.has('system-update')) {
//         checkForUrls()
//       }
//     })

//     return () => {
//       unregister()
//     }
//   }, [editor, tweetId, currentPreviewLink, currentTweet])

//   return null
// }

// export default LinkPreviewPlugin
