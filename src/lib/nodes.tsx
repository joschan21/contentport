import {
  $applyNodeReplacement,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedElementNode,
  SerializedTextNode,
  Spread,
  TextNode,
} from 'lexical'

import { LinkNode } from '@lexical/link'

export type DiffNodeType = 'addition' | 'unchanged' | 'deletion'

import { ElementNode } from 'lexical'

export class InlineNode extends ElementNode {
  static getType(): string {
    return 'inline-node'
  }

  static clone(node: InlineNode): InlineNode {
    return new InlineNode(node.__key)
  }

  constructor(key?: string) {
    super(key)
  }

  static getContentType(): string {
    return 'block'
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('span')
    dom.className = 'inline-node'
    return dom
  }

  updateDOM(): boolean {
    return false
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: () => ({
        conversion: () => ({
          node: new InlineNode(),
        }),
        priority: 1,
      }),
    }
  }

  exportDOM(): DOMExportOutput {
    return { element: document.createElement('div') }
  }

  static importJSON(): InlineNode {
    const node = new InlineNode()
    // Set additional properties if needed
    return node
  }

  exportJSON(): SerializedElementNode {
    return {
      type: 'el',
      version: 1,
      children: [],
      format: '',
      indent: 0,
      direction: null,
    }
  }

  isInline(): boolean {
    return true
  }
}

export class ElNode extends ElementNode {
  static getType(): string {
    return 'el'
  }

  static clone(node: ElNode): ElNode {
    return new ElNode(node.__key)
  }

  constructor(key?: string) {
    super(key)
  }

  static getContentType(): string {
    return 'block'
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('div')
    dom.className = 'my-el-node'
    return dom
  }

  updateDOM(): boolean {
    return false
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: () => ({
        conversion: () => ({
          node: new ElNode(),
        }),
        priority: 1,
      }),
    }
  }

  exportDOM(): DOMExportOutput {
    return { element: document.createElement('div') }
  }

  static importJSON(serializedNode: SerializedElementNode): ElNode {
    const node = new ElNode()
    // Set additional properties if needed
    return node
  }

  exportJSON(): SerializedElementNode {
    return {
      type: 'el',
      version: 1,
      children: [],
      format: '',
      indent: 0,
      direction: null,
    }
  }

  isInline(): boolean {
    return true
  }
}

// export class StreamingTextNode extends TextNode {
//   static getType(): string {
//     return "streaming-text"
//   }

//   static clone(node: StreamingTextNode): StreamingTextNode {
//     return new StreamingTextNode(node.__text, node.__key)
//   }

//   createDOM(config: any): HTMLElement {
//     const dom = super.createDOM(config)
//     dom.classList.add("streaming-text")
//     return dom
//   }
// }

interface SerializedAdditionNode extends SerializedTextNode {
  id?: string
}

export class AdditionNode extends TextNode {
  __id?: string

  constructor(text: string, id?: string, key?: string) {
    super(text, key)
    this.__id = id
  }

  static getType(): string {
    return 'addition'
  }

  static clone(node: AdditionNode): AdditionNode {
    return new AdditionNode(node.__text, node.__id, node.__key)
  }

  createDOM(config: any): HTMLElement {
    const dom = super.createDOM(config)
    dom.classList.add('addition-node')
    if (this.__id) {
      dom.setAttribute('data-id', this.__id)
    }
    return dom
  }

  getId(): string | undefined {
    return this.__id
  }

  setId(id: string): this {
    const writable = this.getWritable()
    writable.__id = id
    return writable
  }

  exportJSON(): SerializedAdditionNode {
    return {
      ...super.exportJSON(),
      id: this.__id,
      type: 'addition',
    }
  }

  static importJSON(serializedNode: SerializedAdditionNode): AdditionNode {
    const { text, id } = serializedNode
    return new AdditionNode(text, id)
  }
}

