/**
 * The conversation as a sequence of blocks.
 * Manages block creation, ordering, and the DOM container.
 */

import type { Block, BlockRole, TokenData } from './types'
import { createTokenSpan } from './token-renderer'
import { renderMarkdown } from './markdown'

/** Log-curve scale: max at 0 tokens, approaching min at threshold. */
export function contextScale(
  totalTokens: number, max: number, min: number, threshold = 2000,
): number {
  if (totalTokens <= 0) return max
  const t = Math.min(1, Math.log2(1 + totalTokens) / Math.log2(1 + threshold))
  return max - (max - min) * t
}

// Block font-size range (rem)
const BLOCK_SCALE_MAX = 1.3
const BLOCK_SCALE_MIN = 0.85

let nextId = 0

export class Timeline {
  readonly element: HTMLElement
  private blocks: Block[] = []
  private _totalTokens = 0

  constructor(container: HTMLElement) {
    this.element = container
  }

  /** Cumulative token count across all blocks. */
  get totalTokens(): number {
    return this._totalTokens
  }

  /** All blocks in order. */
  get allBlocks(): readonly Block[] {
    return this.blocks
  }

  /** Number of blocks. */
  get length(): number {
    return this.blocks.length
  }

  /** Add a new block to the end of the timeline. Returns its index. */
  addBlock(role: BlockRole): { block: Block; index: number } {
    const element = document.createElement('div')
    element.className = `block block--${role}`
    const baseSize = contextScale(this._totalTokens, BLOCK_SCALE_MAX, BLOCK_SCALE_MIN)
    element.style.fontSize = `calc(${baseSize}rem * var(--user-scale, 1))`
    if (this._rendered) element.classList.add('block--rendered')
    this.element.appendChild(element)

    const block: Block = {
      id: `block-${nextId++}`,
      role,
      tokens: [],
      element,
      rawText: '',
    }

    this.blocks.push(block)
    return { block, index: this.blocks.length - 1 }
  }

  /** Get a block by index. */
  getBlock(index: number): Block | undefined {
    return this.blocks[index]
  }

  /** Record that a token was added to a block. */
  pushToken(blockIndex: number, token: TokenData): void {
    const block = this.blocks[blockIndex]
    if (block) {
      block.tokens.push(token)
      block.rawText += token.text
      this._totalTokens++
    }
  }

  /**
   * Render a block's content instantly (buffered/history mode).
   * Creates per-token spans with data attributes but no animation.
   * For user blocks with plain text, renders as textContent.
   */
  renderBuffered(blockIndex: number, tokens: TokenData[], text?: string): void {
    const block = this.blocks[blockIndex]
    if (!block) return

    if (text && tokens.length === 0) {
      // User turn — plain text
      block.element.textContent = text
      block.rawText = text
    } else {
      // Assistant turn — per-token spans, no animation class
      for (let i = 0; i < tokens.length; i++) {
        const span = createTokenSpan(tokens[i], i)
        span.classList.remove('token--entering')
        block.element.appendChild(span)
        block.tokens.push(tokens[i])
      }
      this._totalTokens += tokens.length
      block.rawText = tokens.map(t => t.text).join('')
    }
  }

  /** Current render mode. */
  get rendered(): boolean {
    return this._rendered
  }
  private _rendered = true

  /** Cache of token-span DOM per block, so we can toggle back without rebuilding. */
  private rawDomCache = new Map<string, DocumentFragment>()

  /** Toggle all blocks between raw token spans and rendered markdown. */
  setRendered(rendered: boolean): void {
    if (rendered === this._rendered) return
    this._rendered = rendered

    for (const block of this.blocks) {
      if (rendered) {
        this.renderBlock(block)
      } else {
        this.restoreBlock(block)
      }
    }
  }

  /**
   * If in rendered mode, convert a single block to markdown.
   * Call after a block finishes loading (buffered or streamed).
   */
  renderIfActive(blockIndex: number): void {
    const block = this.blocks[blockIndex]
    if (block && this._rendered) {
      this.renderBlock(block)
    }
  }

  private renderBlock(block: Block): void {
    // Save current token-span DOM
    const frag = document.createDocumentFragment()
    while (block.element.firstChild) {
      frag.appendChild(block.element.firstChild)
    }
    this.rawDomCache.set(block.id, frag)
    block.element.classList.add('block--rendered')
    if (block.role === 'user') {
      block.element.textContent = block.rawText
    } else {
      block.element.innerHTML = renderMarkdown(block.rawText)
    }
  }

  private restoreBlock(block: Block): void {
    const frag = this.rawDomCache.get(block.id)
    if (frag) {
      block.element.innerHTML = ''
      block.element.appendChild(frag)
      this.rawDomCache.delete(block.id)
    }
    block.element.classList.remove('block--rendered')
  }
}
