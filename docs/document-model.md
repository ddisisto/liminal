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

## How chat fits

A chat is a document where:
- Source type is `chat`
- Blocks alternate user/assistant roles
- The document is live (blocks appended via inference)
- The reading session and authoring session are the same object
- Pull-driven delivery still applies: model output streams into blocks as the reader pulls

The only difference between reading and chat is whether new blocks come from stored content or from inference. The attention model, pull mechanics, and persistence are identical.

## Open questions

- **Resumption UX**: when returning to a document, jump to last position? Show attention heatmap? Both?
- **Document discovery**: how does the reader find/list their documents? Library view? Recent list?
- **Import chunking**: how to split a long text into blocks? By paragraph? By heading? Configurable?
- **Identity and dedup**: if the same URL is imported twice, is it one document or two? Content hash helps but source text may change.
- **Offline chat**: could inference run locally (WASM models, WebGPU)? Would make chat fully offline too.
