import { cn } from '@/lib/utils'
import { marked } from 'marked'
import { memo, useId, useMemo } from 'react'
import ReactMarkdown, { Components } from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'

export type MarkdownProps = {
  children: string
  id?: string
  className?: string
  components?: Partial<Components>
}

function parseMarkdownIntoBlocks(markdown: string): string[] {
  if (markdown && typeof markdown === 'string') {
    const tokens = marked.lexer(markdown)
    return tokens.map((token) => token.raw)
  } else {
    return []
  }
}

function extractLanguage(className?: string): string {
  if (!className) return 'plaintext'
  const match = className.match(/language-(\w+)/)
  return match && match[1] ? match[1] : 'plaintext'
}

const INITIAL_COMPONENTS: Partial<Components> = {
  ul: function UlComponent({ children, ...props }) {
    return (
      <ul className="list-disc pl-4 -my-1" {...props}>
        {children}
      </ul>
    )
  },
  ol: function OlComponent({ children, ...props }) {
    return (
      <ol className="list-decimal pl-4">
        {children}
      </ol>
    )
  },
  li: function LiComponent({ children, ...props }) {
    return (
      <li className="ml-2 -my-1">
        {children}
      </li>
    )
  },
  a: function AComponent({ href, children, ...props }) {
    return (
      <a
        href={href}
        className="break-all underline underline-offset-2 transition-colors"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    )
  },
  br: () => <br />,
}

const MemoizedMarkdownBlock = memo(
  function MarkdownBlock({
    content,
    components = INITIAL_COMPONENTS,
  }: {
    content: string
    components?: Partial<Components>
  }) {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {content}
      </ReactMarkdown>
    )
  },
  function propsAreEqual(prevProps, nextProps) {
    return prevProps.content === nextProps.content
  },
)

MemoizedMarkdownBlock.displayName = 'MemoizedMarkdownBlock'

function MarkdownComponent({
  children,
  id,
  className,
  components = INITIAL_COMPONENTS,
}: MarkdownProps) {
  const generatedId = useId()
  const blockId = id ?? generatedId
  const blocks = useMemo(() => parseMarkdownIntoBlocks(children), [children])

  return (
    <div className={cn("whitespace-pre-wrap space-y-4",className)}>
      {blocks.map((block, index) => (
        <MemoizedMarkdownBlock
          key={`${blockId}-block-${index}`}
          content={block}
          components={components}
        />
      ))}
    </div>
  )
}

const Markdown = memo(MarkdownComponent)
Markdown.displayName = 'Markdown'

export { Markdown }
