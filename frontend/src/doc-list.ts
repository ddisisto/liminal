/**
 * Document list flyout — shows all documents in IndexedDB with
 * reading progress and attention summary. Top-left trigger button,
 * side-pane on landscape, top-pane on portrait. Can be pinned to
 * shift main content.
 */

import {
  listDocuments, getBlocks, getLatestSession, getDocumentAttention,
  deleteDocumentData, type StoredDocument,
} from './store'

const WARM_THRESHOLD_MS = 30000  // matches viewport-tracker

export interface DocListEntry {
  id: string
  title: string
  blockCount: number
  position: number       // last block seen
  attentionPct: number   // 0–100, mean of per-block attention (unseen = 0)
}

type NavigateHandler = (docId: string) => void

export class DocList {
  private btn: HTMLButtonElement
  private panel: HTMLElement
  private listEl: HTMLElement
  private open = false
  private pinned = false
  private onNavigate: NavigateHandler | null = null
  private currentDocId: string | null = null

  constructor() {
    this.btn = this.buildButton()
    this.panel = this.buildPanel()
    this.listEl = this.panel.querySelector('.doc-list-items')!

    document.body.appendChild(this.btn)
    document.body.appendChild(this.panel)

    this.btn.addEventListener('click', () => this.toggle())

    // Close on outside click (unless pinned)
    document.addEventListener('click', (e) => {
      if (this.open && !this.pinned
        && !this.panel.contains(e.target as Node)
        && e.target !== this.btn) {
        this.close()
      }
    })
  }

  /** Register navigation callback. */
  onNavigateHandler(fn: NavigateHandler): void {
    this.onNavigate = fn
  }

  /** Set the currently active document (for highlighting). */
  setCurrentDoc(docId: string): void {
    this.currentDocId = docId
    this.updateHighlight()
  }

  /** Refresh the list from IndexedDB. Call on document switch or periodically. */
  async refresh(): Promise<void> {
    const docs = await listDocuments()
    const entries = await Promise.all(docs.map(d => this.buildEntry(d)))

    // Sort: most recently active first
    entries.sort((a, b) => {
      // Current doc always first
      if (a.id === this.currentDocId) return -1
      if (b.id === this.currentDocId) return 1
      return 0  // stable order otherwise
    })

    this.listEl.innerHTML = ''
    for (const entry of entries) {
      this.listEl.appendChild(this.buildRow(entry))
    }
  }

  private async buildEntry(doc: StoredDocument): Promise<DocListEntry> {
    const [blocks, session, attention] = await Promise.all([
      getBlocks(doc.id),
      getLatestSession(doc.id),
      getDocumentAttention(doc.id),
    ])

    const blockCount = blocks.length
    const position = session?.position ?? 0

    // Mean attention: sum of per-block attention values / total blocks
    // Unseen blocks (not in attention map) count as 0
    let totalAttention = 0
    for (let i = 0; i < blockCount; i++) {
      const ms = attention.get(i) ?? 0
      totalAttention += Math.min(1, ms / WARM_THRESHOLD_MS)
    }
    const attentionPct = blockCount > 0
      ? Math.round((totalAttention / blockCount) * 100)
      : 0

    return { id: doc.id, title: doc.title, blockCount, position, attentionPct }
  }

  private buildRow(entry: DocListEntry): HTMLElement {
    const row = document.createElement('div')
    row.className = 'doc-list-row'
    if (entry.id === this.currentDocId) row.classList.add('doc-list-row--active')
    row.dataset.docId = entry.id

    // Title
    const title = document.createElement('span')
    title.className = 'doc-list-title'
    title.textContent = entry.title
    title.title = entry.id  // full path on hover

    // Stats
    const stats = document.createElement('span')
    stats.className = 'doc-list-stats'
    stats.textContent = `${entry.position}/${entry.blockCount}  ${entry.attentionPct}%`

    // Remove button
    const remove = document.createElement('button')
    remove.className = 'doc-list-remove'
    remove.textContent = '\u00d7'
    remove.title = 'Remove from list'
    remove.addEventListener('click', async (e) => {
      e.stopPropagation()
      await deleteDocumentData(entry.id)
      row.remove()
    })

    row.appendChild(title)
    row.appendChild(stats)
    row.appendChild(remove)

    // Navigate on click
    row.addEventListener('click', () => {
      if (this.onNavigate && entry.id !== this.currentDocId) {
        this.onNavigate(entry.id)
      }
      if (!this.pinned) this.close()
    })

    return row
  }

  private toggle(): void {
    if (this.open) {
      this.close()
    } else {
      this.openPanel()
    }
  }

  private async openPanel(): Promise<void> {
    this.open = true
    this.panel.classList.add('doc-list-panel--open')
    this.btn.classList.add('doc-list-btn--open')
    await this.refresh()
  }

  private close(): void {
    this.open = false
    this.pinned = false
    this.panel.classList.remove('doc-list-panel--open', 'doc-list-panel--pinned')
    this.btn.classList.remove('doc-list-btn--open')
    document.getElementById('container')?.classList.remove('doc-list-pinned')
  }

  private updateHighlight(): void {
    for (const row of this.listEl.children) {
      const el = row as HTMLElement
      el.classList.toggle('doc-list-row--active', el.dataset.docId === this.currentDocId)
    }
  }

  private buildButton(): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = 'doc-list-btn'
    btn.title = 'Documents'
    btn.innerHTML = '&#x2630;'  // hamburger ☰
    return btn
  }

  private buildPanel(): HTMLElement {
    const panel = document.createElement('div')
    panel.className = 'doc-list-panel'

    // Header with pin toggle
    const header = document.createElement('div')
    header.className = 'doc-list-header'

    const heading = document.createElement('span')
    heading.className = 'doc-list-heading'
    heading.textContent = 'documents'

    const pin = document.createElement('button')
    pin.className = 'doc-list-pin'
    pin.title = 'Pin panel'
    pin.innerHTML = '&#x1F4CC;'  // 📌
    pin.addEventListener('click', () => {
      this.pinned = !this.pinned
      this.panel.classList.toggle('doc-list-panel--pinned', this.pinned)
      pin.classList.toggle('doc-list-pin--active', this.pinned)
      document.getElementById('container')?.classList.toggle('doc-list-pinned', this.pinned)
    })

    header.appendChild(heading)
    header.appendChild(pin)
    panel.appendChild(header)

    // Scrollable list
    const items = document.createElement('div')
    items.className = 'doc-list-items'
    panel.appendChild(items)

    return panel
  }
}
