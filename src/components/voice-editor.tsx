'use client'

import { VoiceProvider } from '@/components/voice-context'
import {
  AdditionNode,
  DeletionNode,
  ElNode,
  InlineNode,
  UnchangedNode,
  UnprocessedNode,
} from '@/lib/nodes'
import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { DynamicIsland } from './dynamic-island'
import { TRANSFORMERS } from '@lexical/markdown'
import CodeActionMenuPlugin, { formatCode } from '@/lib/code-action-menu-plugin'
import { useState } from 'react'
import { CodeHighlightNode, CodeNode } from '@lexical/code'

export default function VoiceEditor() {
  const initialConfig = {
    namespace: 'voice-editor',
    theme: {
      paragraph: 'mb-1',
      text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline',
      },
      list: {
        ul: 'list-disc list-inside',
        ol: 'list-decimal list-inside',
        listitem: 'ml-2',
      },
      code: 'relative block w-full font-mono bg-stone-800 p-4 rounded-md',
      codeHighlight: {
        atrule: 'text-[#569cd6] bg-transparent',
        attr: 'text-[#9cdcfe] bg-transparent',
        boolean: 'text-[#569cd6] bg-transparent',
        builtin: 'text-[#4EC9B0] bg-transparent',
        cdata: 'text-[#d4d4d4] bg-transparent',
        char: 'text-[#ce9178] bg-transparent',
        class: 'text-[#4EC9B0] bg-transparent',
        'class-name': 'text-[#4EC9B0] bg-transparent',
        comment: 'text-[#6A9955] italic bg-transparent',
        constant: 'text-[#4FC1FF] bg-transparent',
        deleted: 'text-[#ce9178] bg-transparent',
        doctype: 'text-[#d4d4d4] bg-transparent',
        entity: 'text-[#d4d4d4] bg-transparent',
        function: 'text-[#DCDCAA] bg-transparent',
        important: 'text-[#569cd6] bg-transparent',
        inserted: 'text-[#b5cea8] bg-transparent',
        keyword: 'text-[#C586C0] bg-transparent',
        namespace: 'text-[#4EC9B0] bg-transparent',
        number: 'text-[#b5cea8] bg-transparent',
        operator: 'text-[#d4d4d4] bg-transparent',
        prolog: 'text-[#d4d4d4] bg-transparent',
        property: 'text-[#9cdcfe] bg-transparent',
        punctuation: 'text-[#d4d4d4] bg-transparent',
        regex: 'text-[#d16969] bg-transparent',
        selector: 'text-[#d7ba7d] bg-transparent',
        string: 'text-[#ce9178] bg-transparent',
        symbol: 'text-[#4EC9B0] bg-transparent',
        tag: 'text-[#569cd6] bg-transparent',
        url: 'text-[#9cdcfe] bg-transparent',
        variable: 'text-[#9CDCFE] bg-transparent',
      },
    },
    nodes: [
      ListNode,
      ListItemNode,
      CodeHighlightNode,

      HeadingNode,
      QuoteNode,
      HorizontalRuleNode,
      AdditionNode,
      DeletionNode,
      UnchangedNode,
      UnprocessedNode,
      InlineNode,
      ElNode,
    ],
    onError: (error: Error) => {
      console.error('[Lexical Editor Error]', error)
    },
    editable: true,
  }

  const [floatingAnchorElem, setFloatingAnchorElem] = useState<HTMLDivElement | null>(
    null,
  )

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem)
    }
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="editor-container relative">
        <PlainTextPlugin
          contentEditable={<ContentEditable />}
          ErrorBoundary={LexicalErrorBoundary}
        />
        {/* <MarkdownShortcutPlugin transformers={TRANSFORMERS} /> */}
        {/*  {floatingAnchorElem && (
          <CodeActionMenuPlugin anchorElem={floatingAnchorElem} />
        )} */}
        <HistoryPlugin />
        <ListPlugin />
        <MarkdownShortcutPlugin />
        <VoiceProvider>
          <DynamicIsland />
        </VoiceProvider>
      </div>
    </LexicalComposer>
  )
}
