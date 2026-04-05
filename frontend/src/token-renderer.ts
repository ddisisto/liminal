/**
 * The atom: creates a per-token <span> with metadata and arrival animation.
 */

import type { TokenData } from './types'

/** Create a token span element with data attributes and fade-in animation. */
export function createTokenSpan(token: TokenData, position: number): HTMLSpanElement {
  const span = document.createElement('span')
  span.className = 'token token--entering'
  span.textContent = token.text
  span.dataset.position = String(position)
  span.dataset.logprob = String(token.logprob)
  span.dataset.entropy = String(token.entropy)
  span.dataset.surprisal = String(token.surprisal)

  // Trigger animation on next frame
  requestAnimationFrame(() => {
    span.classList.remove('token--entering')
  })

  return span
}

/** Create the blinking cursor element. */
export function createCursor(): HTMLSpanElement {
  const cursor = document.createElement('span')
  cursor.className = 'cursor'
  return cursor
}
