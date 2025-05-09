import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { $getRoot } from "lexical"
import { useEffect } from "react"

export const InitialContentPlugin = ({
  storageKey,
}: {
  storageKey: string
}) => {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    try {
      const storedValue = localStorage.getItem(storageKey)
      if (!storedValue) {
        editor.update(() => {
          const root = $getRoot()
          root.clear()
        })
        return
      }

      const parsedValue = JSON.parse(storedValue)
      const content = parsedValue?.content

      if (!content) {
        editor.update(() => {
          const root = $getRoot()
          root.clear()
        })
      } else {
        editor.update(() => {
          try {
            const editorState = editor.parseEditorState(content)
            if (editorState && !editorState.isEmpty()) {
              editor.setEditorState(editorState)
            } 
          } catch (e) {
            console.error("Error parsing editor state:", e)
          }
        })
      }
    } catch (e) {
      console.error("Error in InitialContentPlugin:", e)
    }
  }, [editor, storageKey])

  return null
}
