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

  const input = new InputArea()
  input.mount(document.body)

  // Drag-and-drop file import on the timeline
  timelineEl.addEventListener('dragover', (e) => {
    e.preventDefault()
    e.dataTransfer!.dropEffect = 'copy'
  })

  timelineEl.addEventListener('drop', (e) => {
    e.preventDefault()
    const file = e.dataTransfer?.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      sessionStorage.setItem('liminal-import', reader.result as string)
      location.assign('?source=local')
    }
    reader.readAsText(file)
  })

  const session = await connect()

  // Import mode: repurpose input for paste/URL import when not using live backend
  if (!session.isLive) {
    input.setPlaceholder('paste text or a URL to begin reading')
    input.onSubmitHandler((text) => {
      if (/^https?:\/\//.test(text)) {
        location.assign(`?url=${encodeURIComponent(text)}`)
      } else {
        sessionStorage.setItem('liminal-import', text)
        location.assign('?source=local')
      }
    })
  } else {
    input.onSubmitHandler((text) => {
      const { block } = timeline.addBlock('user')
      block.element.textContent = text
      block.rawText = text
      tracker.track(block.element, block.id)
    })
  }
  const tracker = new ViewportTracker(session)
  const turns = session.turns
  let nextTurn = 0

  // Render hero block instantly — it's the landing state
  if (turns.length > 0) {
    const turn = turns[0]
    const { block, index } = timeline.addBlock(turn.role)
    timeline.renderBuffered(index, turn.tokens, turn.text)
    timeline.renderIfActive(index)
    tracker.track(block.element, turn.sequenceId ?? block.id)
    nextTurn = 1

    // Scroll-driven hero animation: letter-spacing pulls from wide to tight,
    // sharpest at midpoint. Hero stays in flow, scrolls naturally.
    const heroEl = block.element
    const SPACING_START = 1.5   // em — initial wide spread
    const SPACING_END = 0.4     // em — resting tightness

    // Ease-in-out: sharpest rate of change at t=0.5
    const easeInOut = (t: number) => t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2

    let heroTicking = false
    const updateHero = () => {
      const rect = heroEl.getBoundingClientRect()
      // progress 0 = hero fully visible, 1 = hero exiting viewport top
      const raw = 1 - (rect.bottom / rect.height)
      const progress = Math.max(0, Math.min(1, raw))
      const eased = easeInOut(progress)

      const spacing = SPACING_START + (SPACING_END - SPACING_START) * eased
      heroEl.style.letterSpacing = `${spacing}em`

      heroTicking = false
    }

    window.addEventListener('scroll', () => {
      if (!heroTicking) {
        heroTicking = true
        requestAnimationFrame(updateHero)
      }
    }, { passive: true })

    updateHero()
  }

  // Hash navigation: scroll to #block-N if present
  if (location.hash) {
    const target = document.getElementById(location.hash.slice(1))
    if (target) target.scrollIntoView({ behavior: 'smooth' })
  }

  // Click block → set hash to that block's id
  timelineEl.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const block = target.closest('.block')
    if (block?.id) {
      history.replaceState(null, '', `#${block.id}`)
    }
  })

  // Track center block and update hash as user scrolls
  // Only start tracking once there are multiple blocks (no point anchoring to the hero)
  let hashTicking = false
  window.addEventListener('scroll', () => {
    if (hashTicking || timeline.length < 2) return
    hashTicking = true
    requestAnimationFrame(() => {
      hashTicking = false
      const center = window.innerHeight / 2
      let closest: { id: string; dist: number } | null = null
      for (let i = 0; i < timeline.length; i++) {
        const block = timeline.getBlock(i)
        if (!block) continue
        const rect = block.element.getBoundingClientRect()
        const mid = rect.top + rect.height / 2
        const dist = Math.abs(mid - center)
        if (!closest || dist < closest.dist) {
          closest = { id: block.id, dist }
        }
      }
      if (closest) {
        history.replaceState(null, '', `#${closest.id}`)
      }
    })
  }, { passive: true })

  statusEl.textContent =
    `${turns.length} turns | scroll down to begin`

  // JIT pull loop — gap at tip triggers next turn
  // A tip-pull during streaming skips the active animation (renders remaining
  // tokens instantly) AND triggers the next turn as usual.
  let skipController: AbortController | null = null

  while (nextTurn < turns.length) {
    await waitForTipPull(viewport)

    const turn = turns[nextTurn]
    const { block, index } = timeline.addBlock(turn.role)
    tracker.track(block.element, turn.sequenceId ?? block.id)

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
      timeline.scaleBlock(block)
      timeline.renderIfActive(index)
    }

    nextTurn++
    viewport.unlockPull()
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
