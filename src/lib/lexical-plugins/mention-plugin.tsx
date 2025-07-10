import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  KEY_SPACE_COMMAND,
  $getRoot,
  LexicalNode,
} from 'lexical'
import { useEffect } from 'react'
import { MentionNode2 } from '../nodes'

function $isMentionNode2(node: any): node is MentionNode2 {
  return node instanceof MentionNode2
}

function $processMentionsInText(textNode: LexicalNode) {
  if (!$isTextNode(textNode) || $isMentionNode2(textNode)) return

  const text = textNode.getTextContent()
  const mentionPattern = /@[\w]+/g
  const matches = [...text.matchAll(mentionPattern)]

  if (matches.length === 0) return

  let currentOffset = 0
  const nodesToInsert: LexicalNode[] = []

  for (const match of matches) {
    const matchStart = match.index!
    const matchEnd = matchStart + match[0].length

    if (matchStart > currentOffset) {
      const beforeText = text.slice(currentOffset, matchStart)
      if (beforeText) {
        nodesToInsert.push($createTextNode(beforeText))
      }
    }

    const mentionText = match[0]
    nodesToInsert.push(new MentionNode2(mentionText))

    currentOffset = matchEnd
  }

  if (currentOffset < text.length) {
    const afterText = text.slice(currentOffset)
    if (afterText) {
      nodesToInsert.push($createTextNode(afterText))
    }
  }

  if (nodesToInsert.length > 0) {
    for (const node of nodesToInsert) {
      textNode.insertBefore(node)
    }
    textNode.remove()
  }
}

export default function MentionsPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const removeTextContentListener = editor.registerTextContentListener(() => {
      editor.update(() => {
        const selection = $getSelection()

        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode()
          if ($isTextNode(anchorNode) && !$isMentionNode2(anchorNode)) {
            const text = anchorNode.getTextContent()
            const offset = selection.anchor.offset
            const beforeCursor = text.slice(0, offset)

            if (beforeCursor.endsWith('@')) {
              anchorNode.setTextContent(beforeCursor.slice(0, -1))
              const mentionNode = new MentionNode2('@')
              anchorNode.insertAfter(mentionNode)
              selection.setTextNodeRange(mentionNode, 1, mentionNode, 1)
              return
            }
          }
        }

        const root = $getRoot()
        const allNodes = root.getAllTextNodes()

        for (const node of allNodes) {
          $processMentionsInText(node)
        }
      })
    })

    const removeSpaceListener = editor.registerCommand(
      KEY_SPACE_COMMAND,
      () => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return false

        const anchorNode = selection.anchor.getNode()

        if ($isMentionNode2(anchorNode)) {
          const offset = selection.anchor.offset
          const text = anchorNode.getTextContent()

          if (offset === text.length) {
            const spaceNode = $createTextNode(' ')
            anchorNode.insertAfter(spaceNode)
            selection.setTextNodeRange(spaceNode, 0, spaceNode, 1)
            return true
          } else {
            const beforeCursor = text.slice(0, offset)
            const afterCursor = text.slice(offset)

            anchorNode.setTextContent(beforeCursor)
            const textNode = $createTextNode(' ' + afterCursor)
            anchorNode.insertAfter(textNode)
            selection.setTextNodeRange(textNode, 0, textNode, 1)
            return true
          }
        }

        return false
      },
      3,
    )

    return () => {
      removeTextContentListener()
      removeSpaceListener()
    }
  }, [editor])

  return null
}
