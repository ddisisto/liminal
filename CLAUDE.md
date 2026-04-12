# Liminal

An attention instrument. Tracks and visualises the reader's own attention patterns — for the reader's benefit, not the server's. Works with any content: static text, uploaded documents, or generated conversation.

## Project State

UX proof-of-concept live at ddisisto.github.io/liminal/. Core interaction loop working: JIT pull (scroll-down at tip = next paragraph), per-token streaming with skip-on-pull, block-length font scaling (short blocks are large/prominent, long blocks settle smaller), mobile touch/pinch-to-zoom, fixed auto-growing input area, raw/rendered markdown toggle, light/dark theme with system preference detection, scroll-driven hero title animation, navigation controls (Home/End keys, on-screen buttons). GitHub Pages auto-deploys from main.

Backend functional: FastAPI + SQLite + WebSocket. Session persistence, demo content seeding, viewport event ingestion. Frontend connects to backend when available, falls back to mock data for GitHub Pages. L1 attention capture live: viewport time tracking with IntersectionObserver, AFK gating, live visual feedback (--attention CSS property drives border warmth). Real inference not yet implemented (static content seeded from project docs).

Branch `reading-instrument` has work-in-progress: text import (paste/file/URL via `?url=` and `?source=local`), block indexing (DOM ids, hash navigation), vh-based pull threshold, hero title unified into timeline as first block.

## Key Concepts

- **Attention ownership**: Attention data belongs to the reader. Captured locally, stored locally, never transmitted without consent. The reader benefits directly — visible reading history reduces cognitive load on revisitation. Sharing is opt-in: to authors, communities, or models.
- **JIT pull**: Content is pulled by the reader, not pushed. The pull gesture ("I'm ready for more") and its timing are the primary attention signal. Works for any content source — static text, uploaded documents, or model inference.
- **Text as temporal medium**: Every token has a birth moment, metabolic state (entropy/surprisal), and attention history. Per-token addressability is non-negotiable — each token is a discrete DOM element with data attributes.
- **Buffered vs streaming**: History/initial load renders instantly (per-token spans, no animation). Live edge streams per-token with animation. The distinction maps to SQLite reads vs WebSocket inference.
- **Layer model**: L0 (pull-driven pacing), L1 (attention capture from viewport time + pull cadence), L2 (annotation/tagging), L3 (entropy/surprisal overlays), L4 (semantic zoom), L5 (user model), L6 (adaptive phase boundary). L0-1 implemented.
- **Sequence immutability**: Once tokens are written, they are never modified. All editing is branching.
- **Viewport time as attention**: The L1 signal is simply "was this block in the viewport, and for how long." No imputed intent. AFK gating via visibilitychange/blur. Cumulative time drives live visual warmth and is persisted for later analysis.

## Architecture

- **Backend**: Python, FastAPI, WebSocket, SQLite (WAL mode, raw SQL), session management, viewport event ingestion
- **Frontend**: TypeScript, Vite, native browser APIs, IntersectionObserver for attention
- **Inference**: Deferred — currently static content seeded from docs. Future: HuggingFace Transformers (local GPU), API fallback
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
├── settings.ts          # Settings panel — cog flyout, theme/markup/pace controls
├── styles.css           # All CSS (extracted from index.html)
├── session-client.ts    # Backend connection, text import, mock fallback
├── viewport-tracker.ts  # L1 attention: IntersectionObserver, --attention CSS property
├── cursor.ts            # Reading position, movement, tip detection, change events
├── viewport.ts          # Follows cursor, scroll/touch/pinch detection, tip pull events
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
- `docs/ux-poc-design.md` — UX PoC requirements, cursor model, module architecture

## Conventions

- Commit messages: imperative mood, explain "why" not "what", include Co-Authored-By for Claude
- Docs live in `docs/`, research in `docs/research/`
- Design decisions should be captured in the relevant doc, not scattered across code comments
- When in doubt, prefer simplicity. One primitive over two. Fewer message types over more.

## Current Priorities

1. Session management: upload docs, start chat sessions, manage session data
2. Merge `reading-instrument` branch: text import, block indexing, hero-in-timeline
3. Within and cross-session links, session data views
4. Real inference: local model loading, token metadata extraction, API fallback
5. Scrollback visual state (ambient dimming, temporal distance indicators)
6. Layer 2-3: annotation interface, entropy/surprisal overlays

## Dev Environment

- Python venv at `.venv/` — `pip install -e ".[dev]"` for core, `".[inference]"` adds torch/transformers
- Backend: `uvicorn backend.main:app --reload --port 8000`
- Frontend: `npm install`, `npx vite` for dev server on port 3000
- SQLite DB auto-creates at `data/liminal.db` on backend startup
- Frontend works without backend (falls back to mock data for GitHub Pages)
- Vite config at root, frontend source in `frontend/`
