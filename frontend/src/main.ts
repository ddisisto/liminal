/**
 * Liminal UX PoC — main entry point.
 *
 * Every block is pull-driven: nothing appears until the space it will
 * occupy is scrolled into view. One pull = one turn.
 */

import './styles.css'
import { Timeline } from './timeline'
import { Viewport } from './viewport'
import { InputArea } from './input'
import { Settings } from './settings'
import { streamTokens } from './stream'
import { connect } from './session-client'
import { ViewportTracker } from './viewport-tracker'
import { updateSessionPosition } from './store'

async function main() {
  await document.fonts.ready

  const timelineEl = document.getElementById('timeline')!
  const statusEl = document.getElementById('status')!

  const timeline = new Timeline(timelineEl)
  const settings = new Settings(timeline)

  const viewport = new Viewport(document.documentElement, timeline, settings)

  // Navigation: jump to top / jump to end (tip)
  const navTop = document.getElementById('nav-top')!
  const navEnd = document.getElementById('nav-end')!

  viewport.bindNavEnd(navEnd)

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
    const raw = 1 - (titleBottom / titleHeight)
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
  await tracker.loadPriorAttention(session.documentId)
  const turns = session.turns
  let nextTurn = 0

  // Resume mode: render previously-seen blocks instantly (no pull, no animation)
  const resumePoint = Math.min(session.lastPosition, turns.length)
  if (resumePoint > 0) {
    for (let i = 0; i < resumePoint; i++) {
      const turn = turns[i]
      const { block, index } = timeline.addBlock(turn.role)
      tracker.track(block.element, turn.sequenceId ?? block.id)
      timeline.renderBuffered(index, turn.tokens, turn.text)
      timeline.renderIfActive(index)
    }
    nextTurn = resumePoint
    console.log(`[liminal] resumed: ${resumePoint} blocks rendered instantly`)
  }

  statusEl.textContent = resumePoint > 0
    ? `${nextTurn}/${turns.length} blocks | ${turns.length - nextTurn} remaining`
    : `${turns.length} blocks | scroll down to begin`

  // JIT pull loop — gap at tip triggers next block.
  // A tip-pull during streaming skips the active animation (renders remaining
  // tokens instantly) AND triggers the next block as usual.
  let skipController: AbortController | null = null

  while (nextTurn < turns.length) {
    await waitForTipPull(viewport)

    const turn = turns[nextTurn]
    const { block, index } = timeline.addBlock(turn.role)
    tracker.track(block.element, turn.sequenceId ?? block.id)

    // Wire up skip: a tip-pull during streaming aborts the current animation
    skipController = new AbortController()
    const unsub = viewport.onTipPull(() => {
      skipController?.abort()
    })

    // Stream one block — this is the live edge
    await streamTokens(turn.tokens, block.element, index, timeline, {
      tokensPerSecond: settings.pace,
      skipSignal: skipController.signal,
    })

    unsub()
    skipController = null
    timeline.scaleBlock(block)
    timeline.renderIfActive(index)

    nextTurn++
    viewport.unlockPull()

    // Persist reading position
    updateSessionPosition(session.readingSessionId, nextTurn).catch(() => {})

    statusEl.textContent =
      `${nextTurn}/${turns.length} blocks | ` +
      `${turns.length - nextTurn} remaining`
  }

  statusEl.textContent = `${turns.length} blocks | complete`
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
