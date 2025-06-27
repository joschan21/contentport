import {
  DecoratorNode,
  DOMConversionMap,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  SerializedElementNode,
  SerializedTextNode,
  TextNode,
} from "lexical"

import { LinkNode } from "@lexical/link"

export type DiffNodeType = "addition" | "unchanged" | "deletion"

import { ElementNode } from "lexical"
import { ReactNode } from "react"
import { CodeBlockComponent } from "./code-highlight-plugin"

export class MentionNode extends TextNode {
  static getType(): string {
    return "mention"
  }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(node.__text, node.__key)
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config)
    element.spellcheck = false
    element.className = "mention-text"
    element.contentEditable = "false"
    element.setAttribute("data-lexical-mention", "true")
    return element
  }

  updateDOM(): false {
    return false
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

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: "mention",
    }
  }

  static importJSON(serializedNode: SerializedTextNode): MentionNode {
    const { text } = serializedNode
    return new MentionNode(text)
  }
}

export function $createMentionNode(text: string): MentionNode {
  return new MentionNode(text)
}

interface SerializedCodeNode extends SerializedElementNode {
  language: string
}

export class DecoratorCodeNode extends DecoratorNode<ReactNode> {
  __language: string

  constructor(language?: string, key?: string) {
    super(key)
    this.__language = language || "plain"
  }

  getLanguage(): string {
    return this.__language
  }

  updateDOM(
    _prevNode: unknown,
    _dom: HTMLElement,
    _config: EditorConfig
  ): boolean {
    return false
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement("div")
    dom.className = "my-custom-code"
    return dom
  }

  setLanguage(language: string | null | undefined): this {
    const writable = this.getWritable()
    writable.__language = language || "plain"
    return this
  }

  static clone(node: DecoratorCodeNode): DecoratorCodeNode {
    return new DecoratorCodeNode(node.__language, node.__key)
  }

  static getType(): string {
    return "code"
  }

  decorate(editor: LexicalEditor): ReactNode {
    return <CodeBlockComponent node={this} />
  }

  getChildren(): never[] {
    return []
  }

  exportJSON(): SerializedCodeNode {
    return {
      type: "code",
      version: 1,
      children: [],
      format: "",
      indent: 0,
      direction: null,
      language: this.__language,
    }
  }

  static importJSON(serializedNode: SerializedCodeNode): DecoratorCodeNode {
    const node = new DecoratorCodeNode(serializedNode.language)
    return node
  }
}

export function $createDecoratorCodeNode(text?: string): DecoratorCodeNode {
  return new DecoratorCodeNode(text)
}

export class InlineNode extends ElementNode {
  static getType(): string {
    return "inline-node"
  }

  static clone(node: InlineNode): InlineNode {
    return new InlineNode(node.__key)
  }

  constructor(key?: string) {
    super(key)
  }

  static getContentType(): string {
    return "block"
  }

  createDOM(): HTMLElement {
    const dom = document.createElement("span")
    dom.className = "inline-node"
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
    return { element: document.createElement("div") }
  }

  static importJSON(): InlineNode {
    const node = new InlineNode()
    // Set additional properties if needed
    return node
  }

  exportJSON(): SerializedElementNode {
    return {
      type: "el",
      version: 1,
      children: [],
      format: "",
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
    return "el"
  }

  static clone(node: ElNode): ElNode {
    return new ElNode(node.__key)
  }

  constructor(key?: string) {
    super(key)
  }

  static getContentType(): string {
    return "block"
  }

  createDOM(): HTMLElement {
    const dom = document.createElement("div")
    dom.className = "my-el-node"
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
    return { element: document.createElement("div") }
  }

  static importJSON(serializedNode: SerializedElementNode): ElNode {
    const node = new ElNode()
    // Set additional properties if needed
    return node
  }

  exportJSON(): SerializedElementNode {
    return {
      type: "el",
      version: 1,
      children: [],
      format: "",
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
    return "addition"
  }

  static clone(node: AdditionNode): AdditionNode {
    return new AdditionNode(node.__text, node.__id, node.__key)
  }

  createDOM(config: any): HTMLElement {
    const dom = super.createDOM(config)
    dom.classList.add("addition-node")
    if (this.__id) {
      dom.setAttribute("data-id", this.__id)
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
      type: "addition",
    }
  }

  static importJSON(serializedNode: SerializedAdditionNode): AdditionNode {
    const { text, id } = serializedNode
    return new AdditionNode(text, id)
  }
}

export class UnchangedNode extends TextNode {
  static getType(): string {
    return "unchanged"
  }

  static clone(node: UnchangedNode): UnchangedNode {
    return new UnchangedNode(node.__text, node.__key)
  }

  createDOM(config: any): HTMLElement {
    const dom = super.createDOM(config)
    dom.classList.add("unchanged-node")
    return dom
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: "unchanged",
    }
  }

  static importJSON(serializedNode: SerializedTextNode): UnchangedNode {
    const { text } = serializedNode
    return new UnchangedNode(text)
  }
}

export class DeletionNode extends TextNode {
  static getType(): string {
    return "deletion"
  }

  static clone(node: DeletionNode): DeletionNode {
    return new DeletionNode(node.__text, node.__key)
  }

  createDOM(config: any): HTMLElement {
    const dom = super.createDOM(config)
    dom.classList.add("deletion-node")
    return dom
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: "deletion",
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

export class UnprocessedNode extends TextNode {
  static getType(): string {
    return "unprocessed"
  }

  static clone(node: UnprocessedNode): UnprocessedNode {
    return new UnprocessedNode(node.__text, node.__key)
  }

  createDOM(config: any): HTMLElement {
    const dom = super.createDOM(config)
    dom.classList.add("unprocessed-node")
    return dom
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: "unprocessed",
    }
  }

  static importJSON(serializedNode: SerializedTextNode): UnprocessedNode {
    const { text } = serializedNode
    return new UnprocessedNode(text)
  }
}

export class AIEditNode extends TextNode {
  static getType(): string {
    return "ai-edit"
  }

  static clone(node: AIEditNode): AIEditNode {
    return new AIEditNode(node.__text, node.__key)
  }

  createDOM(config: any): HTMLElement {
    const dom = super.createDOM(config)
    dom.classList.add("ai-edit-node")
    return dom
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: "ai-edit",
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
    return "custom-link"
  }

  static clone(node: CustomLinkNode) {
    return new CustomLinkNode(node.__url, undefined, node.__key)
  }

  // static importJSON(): CustomLinkNode {
  //   const node = new CustomLinkNode(node)
  //   return node
  // }

  createDOM(config: EditorConfig) {
    const anchorElement = document.createElement("a")
    ;(anchorElement as HTMLAnchorElement).className = "custom-link"

    return anchorElement
  }
}

export class ReplacementNode extends TextNode {
  static getType(): string {
    return "replacement"
  }

  static clone(node: ReplacementNode): ReplacementNode {
    return new ReplacementNode(node.__text, node.__key)
  }

  createDOM(config: any): HTMLElement {
    const dom = super.createDOM(config)
    dom.classList.add("replacement-node")
    return dom
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: "replacement",
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
