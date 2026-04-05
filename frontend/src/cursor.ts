/**
 * The cursor is the user's reading position in the token stream.
 * It is the central state object — viewport, tip detection, attention
 * signal, and JIT triggering all derive from cursor position.
 */

export interface CursorPosition {
  /** Block index in the timeline. */
  blockIndex: number
  /** Token index within the block. */
  tokenIndex: number
}

type CursorListener = (position: CursorPosition, atTip: boolean) => void

export class Cursor {
  private position: CursorPosition = { blockIndex: 0, tokenIndex: 0 }
  private tipBlockIndex = 0
  private tipTokenIndex = 0
  private listeners: CursorListener[] = []

  /** Current cursor position. */
  get pos(): CursorPosition {
    return { ...this.position }
  }

  /** Is the cursor at the live edge of the conversation? */
  get atTip(): boolean {
    return (
      this.position.blockIndex === this.tipBlockIndex &&
      this.position.tokenIndex >= this.tipTokenIndex
    )
  }

  /** Update where the tip is (called as tokens stream in). */
  setTip(blockIndex: number, tokenIndex: number): void {
    this.tipBlockIndex = blockIndex
    this.tipTokenIndex = tokenIndex
  }

  /** Move cursor to a specific position. */
  moveTo(blockIndex: number, tokenIndex: number): void {
    this.position = { blockIndex, tokenIndex }
    this.emit()
  }

  /** Advance cursor to the tip (follow streaming, or jump to live edge). */
  moveToTip(): void {
    this.position = { blockIndex: this.tipBlockIndex, tokenIndex: this.tipTokenIndex }
    this.emit()
  }

  /** Move cursor to the tip without notifying listeners (no viewport scroll). */
  syncToTip(): void {
    this.position = { blockIndex: this.tipBlockIndex, tokenIndex: this.tipTokenIndex }
  }

  /** Advance cursor by one block (scroll-down between blocks). */
  advanceBlock(maxBlockIndex: number): boolean {
    if (this.position.blockIndex < maxBlockIndex) {
      this.position = { blockIndex: this.position.blockIndex + 1, tokenIndex: 0 }
      this.emit()
      return true
    }
    return false
  }

  /** Retreat cursor by one block (scroll-up between blocks). */
  retreatBlock(): boolean {
    if (this.position.blockIndex > 0) {
      this.position = { blockIndex: this.position.blockIndex - 1, tokenIndex: 0 }
      this.emit()
      return true
    }
    return false
  }

  /** Subscribe to cursor movement. */
  onChange(listener: CursorListener): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private emit(): void {
    const pos = this.pos
    const atTip = this.atTip
    for (const listener of this.listeners) {
      listener(pos, atTip)
    }
  }
}
