# UX Proof of Concept — Design Document

**Goal**: Prove that Pretext.js streaming token rendering works and feels right as the foundation for Liminal's temporal text model.

---

## Core Principle

Text is a temporal medium. Every token is a discrete, addressable element with a birth moment, metadata, and (future) attention history. The DOM structure must support per-token styling, animation, and interaction from day one — even when those features are not yet implemented.

---

## Layout

Three-column, fixed-width (~2000px initial target):

```
┌─────────────────────────────────────────────────────┐
│ Liminal                                             │
├──────────┬──────────────────────────────┬───────────┤
│          │                              │           │
│Navigator │   Conversation Timeline      │  Status   │
│          │                              │  Controls │
│          │                              │           │
│          │                              │           │
│          ├──────────────────────────────┤           │
│          │ [input]                      │           │
├──────────┴──────────────────────────────┴───────────┤
│ scrollbar / position indicator                      │
└─────────────────────────────────────────────────────┘
```

**Navigator (left)**: PoC shows current session name + "new session" button. Future: session list, branch tree, bookmarks.

**Conversation timeline (center)**: The primary surface. Streaming token rendering, source-alternating blocks, input area at bottom.

**Status/controls (right)**: PoC shows model name, token count, active stop conditions. Future: overlay toggles, entropy controls, analysis tools.

---

## Conversation Rendering

- Each turn is a **block**, visually distinct by source (user vs assistant) — subtle differentiation (thin side border or slight indent), not heavy chrome
- Assistant blocks render as **streaming per-token `<span>` elements**, each carrying data attributes (`data-position`, `data-logprob`, `data-entropy`, `data-surprisal`) even when not yet visualized
- User blocks render immediately as committed text
- Token arrival animation: brief opacity/scale ramp (~150ms), tokens grow in place. Prototype alternatives if this doesn't feel right.

---

## JIT Pull Interaction

One repeating primitive: client requests next token sequence with stop conditions, backend streams tokens, client decides what to do next.

**The cursor**: The user's position in the token stream — the central state object. Not a decorative blinking line but the single source of truth for viewport position, tip detection, attention signal, and JIT triggering. Closer to `less` than to a web page.

- Scroll events move the **cursor**, and the viewport follows the cursor
- During streaming, the cursor auto-advances with new tokens (unless the user has scrolled back)
- **Tip detection** is trivial: `cursor.position === stream.length`
- **At tip, scroll-down** = cursor has nowhere to go = triggers next inference pull
- **In scrollback, scroll-down** = cursor advances through existing content = normal navigation
- **Attention signal**: cursor position over time IS the reading trace — no separate dwell instrumentation needed for the basic signal

**Continue gesture**: scroll-down (at tip only). Covers mouse wheel, trackpad, touch scroll, arrow keys, PgDn. No keyboard shortcuts for now; expand later.

---

## Tip vs Scrollback — Visual State

This distinction is load-bearing. The user must always know whether they're at the live edge or in history, because the same gesture (scroll-down) means different things.

- **At tip**: full color, full presence. The conversation feels alive and current.
- **In scrollback**: progressive desaturation or dimming of the overall frame — not per-block, but ambient. The scrollbar region and/or side columns shift to indicate temporal distance.
- **Scrollbar**: custom or augmented indicator showing viewport position relative to full session. Tip region visually distinct. Future: overlay markers for bookmarks, search matches, attention hotspots.

---

## Input Area

- Always present at bottom of center column
- At tip: active text input. Submit (Enter) sends user turn, which is rendered as a user block, and the next assistant pull can begin
- In scrollback: visually muted. Typing could mean "branch from here" in future; for PoC, show "return to tip" affordance instead
- Minimal: single line, expanding to multi-line as needed

---

## PoC Scope — What We're Proving

1. **Per-token rendering works** — Pretext.js layout, individual `<span>` per token, data attributes plumbed
2. **Streaming feels right** — token arrival animation, paragraph-at-a-time pacing
3. **Cursor model works** — cursor as reading position, viewport follows cursor, tip detection from cursor state
4. **JIT pull interaction works** — scroll-down at tip triggers next chunk, scrollback is normal navigation

## PoC Scope — What We're Deferring

- Backend / real inference (mock token stream from local data)
- Markdown rendering (raw tokens — `*italics*` renders as `*italics*`)
- Attention capture beyond JIT cadence (selection, copy, dwell instrumentation)
- Annotation interface (Layer 2)
- Analytical overlays (Layer 3)
- Branching / expansion / compression (Layer 4)
- Navigator and status panel functionality (shells only)
- Mobile / responsive layout
- Persistence / SQLite

---

## Module Architecture

```
frontend/src/
├── main.ts              # Wires modules together, page layout, input area, JIT loop
├── cursor.ts            # Reading position in token stream, movement, tip query, events
├── viewport.ts          # Follows cursor, DOM scrolling, visual tip/scrollback state
├── token-renderer.ts    # Creates per-token <span>, animation, data attributes
├── stream.ts            # Token consumer (mock timer now, WebSocket later), advances cursor
├── timeline.ts          # Block sequence, turn data model, conversation structure
├── measurement.ts       # Pretext.js wrapper — font, layout, resize, cache
├── types.ts             # TokenData, BlockRole, shared interfaces
└── mock.ts              # Pre-tokenized text with fake metadata
```

**Key boundary**: `stream.ts` and `timeline.ts` don't know about each other. `main.ts` connects them — "when a stream finishes and cursor is at tip, wait for scroll-down, then start the next stream." That's the JIT loop.

**The cursor is the central state object.** Timeline, stream, and viewport all reference cursor position. Tip detection, attention capture, and viewport management are all cursor position queries — not separate systems.

## Technical Approach

**No backend for PoC.** Mock the token stream with pre-tokenized text + fake metadata, delivered on a timer simulating ~40 tokens/sec. This isolates the Pretext.js rendering risk from backend concerns.

**Vite dev server** for hot reload during iteration.

**Pretext.js** (`@chenglou/pretext`) for text measurement. Key unknown: how it integrates with per-token DOM rendering during streaming. This is the primary thing the PoC exists to answer.

---

*Start with the token. Get the token right. Everything else builds on that.*
