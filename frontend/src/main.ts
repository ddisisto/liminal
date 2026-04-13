/**
 * Liminal — main entry point.
 *
 * Documents are pull-driven: nothing appears until the reader
 * scrolls into its space. Links between documents navigate the
 * document graph.
 */

import './styles.css'
import { Timeline } from './timeline'
import { Viewport } from './viewport'
import { InputArea } from './input'
import { Settings } from './settings'
import { streamTokens } from './stream'
import { ViewportTracker } from './viewport-tracker'
import { updateSessionPosition } from './store'
import { openDocument, resolveLink, hasBundledDoc, type DocumentSession } from './documents'

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
    if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
    if (e.key === 'Home') { e.preventDefault(); jumpToTop() }
    if (e.key === 'End') { e.preventDefault(); jumpToEnd() }
  })

  // Scroll-driven title animation: letter-spacing pulls from wide to tight
  const titleEl = document.querySelector<HTMLHeadingElement>('#container > h1')!
  const SPACING_START = 1.5
  const SPACING_END = 0.4

  const easeInOut = (t: number) => t < 0.5
    ? 2 * t * t
    : 1 - Math.pow(-2 * t + 2, 2) / 2

  let titleTicking = false
  const updateTitle = () => {
    const rect = titleEl.getBoundingClientRect()
    const titleBottom = rect.bottom
    const titleHeight = rect.height
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

  updateTitle()

  const input = new InputArea()
  input.mount(document.body)

  // ── Document reading loop ───────────────────────────────

  // Abort controller for cancelling the current reading loop on document switch
  let readingAbort: AbortController | null = null
  let currentPath = ''
  let tracker: ViewportTracker | null = null

  async function readDocument(doc: DocumentSession): Promise<void> {
    // Cancel any in-progress reading loop
    if (readingAbort) readingAbort.abort()
    readingAbort = new AbortController()
    const { signal } = readingAbort

    // Clean up prior tracker
    if (tracker) tracker.destroy()

    currentPath = doc.path
    settings.currentDocId = doc.documentId
    const { turns, readingSessionId, lastPosition } = doc

    // Clear and reset
    timeline.clear()
    window.scrollTo(0, 0)
    viewport.unlockPull()

    // Set up attention tracking
    tracker = new ViewportTracker({
      readingSessionId,
      sendViewportEvents() {},
    })
    await tracker.loadPriorAttention(doc.documentId)

    let nextTurn = 0

    // Resume: render previously-seen blocks instantly
    const resumePoint = Math.min(lastPosition, turns.length)
    if (resumePoint > 0) {
      for (let i = 0; i < resumePoint; i++) {
        const turn = turns[i]
        const { block, index } = timeline.addBlock(turn.role)
        tracker.track(block.element, block.id, true)  // seen: resumed blocks
        timeline.renderBuffered(index, turn.tokens, turn.text)
        timeline.renderIfActive(index)
      }
      nextTurn = resumePoint
      console.log(`[liminal] resumed: ${resumePoint} blocks rendered instantly`)
    }

    statusEl.textContent = resumePoint > 0
      ? `${nextTurn}/${turns.length} blocks | ${turns.length - nextTurn} remaining`
      : `${turns.length} blocks | scroll down to begin`

    // Pull loop
    let skipController: AbortController | null = null

    while (nextTurn < turns.length) {
      // Wait for pull, but bail if document is switching
      try {
        await waitForTipPull(viewport, signal)
      } catch {
        return  // aborted — document is switching
      }

      const turn = turns[nextTurn]
      const { block, index } = timeline.addBlock(turn.role)
      tracker.track(block.element, block.id)

      skipController = new AbortController()
      const unsub = viewport.onTipPull(() => {
        skipController?.abort()
      })

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

      updateSessionPosition(readingSessionId, nextTurn).catch(() => {})

      statusEl.textContent =
        `${nextTurn}/${turns.length} blocks | ` +
        `${turns.length - nextTurn} remaining`
    }

    statusEl.textContent = `${turns.length} blocks | complete`
  }

  // ── Navigation ───────────────────────────────────────────

  /** Navigate to a document, optionally pushing browser history. */
  async function navigate(path: string, pushState: boolean): Promise<void> {
    if (!hasBundledDoc(path)) {
      console.warn(`[liminal] document not in bundle: ${path}`)
      return
    }
    const doc = await openDocument(path)
    if (!doc) {
      console.warn(`[liminal] failed to open: ${path}`)
      return
    }
    if (pushState) {
      history.pushState({ path }, '', `#${path}`)
    }
    readDocument(doc)
  }

  // Link interception
  timelineEl.addEventListener('click', async (e) => {
    const anchor = (e.target as Element).closest('a')
    if (!anchor) return

    const href = anchor.getAttribute('href')
    if (!href) return

    // Only intercept relative .md links
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) return
    if (!href.split('#')[0].endsWith('.md')) return

    e.preventDefault()
    const targetPath = resolveLink(href, currentPath)
    navigate(targetPath, true)
  })

  // Browser back/forward
  window.addEventListener('popstate', (e) => {
    const path = e.state?.path ?? 'README.md'
    navigate(path, false)
  })

  // ── User input (future: conversation) ───────────────────

  input.onSubmitHandler((text) => {
    const { block } = timeline.addBlock('user')
    block.element.textContent = text
    block.rawText = text
    if (tracker) tracker.track(block.element, block.id)
  })

  // ── Open root document ──────────────────────────────────

  // Check if URL has a doc path in the hash (e.g. #docs/architecture-plan.md)
  const hashPath = location.hash.slice(1)
  const startPath = (hashPath && hasBundledDoc(hashPath)) ? hashPath : 'README.md'

  history.replaceState({ path: startPath }, '', `#${startPath}`)
  const root = await openDocument(startPath)
  if (root) {
    readDocument(root)
  } else {
    statusEl.textContent = 'no documents found'
  }
}

function waitForTipPull(viewport: Viewport, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return }

    const unsub = viewport.onTipPull(() => {
      unsub()
      signal?.removeEventListener('abort', onAbort)
      resolve()
    })

    function onAbort() {
      unsub()
      reject(new DOMException('Aborted', 'AbortError'))
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

main()
