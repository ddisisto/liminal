/**
 * The document as a sequence of blocks.
 * Manages block creation, ordering, and the DOM container.
 */

import type { Block, BlockRole, TokenData } from './types'
import { createTokenSpan } from './token-renderer'
import { renderMarkdown } from './markdown'

/** Scale block font size by token count: short blocks are large, long blocks settle smaller. */
export function blockLengthScale(
  tokenCount: number, max: number, min: number, threshold = 200,
): number {
  if (tokenCount <= 0) return max
  const t = Math.min(1, Math.log2(1 + tokenCount) / Math.log2(1 + threshold))
  return max - (max - min) * t
}

// Block font-size range (rem)
const BLOCK_SCALE_MAX = 1.3
const BLOCK_SCALE_MIN = 0.85

function countFenceLines(text: string): number {
  let n = 0
  for (const line of text.split('\n')) {
    if (line.trimStart().startsWith('```')) n++
  }
  return n
}

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

  /** Remove all blocks and reset state. */
  clear(): void {
    this.element.innerHTML = ''
    this.blocks = []
    this._totalTokens = 0
    this.rawDomCache.clear()
  }

  /** Add a new block to the end of the timeline. Returns its index. */
  addBlock(role: BlockRole): { block: Block; index: number } {
    const element = document.createElement('div')
    element.className = `block block--${role}`
    element.style.fontSize = `calc(${BLOCK_SCALE_MAX}rem * var(--user-scale, 1))`
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
    this.scaleBlock(block)
  }

  /** Update a block's font size based on its token count. */
  scaleBlock(block: Block): void {
    const count = block.tokens.length || block.rawText.split(/\s+/).length
    const size = blockLengthScale(count, BLOCK_SCALE_MAX, BLOCK_SCALE_MIN)
    block.element.style.fontSize = `calc(${size}rem * var(--user-scale, 1))`
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

    // Anchor the block nearest viewport center so the toggle doesn't jump
    const anchor = this.findCenterBlock()
    let offsetBefore = 0
    if (anchor) {
      offsetBefore = anchor.element.getBoundingClientRect().top
    }

    this._rendered = rendered

    for (let i = 0; i < this.blocks.length; i++) {
      const block = this.blocks[i]
      if (rendered) {
        this.renderBlock(block, i)
      } else {
        this.restoreBlock(block)
      }
    }

    if (anchor) {
      const offsetAfter = anchor.element.getBoundingClientRect().top
      window.scrollBy(0, offsetAfter - offsetBefore)
    }
  }

  /** Find the block whose center is closest to the viewport center. */
  private findCenterBlock(): Block | undefined {
    const viewCenter = window.innerHeight / 2
    let best: Block | undefined
    let bestDist = Infinity
    for (const block of this.blocks) {
      const rect = block.element.getBoundingClientRect()
      const blockCenter = rect.top + rect.height / 2
      const dist = Math.abs(blockCenter - viewCenter)
      if (dist < bestDist) {
        bestDist = dist
        best = block
      }
    }
    return best
  }

  /**
   * If in rendered mode, convert a single block to markdown.
   * Call after a block finishes loading (buffered or streamed).
   */
  renderIfActive(blockIndex: number): void {
    const block = this.blocks[blockIndex]
    if (block && this._rendered) {
      this.renderBlock(block, blockIndex)
    }
  }

  private renderBlock(block: Block, blockIndex: number): void {
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
      // Triple-backtick fences can span block boundaries because the
      // paragraph splitter cuts on \n\n. Re-balance each block in
      // isolation by wrapping with synthetic fences when needed, so the
      // markdown renderer always sees a balanced segment.
      const startsInFence = this.blockStartsInFence(blockIndex)
      const fenceCount = countFenceLines(block.rawText)
      const endsInFence = startsInFence !== (fenceCount % 2 === 1)
      let text = block.rawText
      if (startsInFence) text = '```\n' + text
      if (endsInFence) text = text + '\n```'
      block.element.innerHTML = renderMarkdown(text)
    }
  }

  /** True if a fenced code block opened in a prior block is still open here. */
  private blockStartsInFence(blockIndex: number): boolean {
    let count = 0
    for (let i = 0; i < blockIndex; i++) {
      count += countFenceLines(this.blocks[i].rawText)
    }
    return count % 2 === 1
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
