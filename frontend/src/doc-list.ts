/**
 * Document list — left-side panel with all documents in IndexedDB,
 * reading progress and attention summary. Viewport-driven behaviour:
 * wide viewports keep the panel open and shift content; narrow ones
 * show it as an overlay that auto-closes on outside click.
 */

import {
  getBlocks, getLatestSession, getDocumentAttention,
  deleteDocumentData,
} from './store'
import { listBundledDocs } from './documents'

const WARM_THRESHOLD_MS = 30000  // matches viewport-tracker
const WIDE_MEDIA = '(min-width: 960px)'
const CHEVRON_CLOSED = '\u22D7'  // ⋗
const CHEVRON_OPEN = '\u22D6'    // ⋖

interface LeafStats {
  blockCount: number
  position: number
  attentionPct: number   // 0–100, mean of per-block attention (unseen = 0)
}

interface TreeLeaf {
  kind: 'leaf'
  path: string           // repo-relative, e.g. 'docs/design-philosophy.md'
  label: string          // filename only
  stats: LeafStats
  greyed: boolean        // no accumulated attention
}

interface TreeFolder {
  kind: 'folder'
  key: string            // unique path within the tree, for collapse state
  label: string
  children: TreeNode[]
  greyed: boolean        // all descendants greyed
}

type TreeNode = TreeLeaf | TreeFolder

type NavigateHandler = (docId: string) => void

export class DocList {
  private btn: HTMLButtonElement
  private panel: HTMLElement
  private header: HTMLElement
  private listEl: HTMLElement
  private open = false
  private wide: MediaQueryList
  private onNavigate: NavigateHandler | null = null
  /** Optional pre-refresh hook: called (and awaited) before each panel refresh. */
  private refreshHook: (() => Promise<void> | void) | null = null
  private currentDocId: string | null = null
  /** Folder keys currently collapsed. Default: everything expanded. */
  private collapsed = new Set<string>()
  /** Monotonic token: stale refreshes drop their DOM mutation. */
  private refreshToken = 0
  /** Poll handle: live-refreshes stats while the panel is open. */
  private pollTimer: number | undefined

  constructor() {
    this.panel = this.buildPanel()
    this.header = this.panel.querySelector('.doc-list-header')!
    this.listEl = this.panel.querySelector('.doc-list-items')!
    this.btn = this.buildButton()

    document.body.appendChild(this.panel)
    document.body.appendChild(this.btn)

    this.btn.addEventListener('click', (e) => {
      e.stopPropagation()
      this.toggle()
    })

    this.wide = window.matchMedia(WIDE_MEDIA)
    this.wide.addEventListener('change', () => this.applyMode())
    this.applyMode()

    // Outside click closes only in narrow mode
    document.addEventListener('click', (e) => {
      if (!this.open || this.wide.matches) return
      if (this.panel.contains(e.target as Node)) return
      this.close()
    })
  }

  private applyMode(): void {
    if (this.wide.matches) {
      if (!this.open) this.openPanel()
      document.body.classList.add('doc-list-shifted')
    } else {
      document.body.classList.remove('doc-list-shifted')
      if (this.open) this.close()
    }
  }

  /** Register navigation callback. */
  onNavigateHandler(fn: NavigateHandler): void {
    this.onNavigate = fn
  }

  /** Register a hook called before each refresh (e.g. to flush live attention). */
  setRefreshHook(fn: (() => Promise<void> | void) | null): void {
    this.refreshHook = fn
  }

  /** Set the currently active document (for highlighting + stats refresh). */
  setCurrentDoc(docId: string): void {
    this.currentDocId = docId
    // Refresh to pick up latest attention/position across the tree.
    // Fire-and-forget — the list updates when IndexedDB reads complete.
    if (this.open) void this.refresh()
  }

