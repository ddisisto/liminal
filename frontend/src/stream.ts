/**
 * Token stream consumer. Takes an async iterable of tokens,
 * renders them into a block element, and advances the cursor.
 *
 * Currently mocks with a timer. Later: WebSocket reader with
 * the same interface.
 */

import type { TokenData } from './types'
import type { Cursor } from './cursor'
import { createTokenSpan, createCursor } from './token-renderer'
import { measure } from './measurement'

export interface StreamOptions {
  /** Tokens per second. Default 40. */
  tokensPerSecond?: number
  /** Called after each token with measurement info. */
  onToken?: (index: number, total: number, lineCount: number, height: number) => void
}

/**
 * Stream tokens into a block element, advancing the cursor as tokens arrive.
 * Returns when the stream is exhausted.
 */
export async function streamTokens(
  tokens: TokenData[],
  blockElement: HTMLElement,
  cursor: Cursor,
  blockIndex: number,
  options: StreamOptions = {},
): Promise<void> {
  const { tokensPerSecond = 40, onToken } = options

  const cursorEl = createCursor()
  blockElement.appendChild(cursorEl)

  let fullText = ''

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    fullText += token.text

    // Render token
    const span = createTokenSpan(token, i)
    blockElement.insertBefore(span, cursorEl)

    // Advance tip and cursor (if following)
    const wasAtTip = cursor.atTip
    cursor.setTip(blockIndex, i)
    if (wasAtTip) {
      cursor.moveToTip()
    }

    // Measure
    if (onToken) {
      const maxWidth = blockElement.clientWidth
      const { layout } = measure(fullText, maxWidth)
      onToken(i, tokens.length, layout.lineCount, layout.height)
    }

    // Pace
    await sleep(1000 / tokensPerSecond)
  }

  cursorEl.remove()
}

/** Create a mock async token source from an array. */
export function mockTokens(text: string): TokenData[] {
  return text.split(/(?<=\s)/).map(word => ({
    text: word,
    logprob: -(Math.random() * 4 + 0.2),
    entropy: Math.random() * 5 + 0.5,
    surprisal: Math.random() * 4 + 0.2,
  }))
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
