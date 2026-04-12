# Document model

The core abstraction is a **document**, not a session or conversation. Everything the reader interacts with is a document. Chat is a special case where the document is still being written.

## Concepts

### Document

An immutable, ordered sequence of blocks. Each block has a role (content, user, assistant) and token-level addressability.

- **Source**: URL, paste, file upload, or conversation (inference)
- **Identity**: content-derived hash, stable across re-imports of the same source
- **Immutability**: once written, blocks and tokens are never modified. Edits create branches (new documents referencing a parent + fork point)

A document may be:
- **Complete**: all blocks present (imported text, fetched URL)
- **Live**: blocks still being appended (active conversation, streaming source)

### Reading session

One reader's continuous engagement with one document. Created when a document is opened, resumed on return.

Captures:
- **Attention**: cumulative viewport time per block, pull cadence, scroll patterns
- **Position**: last block seen, scroll offset
- **Settings overrides**: per-document pace, gap, theme (layered on global defaults)
- **Timestamps**: started, last active

A document accumulates many reading sessions over time. The aggregate attention across sessions is the reader's relationship with that document.

### Reader

Implicit for now: single user, single device. The reader is whoever is looking at the screen. No accounts, no auth.

Becomes explicit when needed for:
- Cross-device sync
- Sharing attention data with authors or communities
- Multi-reader documents (collaborative annotation)

## Storage

### Frontend: IndexedDB (primary)

The reader's data lives on their device. IndexedDB stores:

**documents** — content and metadata
| Field | Type | Notes |
|-------|------|-------|
| id | string | Content hash or UUID |
| title | string | Derived from source or first heading |
| source | object | `{ type: 'url' \| 'paste' \| 'file' \| 'chat', ref?: string }` |
| created | timestamp | |
| parent | string? | Fork parent document ID |
| forkBlock | number? | Block index where fork diverges |

**blocks** — document content, ordered
| Field | Type | Notes |
|-------|------|-------|
| docId | string | Parent document |
| index | number | Position in sequence |
| role | string | 'content', 'user', 'assistant' |
| tokens | string[] | Token-level content |
| created | timestamp | Birth moment of this block |
| parentBlock | string? | Fork parent block ID |
| forkPosition | number? | Token index where branch diverges |
| status | string | 'active', 'kept', 'discarded' |

**token_metadata** — per-token inference metadata (Layer 3)
| Field | Type | Notes |
|-------|------|-------|
| docId | string | Parent document |
| blockIndex | number | Which block |
| position | number | Token index within block |
| logprob | number? | Log probability from model |
| entropy | number? | Distribution entropy at this position |
| surprisal | number? | -logprob, information content |
| topK | object[]? | Alternative tokens: `[{token, logprob}]` |

Token metadata is nullable throughout — user-authored tokens and imported text have no inference metadata. Metadata is separated from tokens so that imported documents (which have no metadata) don't carry empty columns, and so metadata can be backfilled if a model is run over existing content later.

**reading_sessions** — engagement records
| Field | Type | Notes |
|-------|------|-------|
| id | string | UUID |
| docId | string | Document being read |
| started | timestamp | |
| lastActive | timestamp | |
| position | number | Last block index in viewport |
| scrollOffset | number | Pixel offset within block |
| settings | object? | Per-session overrides |

**attention** — viewport time accumulation
| Field | Type | Notes |
|-------|------|-------|
| sessionId | string | Reading session |
| blockIndex | number | Which block |
| viewportTime | number | Cumulative ms in viewport |
| pullTime | timestamp? | When this block was pulled in |
| visits | number | Times scrolled back to this block |

### Backend: SQLite (sync layer)

The existing backend schema (sessions, sequences, tokens, viewport_events) maps onto this model. The backend becomes a sync target rather than the source of truth:

- Documents map to sequences
- Reading sessions map to sessions
- Attention maps to viewport_events
- Sync is opt-in: reader chooses what to push

The backend is required for:
- **Chat/inference**: model runs server-side, streams tokens back
- **Shared documents**: hosted content with stable URLs
- **Attention aggregation**: author-side views of reader attention (anonymised, consented)

### localStorage (global settings)

Already implemented. Pace, gap, theme. These are reader preferences, not document data.

## The document graph

Documents are not isolated — they form a graph through links. A markdown document that links to `docs/architecture-plan.md` creates an edge in the graph. Following that link opens the target as another document in the reader's collection.

### Navigation model

The reader navigates the graph by following links within documents. There is no separate "library" or "file browser" — the documents themselves are the navigation surface. The intro document (README) is the root node.

**Link follow**: clicking a relative link in a rendered document hot-loads the target. The current document's reading position is saved; the new document opens in the timeline. If the target is already in IndexedDB, it loads instantly with prior attention restored.

**Session flyout**: a small panel showing the reader's open documents with reading positions. Auto-opens briefly on document switch (showing where you are in each), then collapses to allow reading. Same interaction pattern as the settings cog — minimal, out of the way, available on demand.