  /** Rebuild the tree from the bundle + IndexedDB stats. */
  async refresh(): Promise<void> {
    const token = ++this.refreshToken
    if (this.refreshHook) {
      try { await this.refreshHook() } catch {}
      if (token !== this.refreshToken) return
    }
    const paths = listBundledDocs()
    const leaves = await Promise.all(paths.map(p => this.buildLeaf(p)))
    if (token !== this.refreshToken) return  // superseded by a newer refresh
    const root = this.buildTree(leaves)

    this.listEl.innerHTML = ''
    this.renderNode(root, 0, this.listEl)
  }

  private async buildLeaf(path: string): Promise<TreeLeaf> {
    const [blocks, session, attention] = await Promise.all([
      getBlocks(path),
      getLatestSession(path),
      getDocumentAttention(path),
    ])

    const blockCount = blocks.length
    const position = session?.position ?? 0

    let totalAttention = 0
    for (let i = 0; i < blockCount; i++) {
      const ms = attention.get(i) ?? 0
      totalAttention += Math.min(1, ms / WARM_THRESHOLD_MS)
    }
    const attentionPct = blockCount > 0
      ? Math.round((totalAttention / blockCount) * 100)
      : 0

    const label = path.split('/').pop() ?? path
    return {
      kind: 'leaf',
      path,
      label,
      stats: { blockCount, position, attentionPct },
      greyed: attentionPct === 0,
    }
  }

  /** Assemble leaves into the `about` tree by splitting paths on '/'. */
  private buildTree(leaves: TreeLeaf[]): TreeFolder {
    const root: TreeFolder = {
      kind: 'folder', key: 'about', label: 'about', children: [], greyed: true,
    }

    for (const leaf of leaves) {
      const parts = leaf.path.split('/')
      let cursor = root
      // Walk folders for all parts except the last (which is the filename)
      for (let i = 0; i < parts.length - 1; i++) {
        const folderLabel = parts[i]
        const folderKey = `about/${parts.slice(0, i + 1).join('/')}`
        let next = cursor.children.find(
          c => c.kind === 'folder' && c.label === folderLabel,
        ) as TreeFolder | undefined
        if (!next) {
          next = {
            kind: 'folder', key: folderKey, label: folderLabel,
            children: [], greyed: true,
          }
          cursor.children.push(next)
        }
        cursor = next
      }
      cursor.children.push(leaf)
    }

    // Recursively sort alphabetically and propagate greyed state
    const finalize = (folder: TreeFolder): void => {
      folder.children.sort((a, b) => a.label.localeCompare(b.label))
      let allGreyed = true
      for (const child of folder.children) {
        if (child.kind === 'folder') finalize(child)
        if (!child.greyed) allGreyed = false
      }
      folder.greyed = allGreyed && folder.children.length > 0
    }
    finalize(root)

    return root
  }

  private renderNode(node: TreeNode, depth: number, parent: HTMLElement): void {
    if (node.kind === 'folder') {
      parent.appendChild(this.buildFolderRow(node, depth))
      if (!this.collapsed.has(node.key)) {
        for (const child of node.children) {
          this.renderNode(child, depth + 1, parent)
        }
      }
    } else {
      parent.appendChild(this.buildLeafRow(node, depth))
    }
  }

  private buildFolderRow(folder: TreeFolder, depth: number): HTMLElement {
    const row = document.createElement('div')
    row.className = 'doc-list-row doc-list-row--folder'
    if (folder.greyed) row.classList.add('doc-list-row--greyed')
    row.style.setProperty('--depth', String(depth))

    const label = document.createElement('span')
    label.className = 'doc-list-folder-label'
    const collapsed = this.collapsed.has(folder.key)
    label.textContent = `${collapsed ? '\u25B8' : '\u25BE'} ${folder.label}`  // ▸ / ▾
    row.appendChild(label)

    row.addEventListener('click', () => {
      if (this.collapsed.has(folder.key)) this.collapsed.delete(folder.key)
      else this.collapsed.add(folder.key)
      void this.refresh()
    })

    return row
  }

