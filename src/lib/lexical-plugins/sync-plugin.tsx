import useTweetMetadata from '@/hooks/use-tweet-metdata'
import { useTweetsV2 } from '@/hooks/use-tweets-v2'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot } from 'lexical'
import { useEffect, useRef } from 'react'

export function ShadowEditorSyncPlugin({ tweetId }: { tweetId: string }) {
  const [composerEditor] = useLexicalComposerContext()
  const { tweets } = useTweetsV2()
  const { setCharCount } = useTweetMetadata()
  const isInitialized = useRef(false)

  useEffect(() => {
    const shadowEditor = tweets.find((t) => t.id === tweetId)?.editor

    if (!shadowEditor || !composerEditor) return

    if (!isInitialized.current) {
      const shadowEditorState = shadowEditor.getEditorState()
      if (!shadowEditorState.isEmpty()) {
        const serializedState = shadowEditorState.toJSON()
        const parsedState = shadowEditor.parseEditorState(serializedState)
        composerEditor.setEditorState(parsedState)
      }

      isInitialized.current = true
    }

    const unregisterComposer = composerEditor.registerUpdateListener(
      ({ editorState, tags }) => {
        if (!tags?.has('sync-from-persistent')) {
          setCharCount(editorState.read(() => $getRoot().getTextContent()).length)

          shadowEditor.setEditorState(editorState)
        }
      },
    )

    const unregisterPersistent = shadowEditor.registerUpdateListener(
      ({ editorState, tags }) => {
        if (tags?.has('force-sync')) {
          const serializedState = editorState.toJSON()
          const parsedState = shadowEditor.parseEditorState(serializedState)

          composerEditor.update(
            () => {
              console.log('❌ SETTING BAD', tags, serializedState)
              composerEditor.setEditorState(parsedState)
            },
            { tag: 'sync-from-persistent' },
          )
        }
      },
    )

    return () => {
      unregisterComposer()
      unregisterPersistent()
    }
  }, [tweets, composerEditor])

  return null
}
