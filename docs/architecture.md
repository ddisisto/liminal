# Liminal — Architecture Document

**Stack, Schema, Data Flow, and Component Boundaries**

---

## Overview

Liminal is an attention instrument: a self-hosted, browser-based reading and conversation interface with passive attention instrumentation and progressive analytical depth. The core abstraction is the **document** — an immutable, ordered sequence of blocks. Chat is a special case where the document is still being written. See [document-model.md](document-model.md) for the full data model.

The architecture prioritises simplicity, low infrastructure overhead, and clean separation between concerns — while preserving room for the system to grow into the more speculative layers described in [AI layers](ai-layers.md). The foundational design principles (viewport ownership, pull-driven pacing, content-intrinsic scaling) are described in the [design philosophy](design-philosophy.md).

The system is single-user, local-first, and designed to run on modest hardware (NVIDIA GTX 1070, 8GB VRAM) during the prototyping phase.

---

## Stack Summary

**Backend**: Python, FastAPI, WebSocket streaming, SQLite (sync layer, inference host)
**Inference**: HuggingFace Transformers (local GPU), optional API inference providers
**Frontend**: Lightweight TypeScript, native browser APIs, IndexedDB (primary store)
**Storage**: IndexedDB in browser (reader's data), SQLite on server (shared documents, inference, sync)
**Local models**: Sub-1B parameter models for rapid design iteration (SmolLM 135M/360M, TinyLlama, or similar)

---

## Component Architecture

### Backend (Python / FastAPI)

The backend is the intelligence and sync layer. It handles:

**Document and block management** — document lifecycle, block tree traversal, mainline reconstruction from kept/active status chains. Demo content seeding from project docs on startup. Implemented in `backend/sessions.py` (to be refactored to document-centric naming).

**Storage** — SQLite with WAL mode, raw SQL (no ORM). CRUD for documents, blocks, tokens, viewport events. Schema initialised from `schema/init.sql`. Implemented in `backend/storage/database.py`. The backend is a sync target — the frontend's IndexedDB is the primary store for the reader's data.

**Attention sync** — receives batched viewport visibility intervals from the frontend via POST `/api/viewport-events`. Writes directly to SQLite. Raw storage, analysis deferred. This is opt-in sync of data that the frontend already holds locally.

**Inference orchestration (future)** — local model loading via HF Transformers, API provider routing, token metadata extraction (logprob, entropy, surprisal). Currently, documents are seeded with static content; real inference replaces the seeding path. The backend is required for chat because inference runs server-side.

**User-model (future)** — placeholder for the third predictive system. Initially, this is just the accumulated attention data. Later, a lightweight model (embedding-based or classifier) that runs locally and predicts user behaviour from accumulated signal.

### Frontend (TypeScript / Native DOM)

The frontend is the sensing, rendering, and primary storage layer.

**Document renderer** — streams tokens from the WebSocket (live chat) or loads from IndexedDB (stored documents) and renders them as per-token DOM elements. Block-length font scaling: short blocks are large/prominent, long blocks settle smaller. Markdown rendering toggle (raw tokens vs rendered).

**Attention capture (L1)** — viewport time tracking via IntersectionObserver, gated by `visibilitychange`/`blur` for AFK detection. Per-block cumulative viewport time is maintained in-memory and exposed as a `--attention` CSS custom property (0→1), driving live visual warmth on block borders. Attention data persists to IndexedDB locally; sync to backend is opt-in. Finer-grained instrumentation (selection events via Selection API, copy events via clipboard API) is a future L2 concern. See [research/attention-instrumentation.md](research/attention-instrumentation.md) for prior art and signal validity.

**Annotation interface** — on explicit user action (e.g. selecting text and invoking a minimal context menu), allows tagging a token range with a freeform label. This is the Layer 2 interaction — same gesture as passive selection but with intentional commitment. The UI for this should be near-invisible: a small floating input that appears at the selection point, accepts text, and vanishes.

**Analytical overlays (Layer 3)** — renders entropy, surprisal, and other token-level metrics as visual layers over the document text. These overlays are opt-in — hidden by default, available on demand. Token metadata (logprob, entropy, surprisal) is stored per-token but separated from content so that imported documents without metadata carry no dead weight.

**Inline expansion and compression (Layer 4)** — at any token position, the user can request additional generation (expansion) or collapse a block to a summary (compression). Expansion opens an inline editing region, the backend generates into a new branch block, and the user can keep, modify, or discard before advancing. Compression is non-destructive — the original tokens remain in storage, a compressed representation is generated and displayed, and re-expansion is always available.

### JIT Inference and the Pull Primitive

This section describes the implementation of the pull mechanic whose rationale is given in the [design philosophy](design-philosophy.md#content-arrives-when-pulled). Generation is driven by a single repeating primitive: the client requests the next token sequence, passing stop conditions (`stop_tokens`, `max_tokens`) directly. The backend streams tokens until a stop condition fires, then waits. The client decides what to do next.

```
Client → Backend:  { "sequence_id": "seq_abc123", "stop_tokens": ["\n\n"], "max_tokens": 512 }
Backend → Client:  [token stream...]
Backend → Client:  { "type": "stopped", "reason": "stop_token" | "eos" | "max_tokens" }
```

By default, `stop_tokens` includes `\n\n` (paragraph boundary), making the model generate one paragraph at a time. EOS is not special; it just means the model has nothing more to say, and the frontend shows this differently (e.g. prompting for user input rather than offering a continue affordance).

**The gap mechanic**: Pull is triggered spatially. The viewport is always user-controlled — the system never auto-scrolls. When the user scrolls past the last block, a gap opens between the content and the input area. When this gap exceeds a threshold, the next turn is pulled in. A lock prevents multiple pulls from a single gesture; it releases when the new content has been delivered. A visual indicator fades in as the gap approaches the threshold, giving the user feedback on how close they are to triggering the next pull — and the option to hold back.

This works with any scroll method (wheel, touch, keyboard, scrollbar drag) because it operates on the spatial relationship between content and viewport, not on gesture detection. The user owns the viewport; pull is a consequence of where they are, not what input device they used.

This is JIT inference: generation is pulled by the reader's pace, not pushed by the model. The cadence of pull requests is itself the primary attention signal — paragraph-level dwell with near-perfect reliability, requiring zero additional instrumentation.

This works identically for local inference (HF Transformers `stopping_criteria`) and API inference (`stop_tokens` + prefill), both standard alongside `logprobs` support. The schema is unaffected — sequences are bounded by EOS/BOS as before; a stop-token simply causes the boundary to occur sooner.

**During streaming**: no auto-scroll, no repositioning. Content streams in while the reader engages with earlier material undisturbed. Each reader action results in at most one immediate view change (e.g. End key scrolls to tip).

### WebSocket Protocol

The primary communication channel for generation is a WebSocket connection. Each token message from the backend carries:

```
{
  "sequence_id": "seq_abc123",
  "position": 42,
  "token": "equilibrium",
  "logprob": -3.218,
  "entropy": 4.71,
  "surprisal": 3.218,
  "top_k": [
    {"token": "equilibrium", "logprob": -3.218},
    {"token": "balance", "logprob": -3.891},
    {"token": "state", "logprob": -4.102}
  ]
}
```

The frontend accumulates these into the rendered conversation and the local display model. The backend simultaneously persists each token to SQLite.

Viewport events flow via REST (POST `/api/viewport-events`), batched every 5s:

```
{
  "events": [
    {
      "session_id": "48d06d50-...",
      "sequence_id": "a1b2c3d4-...",
      "visible_from": "2026-04-05T14:22:01.337Z",
      "visible_to": "2026-04-05T14:22:06.500Z",
      "duration_ms": 5163,
      "confidence": "active"
    }
  ]
}
```

---

## Storage

Storage is split across two layers. See [document-model.md](document-model.md) for the full data model and rationale.

**IndexedDB (frontend, primary)** — the reader's data. Documents, blocks, reading sessions, and attention live on the reader's device. The reader gets immediate value (visual warmth, position memory, reading history) without any backend.

**SQLite (backend, sync layer)** — shared documents, inference output, and opt-in attention sync. The backend is required for chat (inference runs server-side) and for any data the reader chooses to share.

### Backend Schema (SQLite)

The backend schema mirrors the document model for sync purposes. The current `schema/init.sql` uses session/sequence naming that maps to the document model as follows:

| Current | Document model | Role |
|---------|---------------|------|
| sessions | documents | Content container |
| sequences | blocks | Ordered content units |
| tokens | tokens | Per-token content + metadata |
| viewport_events | attention | Per-reading-session viewport time |
| annotations | annotations | Unchanged |

A `reading_sessions` table is needed on the backend for attention sync — scoping viewport events to a specific engagement with a document rather than to the document globally.

### tokens

Per-token metadata (logprob, entropy, surprisal, top_k) is nullable throughout. User-authored tokens and imported text have no inference metadata. Metadata can be backfilled later if a model is run over existing content. See the token_metadata table in [document-model.md](document-model.md).

### viewport_events (attention)

Append-only. The core L1 attention signal. Each row records one continuous interval where a block was visible in the viewport. AFK gating via `visibilitychange`/`blur` closes intervals and pauses the clock, so gaps represent genuine absence rather than idle staring.

The viewport interval model captures "was this block in the viewport, and for how long" without imputing intent. Finer-grained event types (selection, copy) belong at L2 when the user is deliberately interacting.

### annotations

Sparse, high-signal. The user's deliberate marks on token ranges.

---

## Data Flow Summary

**Reading flow**: Document loaded from IndexedDB (or fetched from backend/URL) → blocks rendered with per-token spans → pull-driven delivery: blocks appear as the reader scrolls into their space → attention accumulates locally in IndexedDB.

**Chat flow**: User input → backend tokenises and stores as user block → inference runs on local model or API → tokens stream over WebSocket with metadata → frontend renders per-token, persists to IndexedDB, backend persists to SQLite → reading session and chat session are the same object.

**Navigation flow**: Reader follows a link in a document → current position saved to reading session in IndexedDB → target document loaded (from IndexedDB if previously visited, from source if new) → new reading session created → timeline swaps to new content with prior attention restored → session flyout opens briefly showing open documents.

**Attention flow (L1)**: Frontend tracks block viewport visibility via IntersectionObserver, gated by `visibilitychange`/`blur` for AFK detection → per-block cumulative viewport time maintained live as `--attention` CSS custom property (0→1), driving visual warmth → attention data persists to IndexedDB → opt-in sync to backend via batched POST. No processing, no summarisation, no feedback to the model (yet).

**Annotation flow**: User deliberately selects and tags → stored locally in IndexedDB → optionally synced to backend → rendered as a subtle overlay on the document.

**Branch flow**: User requests inline expansion at a token position → backend creates a new child block forking from that position → generation streams into the new block → user reviews and marks as kept, changed, or discarded → status updated on the block record → frontend resolves the display to show the canonical path.

**Compression flow**: User requests compression of a block → backend generates a summary representation (via local model or API) → compressed version stored as a new block linked to the original → frontend renders the compressed version with an affordance for re-expansion → original tokens remain untouched in storage.

---

## Design Constraints and Principles

**Immutability of blocks**: Once tokens are written, they are never modified. This is the VCS invariant. All "editing" is branching. This guarantees that attention events and annotations always reference valid, stable positions.

**Frontend as primary store**: The reader's data (documents, attention, reading sessions) lives on their device in IndexedDB. The backend is a sync target, not the source of truth for the reader's own data. This follows the attention ownership principle: reader's data, reader's device, reader's choice to share.

**Raw storage, deferred analysis**: Attention events are stored as-is. Patterns, summaries, and derived signals are computed later — either on-demand or in batch. This avoids premature commitment to what matters before the data reveals it.

**Progressive disclosure at every level**: As described in [AI layers](ai-layers.md#progressive-disclosure-as-architecture), each layer is genuinely independent. The schema supports Layers 0–4 without requiring them. A fresh instance with no attention capture enabled is still a functional chat interface.

**No premature optimisation of the user-model**: The third predictive system will emerge from the accumulated attention data. Its architecture depends on what that data reveals. For now, the schema captures the raw material. The model comes later.

---

## Hardware Considerations (GTX 1070, 8GB VRAM)

Sub-1B models fit comfortably with room for batched logprob extraction. Recommended starting points for local iteration:

**Generation**: SmolLM 135M or 360M for rapid prototyping. TinyLlama 1.1B as the upper bound for single-model GPU occupancy. Quantised (4-bit GPTQ/AWQ) models extend the range — a 3B model quantised to 4-bit fits in ~4GB, leaving headroom.

**User-model (future)**: Likely not a full generative model. A small embedding model (e.g. all-MiniLM-L6-v2, ~80MB) or a lightweight classifier trained on accumulated attention data. Runs alongside the main model without contention.

**API fallback**: For high-quality generation when local models are insufficient, route to an API provider. The backend abstracts the inference source — the frontend and schema don't care where the tokens came from.

---

## Repository Structure

See CLAUDE.md for the canonical module map. Key architectural boundaries:

- `frontend/src/` — rendering, attention capture, IndexedDB storage (primary)
- `backend/` — FastAPI, SQLite (sync layer), inference (future)
- `schema/init.sql` — backend SQLite schema (to be aligned with document model naming)
- `docs/document-model.md` — authoritative data model: documents, blocks, reading sessions, attention

---

## Roadmap

The active roadmap and project state live in [CLAUDE.md](../CLAUDE.md) under "Current Priorities" and "Project State". This document describes how the system is built; what is built next is kept there so there is one canonical list that stays current.

---

*Same principle as the project itself: start with the essential structure, let complexity emerge from use. The schema captures everything. The interface reveals it progressively. The intelligence develops from what accumulates.*