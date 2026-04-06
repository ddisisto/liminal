/**
 * Liminal UX PoC — main entry point.
 *
 * Three modes of content:
 * 1. Buffered — history/initial load, rendered instantly
 * 2. Streaming — live edge, per-token animation
 * 3. (Future) Pre-fetched — buffered client-side, rendered with animation
 *
 * Initial load renders ~2 pages of buffered content.
 * Then each gap-at-tip streams one paragraph (one pull = one turn).
 */

import { Timeline } from './timeline'
import { Viewport } from './viewport'
import { InputArea } from './input'
import { streamTokens } from './stream'
import { connect } from './session-client'
import { ViewportTracker } from './viewport-tracker'

/** How many turns to render as buffered content on initial load. */
const INITIAL_BUFFER_TURNS = 3

async function main() {
  await document.fonts.ready

  const timelineEl = document.getElementById('timeline')!
  const statusEl = document.getElementById('status')!
  const renderBtn = document.getElementById('render-toggle')!
  const themeBtn = document.getElementById('theme-toggle')!

  const timeline = new Timeline(timelineEl)

  // Sync theme button label with initial state (may have been set by inline script)
  const isLight = document.documentElement.getAttribute('data-theme') === 'light'
  themeBtn.textContent = isLight ? 'light' : 'dark'

  themeBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme')
    const next = current === 'light' ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', next)
    themeBtn.textContent = next
  })

  renderBtn.addEventListener('click', () => {
    const next = !timeline.rendered
    timeline.setRendered(next)
    renderBtn.textContent = next ? 'rendered' : 'raw'
  })

  const viewport = new Viewport(document.documentElement, timeline)

  // Navigation: jump to top / jump to end (tip)
  const navTop = document.getElementById('nav-top')!
  const navEnd = document.getElementById('nav-end')!

  const jumpToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
  const jumpToEnd = () => viewport.scrollToTip()

  navTop.addEventListener('click', jumpToTop)
  navEnd.addEventListener('click', jumpToEnd)

  document.addEventListener('keydown', (e) => {
    // Skip if user is typing in an input/textarea
    if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
    if (e.key === 'Home') { e.preventDefault(); jumpToTop() }
    if (e.key === 'End') { e.preventDefault(); jumpToEnd() }
  })
  // Scroll-driven title animation: letter-spacing pulls from wide to tight,
  // sharpest at midpoint. Title stays centred on all screen sizes.
  const titleEl = document.querySelector('h1')!
  const SPACING_START = 1.5   // em — initial wide spread
  const SPACING_END = 0.4     // em — resting tightness

  // Ease-in-out: sharpest rate of change at t=0.5
  const easeInOut = (t: number) => t < 0.5
    ? 2 * t * t
    : 1 - Math.pow(-2 * t + 2, 2) / 2

  let titleTicking = false
  const updateTitle = () => {
    const rect = titleEl.getBoundingClientRect()
    const titleBottom = rect.bottom
    const titleHeight = rect.height

    // progress 0 = title fully visible, 1 = title exiting viewport top
    const raw = 1 - (titleBottom / (titleHeight + 80))  // 80 = container margin-top
    const progress = Math.max(0, Math.min(1, raw))
    const eased = easeInOut(progress)

    const spacing = SPACING_START + (SPACING_END - SPACING_START) * eased
    titleEl.style.letterSpacing = `${spacing}em`

    titleTicking = false
  }

  window.addEventListener('scroll', () => {
    if (!titleTicking) {
      titleTicking = true
      requestAnimationFrame(updateTitle)
    }
  }, { passive: true })

  // Set initial state
  updateTitle()

  const input = new InputArea()
  input.mount(document.body)

  input.onSubmitHandler((text) => {
    const { block } = timeline.addBlock('user')
    block.element.textContent = text
    block.rawText = text
    tracker.track(block.element, block.id)
  })

  const session = await connect()
  const tracker = new ViewportTracker(session)
  const turns = session.turns
  let nextTurn = 0

  // Phase 1: Render initial buffer instantly
  const bufferEnd = Math.min(INITIAL_BUFFER_TURNS, turns.length)
  for (let i = 0; i < bufferEnd; i++) {
    const turn = turns[i]
    const { block, index } = timeline.addBlock(turn.role)
    timeline.renderBuffered(index, turn.tokens, turn.text)
    timeline.renderIfActive(index)
    tracker.track(block.element, turn.sequenceId ?? block.id)
    nextTurn++
  }

  statusEl.textContent =
    `${bufferEnd} turns buffered | ` +
    `${turns.length - nextTurn} remaining | ` +
    `scroll down at tip to continue`

  // Phase 2: JIT pull loop — gap at tip triggers next turn
  // A tip-pull during streaming skips the active animation (renders remaining
  // tokens instantly) AND triggers the next turn as usual.
  let skipController: AbortController | null = null

  while (nextTurn < turns.length) {
    await waitForTipPull(viewport)

    const turn = turns[nextTurn]
    const { block, index } = timeline.addBlock(turn.role)
    tracker.track(block.element, turn.sequenceId ?? block.id)
    viewport.scrollToTip()

    if (turn.role === 'user' && turn.text) {
      block.element.textContent = turn.text
      block.rawText = turn.text
      timeline.renderIfActive(index)

    } else {
      // Wire up skip: a tip-pull during streaming aborts the current animation
      skipController = new AbortController()
      const unsub = viewport.onTipPull(() => {
        skipController?.abort()
      })

      // Stream one paragraph — this is the live edge
      await streamTokens(turn.tokens, block.element, index, timeline, {
        tokensPerSecond: 60,
        skipSignal: skipController.signal,
        onToken: (i, total, lineCount) => {
          statusEl.textContent =
            `streaming turn ${nextTurn + 1}/${turns.length} | ` +
            `token ${i + 1}/${total} | ` +
            `lines: ${lineCount}`
        },
      })

      unsub()
      skipController = null
      timeline.renderIfActive(index)
    }

    nextTurn++
    statusEl.textContent =
      `${nextTurn}/${turns.length} turns | ` +
      `${turns.length - nextTurn} remaining`
  }

  statusEl.textContent = `${turns.length} turns | complete`
}

function waitForTipPull(viewport: Viewport): Promise<void> {
  return new Promise(resolve => {
    const unsub = viewport.onTipPull(() => {
      unsub()
      resolve()
    })
  })
}

main()
