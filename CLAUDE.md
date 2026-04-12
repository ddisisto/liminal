# Liminal

An attention instrument. Tracks and visualises the reader's own attention patterns — for the reader's benefit, not the server's. Works with any content: static text, uploaded documents, or generated conversation.

## Project State

Live at ddisisto.github.io/liminal/. Core reading loop: fully pull-driven from first block, per-token streaming with skip-on-pull, block-length font scaling, mobile touch/pinch-to-zoom, settings panel (cog flyout: theme, markup, pace/gap sliders with quadratic scaling), nav controls. GitHub Pages auto-deploys from main.

IndexedDB storage layer implemented: documents, blocks, reading sessions, attention all persist locally. Settings persist to localStorage. Mock data imports once then loads from IndexedDB on subsequent visits. Attention warmth carries across page loads.

Backend functional but not actively used: FastAPI + SQLite + WebSocket. Will become sync layer and inference host when conversations are implemented. L1 attention capture live: viewport time tracking with IntersectionObserver, AFK gating, live visual feedback (--attention CSS property drives border warmth), persisted to IndexedDB.

Next milestone: transition from mock conversation to document reader. Documents form a navigable graph through links. The self-hosted demo becomes an instrumented browser of the project's own docs. Conversations (via backend inference) become a document type in the same graph.

## Key Concepts

- **Attention ownership**: Attention data belongs to the reader. Captured locally, stored locally, never transmitted without consent. The reader benefits directly — visible reading history reduces cognitive load on revisitation. Sharing is opt-in: to authors, communities, or models.
- **JIT pull**: Content is pulled by the reader, not pushed. The pull gesture ("I'm ready for more") and its timing are the primary attention signal. Works for any content source — static text, uploaded documents, or model inference.
- **Text as temporal medium**: Every token has a birth moment, metabolic state (entropy/surprisal), and attention history. Per-token addressability is non-negotiable — each token is a discrete DOM element with data attributes.
- **Document graph**: Documents link to each other, forming a navigable graph. Following a link hot-loads the target. Conversations fork from content documents. The graph is the navigation — no separate file browser needed.
- **Buffered vs streaming**: Stored documents render instantly (per-token spans, no animation). Live edge (chat) streams per-token with animation. The distinction maps to IndexedDB reads vs WebSocket inference.
- **Layer model**: L0 (pull-driven pacing), L1 (attention capture from viewport time + pull cadence), L2 (annotation/tagging), L3 (entropy/surprisal overlays), L4 (semantic zoom), L5 (user model), L6 (adaptive phase boundary). L0-1 implemented.
- **Document immutability**: Once tokens are written, they are never modified. All editing is branching.
- **Viewport time as attention**: The L1 signal is simply "was this block in the viewport, and for how long." No imputed intent. AFK gating via visibilitychange/blur. Cumulative time drives live visual warmth and is persisted for later analysis.

## Architecture

- **Frontend**: TypeScript, Vite, IndexedDB (primary store), native browser APIs, IntersectionObserver for attention
- **Backend**: Python, FastAPI, WebSocket, SQLite (sync layer, inference host)
- **Inference**: Deferred — currently static content from docs. Future: HuggingFace Transformers (local GPU), API fallback
- **Hardware target**: NVIDIA GTX 1070, 8GB VRAM

## Module Map

```
backend/
├── main.py              # FastAPI app, REST + WebSocket endpoints
├── sessions.py          # Session lifecycle, mainline reconstruction, demo seeding
└── storage/
    └── database.py      # SQLite connection, schema init, CRUD

schema/
└── init.sql             # Sessions, sequences, tokens, viewport_events, annotations

frontend/src/
├── main.ts              # Entry point, JIT pull loop, hero animation, nav
├── store.ts             # IndexedDB — documents, blocks, reading sessions, attention
├── settings.ts          # Settings panel — cog flyout, theme/markup/pace controls
├── styles.css           # All CSS (extracted from index.html)
├── session-client.ts    # Document loading: backend → IndexedDB → mock import
├── viewport-tracker.ts  # L1 attention: IntersectionObserver, --attention CSS property, IndexedDB persist
├── viewport.ts          # Scroll/touch/pinch detection, gap pull, nav-end fade
├── token-renderer.ts    # Per-token <span> creation, animation, data attributes
├── stream.ts            # Live token consumer with skip signal
├── timeline.ts          # Block sequence, block-length scaling, buffered/rendered modes
├── input.ts             # Fixed auto-growing textarea, font scaling, submit handling
├── markdown.ts          # Minimal markdown-to-HTML renderer (no dependencies)
├── types.ts             # TokenData, Block, BlockRole
└── mock.ts              # Loads project docs as mock conversation via Vite raw imports
```

## Docs

- `docs/attention-ownership.md` — attention inversion thesis, reader ownership, sharing implications
- `docs/project-brief.md` — conceptual design, layer model, design principles
- `docs/architecture-plan.md` — stack, schema, data flow, component boundaries, WebSocket protocol
- `docs/theory.md` — coupled oscillator analogy, game theory, memetic acceleration
- `README.md` — demo page intro content, self-hosted through the live demo
- `docs/research/attention-instrumentation.md` — prior art and implementation priorities for attention capture
- `docs/research/token-annotation-systems.md` — prior art for token visualization and annotation UX
- `docs/document-model.md` — document/block/reading-session data model, IndexedDB + SQLite storage
- `docs/ui-settings-control.md` — settings panel design, controls inventory, interaction spec

## Conventions

- Commit messages: imperative mood, explain "why" not "what", include Co-Authored-By for Claude
- Docs live in `docs/`, research in `docs/research/`
- Design decisions should be captured in the relevant doc, not scattered across code comments
- When in doubt, prefer simplicity. One primitive over two. Fewer message types over more.

## Current Priorities

1. Document reader: strip mock conversation, load docs as content blocks, link interception for graph navigation
2. Session flyout: open documents list with reading positions, auto-opens on switch
3. Document management: import (paste, file, URL), remove
4. Conversations: connect backend inference, chat as live document, conversation fork from content
5. Layer 2-3: annotation interface, entropy/surprisal overlays
6. Reflective layer: RAG over document graph and attention history

## Dev Environment

- Python venv at `.venv/` — `pip install -e ".[dev]"` for core, `".[inference]"` adds torch/transformers
- Backend: `uvicorn backend.main:app --reload --port 8000`
- Frontend: `npm install`, `npx vite` for dev server on port 3000
- SQLite DB auto-creates at `data/liminal.db` on backend startup
- Frontend works without backend (IndexedDB primary, mock data import on first load)
- Vite config at root, frontend source in `frontend/`
