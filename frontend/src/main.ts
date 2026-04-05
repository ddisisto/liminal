/**
 * Liminal UX PoC — main entry point.
 *
 * Three modes of content:
 * 1. Buffered — history/initial load, rendered instantly
 * 2. Streaming — live edge, per-token animation
 * 3. (Future) Pre-fetched — buffered client-side, rendered with animation
 *
 * Initial load renders ~2 pages of buffered content.
 * Then each scroll-down-at-tip streams one paragraph (one pull = one turn).
 */

import { Cursor } from './cursor'
import { Timeline } from './timeline'
import { Viewport } from './viewport'
import { InputArea } from './input'
import { streamTokens } from './stream'
import { MOCK_CONVERSATION, type MockTurn } from './mock'

/** How many turns to render as buffered content on initial load. */
const INITIAL_BUFFER_TURNS = 3

async function main() {
  await document.fonts.ready

  const timelineEl = document.getElementById('timeline')!
  const statusEl = document.getElementById('status')!
  const toggleBtn = document.getElementById('render-toggle')!

  const cursor = new Cursor()
  const timeline = new Timeline(timelineEl)

  toggleBtn.addEventListener('click', () => {
    const next = !timeline.rendered
    timeline.setRendered(next)
    toggleBtn.textContent = next ? 'rendered' : 'raw'
  })
  const viewport = new Viewport(document.documentElement, timeline)
  const input = new InputArea()
  input.mount(document.body)

  input.onSubmitHandler((text) => {
    const { block, index } = timeline.addBlock('user')
    block.element.textContent = text
    block.rawText = text
    cursor.setTip(index, 0)
    cursor.moveToTip()
  })

  cursor.onChange((pos, atTip) => {
    viewport.onCursorMove(pos, atTip)
  })

  const turns = MOCK_CONVERSATION
  let nextTurn = 0

  // Phase 1: Render initial buffer instantly
  const bufferEnd = Math.min(INITIAL_BUFFER_TURNS, turns.length)
  for (let i = 0; i < bufferEnd; i++) {
    const turn = turns[i]
    const { index } = timeline.addBlock(turn.role)
    timeline.renderBuffered(index, turn.tokens, turn.text)
    timeline.renderIfActive(index)
    cursor.setTip(index, Math.max(0, turn.tokens.length - 1))
    nextTurn++
  }
  cursor.moveToTip()

  statusEl.textContent =
    `${bufferEnd} turns buffered | ` +
    `${turns.length - nextTurn} remaining | ` +
    `scroll down at tip to continue`

  // Phase 2: JIT pull loop — one scroll-down = one turn streamed
  // A tip-pull during streaming skips the active animation (renders remaining
  // tokens instantly) AND triggers the next turn as usual.
  let skipController: AbortController | null = null

  while (nextTurn < turns.length) {
    await waitForTipPull(viewport, cursor)

    const turn = turns[nextTurn]
    const { block, index } = timeline.addBlock(turn.role)

    if (turn.role === 'user' && turn.text) {
      block.element.textContent = turn.text
      block.rawText = turn.text
      timeline.renderIfActive(index)
      cursor.setTip(index, 0)
      cursor.moveToTip()

    } else {
      // Wire up skip: a tip-pull during streaming aborts the current animation
      skipController = new AbortController()
      const unsub = viewport.onTipPull(() => {
        skipController?.abort()
      })

      // Stream one paragraph — this is the live edge
      await streamTokens(turn.tokens, block.element, cursor, index, timeline, {
        tokensPerSecond: 60,
        skipSignal: skipController.signal,
        onToken: (i, total, lineCount) => {
          statusEl.textContent =
            `streaming turn ${nextTurn + 1}/${turns.length} | ` +
            `token ${i + 1}/${total} | ` +
            `lines: ${lineCount} | ` +
            `${cursor.atTip ? 'tip' : 'scrollback'}`
        },
      })

      unsub()
      skipController = null
      timeline.renderIfActive(index)
    }

    nextTurn++
    statusEl.textContent =
      `${nextTurn}/${turns.length} turns | ` +
      `${turns.length - nextTurn} remaining | ` +
      `${cursor.atTip ? 'scroll down for next' : 'scrollback'}`
  }

  statusEl.textContent = `${turns.length} turns | complete`
}

function waitForTipPull(viewport: Viewport, cursor: Cursor): Promise<void> {
  return new Promise(resolve => {
    const unsub = viewport.onTipPull(() => {
      if (cursor.atTip) {
        unsub()
        resolve()
      }
    })
  })
}

main()
