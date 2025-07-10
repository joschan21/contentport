import useTweetMetadata from '@/hooks/use-tweet-metdata'
import { useTweets } from '@/hooks/use-tweets'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot } from 'lexical'
import { useEffect, useRef } from 'react'

export function ShadowEditorSyncPlugin() {
  const [composerEditor] = useLexicalComposerContext()
  const { shadowEditor } = useTweets()
  const { setCharCount, setContent } = useTweetMetadata()
  const isInitialized = useRef(false)

  useEffect(() => {
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
          const content = editorState.read(() => $getRoot().getTextContent())
          setContent(content)
          setCharCount(editorState.read(() => $getRoot().getTextContent()).length)

          // setCurrentTweet((prev) => ({
          //   ...prev,
          //   content: editorState.read(() => $getRoot().getTextContent()),
          // }))

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
  }, [shadowEditor, composerEditor])

  return null
}
