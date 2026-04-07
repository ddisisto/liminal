# Liminal

A conversational interface that instruments human attention to create a co-evolutionary environment between user and model.

## Project State

UX proof-of-concept live at ddisisto.github.io/liminal/. Core interaction loop working: JIT pull (scroll-down at tip = next paragraph), per-token streaming with skip-on-pull, context-weight font scaling (blocks born large, shrink as context accumulates), mobile touch/pinch-to-zoom, fixed auto-growing input area, raw/rendered markdown toggle, light/dark theme with system preference detection, scroll-driven title animation, navigation controls (Home/End keys, on-screen buttons). GitHub Pages auto-deploys from main.

Backend functional: FastAPI + SQLite + WebSocket. Session persistence, demo content seeding, viewport event ingestion. Frontend connects to backend when available, falls back to mock data for GitHub Pages. L1 attention capture live: viewport time tracking with IntersectionObserver, AFK gating, live visual feedback (--attention CSS property drives border warmth). Real inference not yet implemented (static content seeded from project docs).

## Key Concepts

- **JIT inference**: Generation is pulled by the reader, not pushed by the model. One repeating primitive: client sends stop conditions, backend streams tokens until one fires, client decides what to do next. The pull cadence is itself the primary attention signal.
- **Cursor as central state**: The cursor is the user's reading position in the token stream — not decorative. Viewport position, tip detection, attention signal, and JIT triggering all derive from cursor state. Closer to `less` than to a web page.
- **Text as temporal medium**: Every token has a birth moment, metabolic state (entropy/surprisal), and attention history. Per-token addressability is non-negotiable — each token is a discrete DOM element with data attributes.
- **Buffered vs streaming**: History/initial load renders instantly (per-token spans, no animation). Live edge streams per-token with animation. The distinction maps to SQLite reads vs WebSocket inference.
- **Layer model**: L0 (conversation + JIT), L1 (attention capture from viewport time + pull cadence), L2 (annotation/tagging), L3 (entropy/surprisal overlays), L4 (semantic zoom), L5 (user model), L6 (adaptive phase boundary). L0-1 implemented.
- **Sequence immutability**: Once tokens are written, they are never modified. All editing is branching.
- **Viewport time as attention**: The L1 signal is simply "was this block in the viewport, and for how long." No imputed intent. AFK gating via visibilitychange/blur. Cumulative time drives live visual warmth and is persisted for later analysis.

## Architecture

- **Backend**: Python, FastAPI, WebSocket, SQLite (WAL mode, raw SQL), session management, viewport event ingestion
- **Frontend**: TypeScript, @chenglou/pretext (text measurement), Vite, native browser APIs, IntersectionObserver for attention
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
├── main.ts              # Entry point, JIT pull loop, render toggle, nav, title animation
├── session-client.ts    # Backend connection with mock fallback
├── viewport-tracker.ts  # L1 attention: IntersectionObserver, --attention CSS property
├── cursor.ts            # Reading position, movement, tip detection, change events
├── viewport.ts          # Follows cursor, scroll/touch/pinch detection, tip pull events
├── token-renderer.ts    # Per-token <span> creation, animation, data attributes
├── stream.ts            # Live token consumer with skip signal
├── timeline.ts          # Block sequence, context-weight scaling, buffered/rendered modes
├── input.ts             # Fixed auto-growing textarea, font scaling, submit handling
├── markdown.ts          # Minimal markdown-to-HTML renderer (no dependencies)
├── measurement.ts       # Pretext.js wrapper — font, layout, resize
├── types.ts             # TokenData, Block, BlockRole
└── mock.ts              # Loads project docs as mock conversation via Vite raw imports
```

## Docs

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

1. Real inference: local model loading, token metadata extraction, API fallback
2. Scrollback visual state (ambient dimming, temporal distance indicators)
3. Layer 2-3: annotation interface, entropy/surprisal overlays
4. Research survey topics 3 & 4 (predictive user modelling, adaptive difficulty) deferred until L5+

## Dev Environment

- Python venv at `.venv/` — `pip install -e ".[dev]"` for core, `".[inference]"` adds torch/transformers
- Backend: `uvicorn backend.main:app --reload --port 8000`
- Frontend: `npm install`, `npx vite` for dev server on port 3000
- SQLite DB auto-creates at `data/liminal.db` on backend startup
- Frontend works without backend (falls back to mock data for GitHub Pages)
- Vite config at root, frontend source in `frontend/`
