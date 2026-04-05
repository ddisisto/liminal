# Liminal — Architecture Document

**Phase 1: Stack, Schema, Data Flow, and Component Boundaries**

---

## Overview

Liminal is a self-hosted, browser-based conversational interface with passive attention instrumentation and progressive analytical depth. The architecture prioritises simplicity, low infrastructure overhead, and clean separation between concerns — while preserving room for the system to grow into the more speculative layers described in the project brief.

The system is single-user, local-first, and designed to run on modest hardware (NVIDIA GTX 1070, 8GB VRAM) during the prototyping phase.

---

## Stack Summary

**Backend**: Python, FastAPI, WebSocket streaming, SQLite
**Inference**: HuggingFace Transformers (local GPU), optional API inference providers
**Frontend**: Lightweight TypeScript, Pretext.js for text measurement, native browser APIs for attention capture
**Storage**: SQLite (single file, zero infrastructure, graduable to Postgres if needed)
**Local models**: Sub-1B parameter models for rapid design iteration (SmolLM 135M/360M, TinyLlama, or similar)

---

## Component Architecture

### Backend (Python / FastAPI)

The backend is the intelligence layer. It handles:

**Session and sequence management** — session lifecycle, sequence tree traversal, mainline reconstruction from kept/active status chains. Demo content seeding from project docs on startup. Implemented in `backend/sessions.py`.

**Storage** — SQLite with WAL mode, raw SQL (no ORM). CRUD for sessions, sequences, tokens, viewport events. Schema initialised from `schema/init.sql`. Implemented in `backend/storage/database.py`.

**Viewport event ingestion** — receives batched viewport visibility intervals from the frontend via POST `/api/viewport-events`. Writes directly to SQLite. Raw storage, analysis deferred.

**Inference orchestration (future)** — local model loading via HF Transformers, API provider routing, token metadata extraction (logprob, entropy, surprisal). Currently, sessions are seeded with static content; real inference replaces the seeding path.

**User-model (future)** — placeholder for the third predictive system. Initially, this is just the accumulated attention data in SQLite. Later, a lightweight model (embedding-based or classifier) that runs locally and predicts user behaviour from accumulated signal.

**User-model (future)** — placeholder for the third predictive system. Initially, this is just the accumulated attention data in SQLite. Later, a lightweight model (embedding-based or classifier) that runs locally and predicts user behaviour from accumulated signal.

### Frontend (TypeScript / Pretext.js)

The frontend is the sensing and rendering layer. It stays deliberately thin.

**Conversation renderer** — streams tokens from the WebSocket and renders them as they arrive. Uses Pretext.js for text measurement, enabling precise spatial knowledge of every token's position without DOM reflow. This is the foundation for all overlay and annotation features.

**Attention capture (L1)** — viewport time tracking via IntersectionObserver, gated by `visibilitychange`/`blur` for AFK detection. Per-block cumulative viewport time is maintained in-memory and exposed as a `--attention` CSS custom property (0→1), driving live visual warmth on block borders. Completed intervals are batched and POSTed to the backend every 5s. Finer-grained instrumentation (selection events via Selection API, copy events via clipboard API) is a future L2 concern.

**Annotation interface** — on explicit user action (e.g. selecting text and invoking a minimal context menu), allows tagging a token range with a freeform label. This is the Layer 2 interaction — same gesture as passive selection but with intentional commitment. The UI for this should be near-invisible: a small floating input that appears at the selection point, accepts text, and vanishes.

**Analytical overlays (Layer 3)** — renders entropy, surprisal, and other token-level metrics as visual layers over the conversation text. Implementation via a canvas or SVG layer positioned using Pretext.js geometry. Zoom and pan controls for navigating the sequence as a spatial object. These overlays are opt-in — hidden by default, available on demand.

**Inline expansion and compression (Layer 4)** — at any token position, the user can request additional generation (expansion) or collapse a block to a summary (compression). Expansion opens an inline editing region, the backend generates into a new branch sequence, and the user can keep, modify, or discard before advancing. Compression is non-destructive — the original tokens remain in storage, a compressed representation is generated and displayed, and re-expansion is always available. The renderer needs to handle displaying both branch state and variable-resolution content cleanly — subtle visual cues without disrupting the reading flow.

### JIT Inference and the Pull Primitive

Generation is driven by a single repeating primitive: the client requests the next token sequence, passing stop conditions (`stop_tokens`, `max_tokens`) directly. The backend streams tokens until a stop condition fires, then waits. The client decides what to do next.

```
Client → Backend:  { "sequence_id": "seq_abc123", "stop_tokens": ["\n\n"], "max_tokens": 512 }
Backend → Client:  [token stream...]
Backend → Client:  { "type": "stopped", "reason": "stop_token" | "eos" | "max_tokens" }
```