export class UnchangedNode extends TextNode {
  static getType(): string {
    return 'unchanged'
  }

  static clone(node: UnchangedNode): UnchangedNode {
    return new UnchangedNode(node.__text, node.__key)
  }

  createDOM(config: any): HTMLElement {
    const dom = super.createDOM(config)
    dom.classList.add('unchanged-node')
    return dom
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: 'unchanged',
    }
  }

  static importJSON(serializedNode: SerializedTextNode): UnchangedNode {
    const { text } = serializedNode
    return new UnchangedNode(text)
  }
}

export class DeletionNode extends TextNode {
  static getType(): string {
    return 'deletion'
  }

  static clone(node: DeletionNode): DeletionNode {
    return new DeletionNode(node.__text, node.__key)
  }

  createDOM(config: any): HTMLElement {
    const dom = super.createDOM(config)
    dom.classList.add('deletion-node')
    return dom
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: 'deletion',
    }
  }

  static importJSON(serializedNode: SerializedTextNode): DeletionNode {
    const { text } = serializedNode
    return new DeletionNode(text)
  }
}

// export class InlineNode extends TextNode {
//   static getType(): string {
//     return 'inline'
//   }

//   static clone(node: InlineNode): InlineNode {
//     return new InlineNode(node.__text, node.__key)
//   }

//   createDOM(config: any): HTMLElement {
//     const dom = super.createDOM(config)
//     dom.classList.add('inline-node')
//     return dom
//   }

//   append(...nodes: TextNode[]): this {
//     for (const node of nodes) {
//       this.insertAfter(node);
//     }
//     return this;
//   }
// }

export class MentionNode2 extends TextNode {
  static getType(): string {
    return 'mention2'
  }

  static clone(node: MentionNode2): MentionNode2 {
    return new MentionNode2(node.__text, node.__key)
  }

  createDOM(config: any): HTMLElement {
    const dom = super.createDOM(config)
    dom.classList.add('mention2-node')
    dom.setAttribute('data-mention', this.__text)
    return dom
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    const updated = super.updateDOM(prevNode, dom, config)
    if (prevNode.__text !== this.__text) {
      dom.setAttribute('data-mention', this.__text)
      return true
    }
    return updated
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: 'mention2',
    }
  }

  static importJSON(serializedNode: SerializedTextNode): MentionNode2 {
    const { text } = serializedNode
    return new MentionNode2(text)
  }
}

export class UnprocessedNode extends TextNode {
  static getType(): string {
    return 'unprocessed'
  }

  static clone(node: UnprocessedNode): UnprocessedNode {
    return new UnprocessedNode(node.__text, node.__key)
  }

  createDOM(config: any): HTMLElement {
    const dom = super.createDOM(config)
    dom.classList.add('unprocessed-node')
    return dom
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: 'unprocessed',
    }
  }

  static importJSON(serializedNode: SerializedTextNode): UnprocessedNode {
    const { text } = serializedNode
    return new UnprocessedNode(text)
  }
}

export type SerializedMentionNode = Spread<
  {
    mentionName: string
  },
  SerializedTextNode
>

export function $createMentionNode(
  mentionName: string,
  textContent?: string,
): MentionNode {
  const mentionNode = new MentionNode(mentionName, (textContent = mentionName))
  mentionNode.setMode('segmented').toggleDirectionless()
  return $applyNodeReplacement(mentionNode)
}

export function $isMentionNode(
  node: LexicalNode | null | undefined,
): node is MentionNode {
  return node instanceof MentionNode
}

function $convertMentionElement(domNode: HTMLElement): DOMConversionOutput | null {
  const textContent = domNode.textContent
  const mentionName = domNode.getAttribute('data-lexical-mention-name')

  if (textContent !== null) {
    const node = $createMentionNode(
      typeof mentionName === 'string' ? mentionName : textContent,
      textContent,
    )
    return {
      node,
    }
  }

  return null
}

