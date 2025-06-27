import { useTweets } from '@/hooks/use-tweets'
import {
  LexicalComposerContext,
  LexicalComposerContextType,
} from '@lexical/react/LexicalComposerContext'
import { LexicalEditor } from 'lexical'
import { ReactNode, useMemo } from 'react'

export function ManualLexicalComposerProvider({ children }: { children: ReactNode }) {
  const { shadowEditor } = useTweets()
  // const context: LexicalComposerContextType = useMemo(() => {
  //   return [editor, {
  //     getTheme: () => undefined,
  //   }]
  // }, [editor])

  const getTheme = () => ({
    ltr: 'ltr',
    rtl: 'rtl',
    paragraph: 'editor-paragraph',
  })

  return (
    <LexicalComposerContext.Provider value={[shadowEditor, { getTheme }]}>
      {children}
    </LexicalComposerContext.Provider>
  )
}