By default, `stop_tokens` includes `\n\n` (paragraph boundary), making the model generate one paragraph at a time. The user advances by scrolling to the end or pressing space — the same gesture that signals "I've read this, continue." EOS is not special; it just means the model has nothing more to say, and the frontend shows this differently (e.g. prompting for user input rather than offering a continue affordance).

This is JIT inference: generation is pulled by the reader's pace, not pushed by the model. The user physically cannot advance without their viewport being on the new content. The cadence of pull requests is itself the primary attention signal — paragraph-level dwell with near-perfect reliability, requiring zero additional instrumentation.

This works identically for local inference (HF Transformers `stopping_criteria`) and API inference (`stop_tokens` + prefill), both standard alongside `logprobs` support. The schema is unaffected — sequences are bounded by EOS/BOS as before; a stop-token simply causes the boundary to occur sooner.

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

## Storage Schema (SQLite)

### sessions

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| created_at | TIMESTAMP | |
| title | TEXT | Optional, user-assigned or auto-generated |
| metadata | TEXT | JSON blob for extensibility |

### sequences

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| session_id | TEXT FK | References sessions.id |
| parent_sequence_id | TEXT | Nullable. NULL for root sequences |
| fork_position | INTEGER | Nullable. Token index in parent where branch diverges |
| role | TEXT | "user" or "assistant" |
| status | TEXT | "active", "kept", "discarded" |
| created_at | TIMESTAMP | |

A session's conversation is a tree of sequences. The mainline path is reconstructed by following the chain of "kept" or "active" sequences. Each message turn (user or assistant) is one sequence. Inline expansions create child sequences branching from a token position within an existing sequence.

### tokens

| Column | Type | Notes |
|--------|------|-------|
| sequence_id | TEXT FK | References sequences.id |
| position | INTEGER | 0-indexed within sequence |
| text | TEXT | The token string |
| logprob | REAL | Nullable (user-authored tokens have no logprob) |
| entropy | REAL | Nullable |
| surprisal | REAL | Nullable |
| top_k | TEXT | JSON array of {token, logprob} pairs. Nullable |
| PRIMARY KEY | | (sequence_id, position) |

Positional indexing within each sequence. Unambiguous because sequences are immutable — once written, tokens are never modified.

### viewport_events

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| session_id | TEXT | References sessions.id |
| sequence_id | TEXT | References sequences.id |
| visible_from | TEXT | ISO 8601 timestamp — entered viewport |
| visible_to | TEXT | ISO 8601 timestamp — left viewport |
| duration_ms | INTEGER | Precomputed for convenience |
| confidence | TEXT | "active", "idle", "uncertain" |

Append-only. The core L1 attention signal. Each row records one continuous interval where a block was visible in the viewport. AFK gating via `visibilitychange`/`blur` closes intervals and pauses the clock, so gaps represent genuine absence rather than idle staring. The frontend accumulates per-block viewport time and exposes it as a `--attention` CSS custom property (0→1) for live visual feedback (border colour warmth).

Earlier designs specified per-event-type tracking (selection, copy, dwell, scroll_into_view). The viewport interval model is simpler and more honest for L1 — it captures "was this block in the viewport, and for how long" without imputing intent. Finer-grained event types (selection, copy) belong at L2 when the user is deliberately interacting.

### annotations

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| sequence_id | TEXT FK | References sequences.id |
| start_position | INTEGER | Start token index |
| end_position | INTEGER | End token index (inclusive) |
| label | TEXT | Freeform user-provided text |
| classification | TEXT | Nullable. Optional structured tag |
| created_at | TIMESTAMP | |

Sparse, high-signal. The user's deliberate marks.

---

## Data Flow Summary

**Generation flow**: User input → backend tokenises and stores as user sequence → inference runs on local model or API → tokens stream over WebSocket with metadata → frontend renders via Pretext.js, backend persists to tokens table → frontend accumulates spatial model of rendered text.

**Attention flow (L1)**: Frontend tracks block viewport visibility via IntersectionObserver, gated by `visibilitychange`/`blur` for AFK detection → completed intervals batched and POSTed to `/api/viewport-events` every 5s → backend writes to viewport_events table. Cumulative viewport time per block is also maintained live in the frontend as a `--attention` CSS custom property (0→1), driving visual warmth on the block border. No processing, no summarisation, no feedback to the model (yet). Finer-grained events (selection, copy) are a future L2 concern.

**Annotation flow**: User deliberately selects and tags → frontend sends annotation to backend → stored in annotations table → annotation optionally rendered as a subtle overlay on the conversation.

**Branch flow**: User requests inline expansion at a token position → backend creates a new child sequence forking from that position → generation streams into the new sequence → user reviews and marks as kept, changed, or discarded → status updated on the sequence record → frontend resolves the display to show the canonical path.