  private buildLeafRow(leaf: TreeLeaf, depth: number): HTMLElement {
    const row = document.createElement('div')
    row.className = 'doc-list-row doc-list-row--leaf'
    if (leaf.path === this.currentDocId) row.classList.add('doc-list-row--active')
    if (leaf.greyed) row.classList.add('doc-list-row--greyed')
    row.dataset.docId = leaf.path
    row.style.setProperty('--depth', String(depth))

    const title = document.createElement('span')
    title.className = 'doc-list-title'
    title.textContent = leaf.label
    title.title = leaf.path

    row.appendChild(title)

    if (!leaf.greyed) {
      row.appendChild(this.buildStatsCell(leaf))
    }

    row.addEventListener('click', () => {
      if (this.onNavigate && leaf.path !== this.currentDocId) {
        this.onNavigate(leaf.path)
      }
      if (!this.wide.matches) this.close()
    })

    return row
  }

  /** Stats cell doubles as the two-click reset control. */
  private buildStatsCell(leaf: TreeLeaf): HTMLElement {
    const stats = document.createElement('span')
    stats.className = 'doc-list-stats'
    const idle = `${leaf.stats.position}/${leaf.stats.blockCount}  ${leaf.stats.attentionPct}%`
    stats.textContent = idle

    let armed = false
    let timer: number | undefined
    const disarm = () => {
      armed = false
      stats.textContent = idle
      stats.classList.remove('doc-list-stats--armed')
      if (timer !== undefined) { clearTimeout(timer); timer = undefined }
    }

    stats.addEventListener('click', async (e) => {
      e.stopPropagation()  // don't trigger row navigate
      if (!armed) {
        armed = true
        stats.textContent = 'reset?'
        stats.classList.add('doc-list-stats--armed')
        timer = window.setTimeout(disarm, 3000)
        return
      }
      if (timer !== undefined) clearTimeout(timer)
      await deleteDocumentData(leaf.path)
      if (leaf.path === this.currentDocId) {
        // Reset current doc cleanly via full reload (matches settings-reset)
        window.scrollTo(0, 0)
        location.reload()
      } else {
        await this.refresh()
      }
    })

    return stats
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
    this.btn.textContent = CHEVRON_OPEN
    this.header.appendChild(this.btn)  // reparent into header
    if (this.wide.matches) {
      document.body.classList.add('doc-list-shifted')
    }
    await this.refresh()
    this.pollTimer = window.setInterval(() => {
      // Skip while a reset is armed — refresh would clobber the 3s confirm window.
      if (this.listEl.querySelector('.doc-list-stats--armed')) return
      void this.refresh()
    }, 1000)
  }

  private close(): void {
    this.open = false
    this.panel.classList.remove('doc-list-panel--open')
    this.btn.classList.remove('doc-list-btn--open')
    this.btn.textContent = CHEVRON_CLOSED
    document.body.appendChild(this.btn)  // return to fixed top-left
    document.body.classList.remove('doc-list-shifted')
    if (this.pollTimer !== undefined) {
      clearInterval(this.pollTimer)
      this.pollTimer = undefined
    }
  }

  private buildButton(): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = 'doc-list-btn'
    btn.title = 'Documents'
    btn.textContent = CHEVRON_CLOSED
    return btn
  }

  private buildPanel(): HTMLElement {
    const panel = document.createElement('div')
    panel.className = 'doc-list-panel'

    // Header: hero title on the left; trigger button slots in on the right when open
    const header = document.createElement('div')
    header.className = 'doc-list-header'

    const hero = document.createElement('span')
    hero.className = 'doc-list-hero'
    hero.textContent = 'liminal'
    header.appendChild(hero)

    panel.appendChild(header)

    // Scrollable list
    const items = document.createElement('div')
    items.className = 'doc-list-items'
    panel.appendChild(items)

    return panel
  }
}