**Intro as root**: the intro/hero remains pinned as the consistent entry point and reference. Every reading session starts here. The intro document is the root of the graph.

### Delivery modes

Three modes of block delivery, all using the same rendering pipeline:

**Pull-driven** (default for first read): every block waits for a pull gesture. The reader controls pacing completely. New blocks stream with per-token animation. This is the core reading experience.

**Resume** (default on revisit): blocks 0..lastPosition render instantly (no pull, no animation), restoring the reader to where they left off. Pull-driven delivery resumes from there. Previously-seen blocks carry their accumulated attention warmth from IndexedDB.

**Open**: all blocks render immediately on document open. The reader can scroll and zoom the entire document freely from the start. Useful for reference, browsing, or re-reading. This is a per-document option, not a global mode change.

The mode is stored per reading session. The session flyout and/or settings panel can expose it. A reasonable default: pull-driven for first read, resume on revisit, open available on demand.

Implementation is a single check in the pull loop:

```
while (nextTurn < turns.length) {
  if (mode === 'pull' || (mode === 'resume' && nextTurn >= lastPosition)) {
    await waitForTipPull(viewport)
  }
  renderBlock(nextTurn, { animate: mode === 'pull' })
}
```

### Unseen block state

In resume and open modes, blocks beyond the reader's last known position render in a **dimmed, unseen state**:

- **Visual**: reduced opacity, blue-tinted left border (distinct from the warm amber of attended blocks and the neutral border of seen-but-not-yet-warm blocks)
- **Attention**: no attention is recorded until the block has been continuously visible in the viewport for **1.5 seconds** — preventing false positives from quick scroll-throughs. After the threshold, the block transitions to normal display and attention tracking begins.
- **Transition**: on first real view, the block fades from dimmed to full opacity, border shifts from blue to the standard colour. This is the moment the block becomes "seen."

This creates a clear visual map of reading progress: warm blocks (read and dwelt on), neutral blocks (seen), and dimmed blocks (present but unread). The reader can see the shape of an entire document while still having a clear sense of where their attention has actually been.

### Document types in the graph

All document types are nodes in the same graph:

- **Content documents**: imported text, fetched URLs, uploaded files. Blocks have role `content`.
- **Conversations**: blocks alternate `user`/`assistant` roles. The document is live (blocks appended via inference). A conversation may fork from a content document — "let's discuss this" creates a new document linked to the source.
- **Annotations/reflections**: future. Documents created by the reader in response to other documents.

The graph is navigable in all directions. A conversation that references a source document links back to it. An annotation on a passage links to the block it annotates.

### How chat fits

A chat is a document where:
- Source type is `chat`
- Blocks alternate user/assistant roles
- The document is live (blocks appended via inference)
- The reading session and authoring session are the same object
- Pull-driven delivery still applies: model output streams into blocks as the reader pulls

The only difference between reading and chat is whether new blocks come from stored content or from inference. The attention model, pull mechanics, and persistence are identical. Conversations are deferred until backend inference is connected.

### Future: reflective layer

The document graph, combined with accumulated attention data, creates the substrate for a reflective RAG layer. The reader's attention patterns across documents — what they lingered on, what they linked between, what they returned to — form a semantic index that no external system has access to. A model with access to this index could surface connections, suggest revisitations, or generate reflections grounded in what the reader actually engaged with. This is speculative but architecturally straightforward: the data is already being captured, the graph structure already exists, the model just needs to read it.

## Implementation plan

### Phase 1: Document reader (current priority)

1. **Strip mock conversation wrapper** — load README as a real document. Blocks are paragraphs with role `content`, not simulated chat turns. Drop fake user prompts.
2. **Delivery modes** — implement pull/resume/open modes in the pull loop. Resume pre-loads blocks to last position. Open renders all blocks immediately.
3. **Unseen block state** — dimmed + blue border for unread blocks. 1.5s viewport threshold before attention tracking begins. Transition animation on first real view.
4. **Link interception** — catch clicks on relative markdown links in rendered blocks, hot-load the target document from source.
5. **Document switching** — save/restore reading position, swap timeline content, create reading sessions per document.
6. **Session flyout** — minimal UI for open documents list with reading positions. Auto-opens on switch.

### Phase 2: Document management

7. **Import** — paste, file upload, URL fetch (client-side where CORS allows, backend when available).
8. **Remove** — delete documents from IndexedDB.

### Phase 3: Conversation (requires backend)

9. **Inference connection** — backend streams tokens, frontend stores as live document.
10. **Conversation fork** — start a chat from a content document, creating a linked node in the graph.
11. **Session sync** — opt-in sync of documents and attention to backend.

## Open questions

- **Import chunking**: how to split a long text into blocks? By paragraph? By heading? Configurable?
- **Identity and dedup**: if the same URL is imported twice, is it one document or two? Content hash helps but source text may change.
- **Cross-document attention**: does reading doc A while thinking about doc B create a signal? Only explicit links capture this currently.
- **Offline chat**: could inference run locally (WASM models, WebGPU)? Would make chat fully offline too.