**Compression flow**: User requests compression of a block → backend generates a summary representation (via local model or API) → compressed version stored as a new sequence linked to the original → frontend renders the compressed version with an affordance for re-expansion → original tokens remain untouched in storage. Attention decay can surface compression candidates automatically based on the time-weighted attention signal, but compression is always user-confirmed, never automatic.

---

## Design Constraints and Principles

**Immutability of sequences**: Once tokens are written, they are never modified. This is the VCS invariant. All "editing" is branching. This guarantees that attention events and annotations always reference valid, stable positions.

**Frontend stays thin**: No intelligence in the browser. It renders, captures, and visualises. All inference, metadata computation, and sequence management lives in the backend.

**Raw storage, deferred analysis**: Attention events are stored as-is. Patterns, summaries, and derived signals are computed later — either on-demand or in batch. This avoids premature commitment to what matters before the data reveals it.

**Progressive disclosure at every level**: As described in the [project brief](project-brief.md#progressive-disclosure-as-architecture), each layer is genuinely independent. The schema supports Layers 0–4 without requiring them. A fresh instance with no attention capture enabled is still a functional chat interface.

**No premature optimisation of the user-model**: The third predictive system will emerge from the accumulated attention data. Its architecture depends on what that data reveals. For now, the schema captures the raw material. The model comes later.

---

## Hardware Considerations (GTX 1070, 8GB VRAM)

Sub-1B models fit comfortably with room for batched logprob extraction. Recommended starting points for local iteration:

**Generation**: SmolLM 135M or 360M for rapid prototyping. TinyLlama 1.1B as the upper bound for single-model GPU occupancy. Quantised (4-bit GPTQ/AWQ) models extend the range — a 3B model quantised to 4-bit fits in ~4GB, leaving headroom.

**User-model (future)**: Likely not a full generative model. A small embedding model (e.g. all-MiniLM-L6-v2, ~80MB) or a lightweight classifier trained on accumulated attention data. Runs alongside the main model without contention.

**API fallback**: For high-quality generation when local models are insufficient, route to an API provider. The backend abstracts the inference source — the frontend and schema don't care where the tokens came from.

---

## Repository Structure

```
liminal/
├── backend/
│   ├── main.py              # FastAPI app, REST + WebSocket endpoints
│   ├── sessions.py          # Session lifecycle, mainline reconstruction, demo seeding
│   ├── storage/
│   │   └── database.py      # SQLite connection, schema init, CRUD
│   └── inference/            # (future) HF Transformers local generation, API providers
├── frontend/
│   ├── index.html            # Styles, theme, layout (CSS custom properties)
│   └── src/
│       ├── main.ts           # Entry point, JIT pull loop, render toggle, nav, title animation
│       ├── session-client.ts # Backend connection with mock fallback
│       ├── cursor.ts         # Reading position, tip detection, change events
│       ├── viewport.ts       # Scroll/touch/pinch, tip pull events
│       ├── viewport-tracker.ts # L1 attention: IntersectionObserver, --attention CSS property
│       ├── token-renderer.ts # Per-token <span> creation, animation, data attributes
│       ├── stream.ts         # Token consumer with skip signal
│       ├── timeline.ts       # Block sequence, context-weight scaling, markdown rendering
│       ├── input.ts          # Fixed auto-growing textarea
│       ├── markdown.ts       # Minimal markdown-to-HTML renderer
│       ├── measurement.ts    # Pretext.js wrapper
│       ├── types.ts          # TokenData, Block, BlockRole
│       └── mock.ts           # Static demo content from project docs
├── schema/
│   └── init.sql              # SQLite schema (sessions, sequences, tokens, viewport_events, annotations)
├── pyproject.toml
├── package.json
└── README.md
```

---

## Next Phases

1. ~~**Research survey**~~ — done: attention instrumentation, token annotation systems. Predictive user modelling and adaptive difficulty deferred to L5+.
2. ~~**Layer 0–1 prototype**~~ — done: FastAPI + WebSocket + SQLite, per-token rendering via Pretext.js, JIT pull, viewport-time attention capture with live visual feedback.
3. **Real inference** — local model loading (HF Transformers), token metadata extraction (logprob, entropy, surprisal), API provider fallback. Replace demo seeding with live generation.
4. **Layer 2–3 build** — annotation interface, entropy/surprisal overlay. The "now I can see what the model was thinking" milestone.
5. **Layer 4 exploration** — inline expansion and compression. The "conversation as working document" milestone.
6. **User-model research** — analyse accumulated attention data, design the third predictive system.

---

*Same principle as the project itself: start with the essential structure, let complexity emerge from use. The schema captures everything. The interface reveals it progressively. The intelligence develops from what accumulates.*