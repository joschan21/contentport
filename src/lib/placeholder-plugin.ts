import { useEffect } from "react"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { useLexicalIsTextContentEmpty } from "@lexical/react/useLexicalIsTextContentEmpty"
import { $getRoot } from "lexical"

export default function PlaceholderPlugin({
  placeholder = "Start typing..."
}: {
  placeholder?: string
}) {
  const [editor] = useLexicalComposerContext()
  const isEmpty = useLexicalIsTextContentEmpty(editor)

  useEffect(() => {
    const element = editor.getRootElement()
    if (!element) return

    const update = () => {
      if (isEmpty) {
        element.style.setProperty("--placeholder", `"${placeholder}"`)
        element.classList.add("show-placeholder")
      } else {
        element.classList.remove("show-placeholder")
      }
    }

    update()

    return editor.registerUpdateListener(() => {
      update()
    })
  }, [editor, isEmpty, placeholder])

  return null
}
