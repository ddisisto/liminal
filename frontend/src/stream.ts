/**
 * Token stream consumer. Takes an async iterable of tokens,
 * renders them into a block element with per-token animation.
 *
 * Currently mocks with a timer. Later: WebSocket reader with
 * the same interface.
 */

import type { TokenData } from './types'
import type { Timeline } from './timeline'
import { createTokenSpan, createCursor } from './token-renderer'

export interface StreamOptions {
  /** Tokens per second. Default 40. */
  tokensPerSecond?: number
  /** When aborted, remaining tokens render instantly (skip animation + pacing). */
  skipSignal?: AbortSignal
}

/**
 * Stream tokens into a block element with paced animation.
 * Returns when the stream is exhausted.
 */
export async function streamTokens(
  tokens: TokenData[],
  blockElement: HTMLElement,
  blockIndex: number,
  timeline: Timeline,
  options: StreamOptions = {},
): Promise<void> {
  const { tokensPerSecond = 40, skipSignal } = options

  const cursorEl = createCursor()
  blockElement.appendChild(cursorEl)

  let skipped = false

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    // If skip was requested, flush remaining tokens instantly
    if (!skipped && skipSignal?.aborted) {
      skipped = true
      for (let j = i; j < tokens.length; j++) {
        const t = tokens[j]
        const span = createTokenSpan(t, j)
        span.classList.remove('token--entering')
        blockElement.insertBefore(span, cursorEl)
        timeline.pushToken(blockIndex, t)
      }
      break
    }

    // Render token
    const span = createTokenSpan(token, i)
    blockElement.insertBefore(span, cursorEl)
    timeline.pushToken(blockIndex, token)

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
