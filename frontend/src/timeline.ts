/**
 * The conversation as a sequence of blocks.
 * Manages block creation, ordering, and the DOM container.
 */

import type { Block, BlockRole, TokenData } from './types'
import { createTokenSpan } from './token-renderer'

let nextId = 0

export class Timeline {
  readonly element: HTMLElement
  private blocks: Block[] = []

  constructor(container: HTMLElement) {
    this.element = container
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
    this.element.appendChild(element)

    const block: Block = {
      id: `block-${nextId++}`,
      role,
      tokens: [],
      element,
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
    } else {
      // Assistant turn — per-token spans, no animation class
      for (let i = 0; i < tokens.length; i++) {
        const span = createTokenSpan(tokens[i], i)
        // Skip animation — remove the entering class immediately
        span.classList.remove('token--entering')
        block.element.appendChild(span)
        block.tokens.push(tokens[i])
      }
    }
  }
}