const mentionStyle = 'background-color: rgba(24, 119, 232, 0.2)'

export class MentionNode extends TextNode {
  __mention: string

  static getType(): string {
    return 'mention'
  }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(node.__mention, node.__text, node.__key)
  }
  static importJSON(serializedNode: SerializedMentionNode): MentionNode {
    return $createMentionNode(serializedNode.mentionName).updateFromJSON(serializedNode)
  }

  constructor(mentionName: string, text?: string, key?: NodeKey) {
    super(text ?? mentionName, key)
    this.__mention = mentionName
  }

  exportJSON(): SerializedMentionNode {
    return {
      ...super.exportJSON(),
      mentionName: this.__mention,
    }
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config)
    dom.style.cssText = mentionStyle
    dom.className = 'mention'
    dom.spellcheck = false
    return dom
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('span')
    element.setAttribute('data-lexical-mention', 'true')
    if (this.__text !== this.__mention) {
      element.setAttribute('data-lexical-mention-name', this.__mention)
    }
    element.textContent = this.__text
    return { element }
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute('data-lexical-mention')) {
          return null
        }
        return {
          conversion: $convertMentionElement,
          priority: 1,
        }
      },
    }
  }

  isTextEntity(): true {
    return true
  }

  canInsertTextBefore(): boolean {
    return false
  }

  canInsertTextAfter(): boolean {
    return false
  }
}

export class AIEditNode extends TextNode {
  static getType(): string {
    return 'ai-edit'
  }

  static clone(node: AIEditNode): AIEditNode {
    return new AIEditNode(node.__text, node.__key)
  }

  createDOM(config: any): HTMLElement {
    const dom = super.createDOM(config)
    dom.classList.add('ai-edit-node')
    return dom
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: 'ai-edit',
    }
  }

  static importJSON(serializedNode: SerializedTextNode): AIEditNode {
    const { text } = serializedNode
    return new AIEditNode(text)
  }
}

export function $createAdditionNode(text: string): AdditionNode {
  return new AdditionNode(text)
}

export function $createUnchangedNode(text: string): UnchangedNode {
  return new UnchangedNode(text)
}

export function $createDeletionNode(text: string): DeletionNode {
  return new DeletionNode(text)
}

export function $createUnprocessedNode(text: string): UnprocessedNode {
  return new UnprocessedNode(text)
}

export function $createAIEditNode(text: string): AIEditNode {
  return new AIEditNode(text)
}

export function $createElNode(text: string): ElNode {
  return new ElNode(text)
}

// export function $createInlineNode(text: string): InlineNode {
//   return new InlineNode(text)
// }

export class CustomLinkNode extends LinkNode {
  url: string

  constructor(url: string, attributes?: any, key?: string) {
    super(url, attributes, key)
    this.url = url
  }

  static getType() {
    return 'custom-link'
  }

  static clone(node: CustomLinkNode) {
    return new CustomLinkNode(node.__url, undefined, node.__key)
  }

  // static importJSON(): CustomLinkNode {
  //   const node = new CustomLinkNode(node)
  //   return node
  // }

  createDOM(config: EditorConfig) {
    const anchorElement = document.createElement('a')
    ;(anchorElement as HTMLAnchorElement).className = 'custom-link'

    return anchorElement
  }
}

export class ReplacementNode extends TextNode {
  static getType(): string {
    return 'replacement'
  }

  static clone(node: ReplacementNode): ReplacementNode {
    return new ReplacementNode(node.__text, node.__key)
  }

  createDOM(config: any): HTMLElement {
    const dom = super.createDOM(config)
    dom.classList.add('replacement-node')
    return dom
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: 'replacement',
    }
  }

  static importJSON(serializedNode: SerializedTextNode): ReplacementNode {
    const { text } = serializedNode
    return new ReplacementNode(text)
  }
}

export function $createReplacementNode(text: string): ReplacementNode {
  return new ReplacementNode(text)
}
