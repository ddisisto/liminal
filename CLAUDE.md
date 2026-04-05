# Liminal

A conversational interface that instruments human attention to create a co-evolutionary environment between user and model.

## Project State

UX proof-of-concept live at ddisisto.github.io/liminal/. Core interaction loop working: JIT pull (scroll-down at tip = next paragraph), per-token streaming with skip-on-pull, context-weight font scaling (blocks born large, shrink as context accumulates), mobile touch/pinch-to-zoom, fixed auto-growing input area, raw/rendered markdown toggle. GitHub Pages auto-deploys from main. Module architecture extracted and stable. Backend deferred.

## Key Concepts

- **JIT inference**: Generation is pulled by the reader, not pushed by the model. One repeating primitive: client sends stop conditions, backend streams tokens until one fires, client decides what to do next. The pull cadence is itself the primary attention signal.
- **Cursor as central state**: The cursor is the user's reading position in the token stream — not decorative. Viewport position, tip detection, attention signal, and JIT triggering all derive from cursor state. Closer to `less` than to a web page.
- **Text as temporal medium**: Every token has a birth moment, metabolic state (entropy/surprisal), and attention history. Per-token addressability is non-negotiable — each token is a discrete DOM element with data attributes.
- **Buffered vs streaming**: History/initial load renders instantly (per-token spans, no animation). Live edge streams per-token with animation. The distinction maps to SQLite reads vs WebSocket inference.
- **Layer model**: L0 (conversation + JIT), L1 (attention capture from pull cadence + browser events), L2 (annotation/tagging), L3 (entropy/surprisal overlays), L4 (semantic zoom), L5 (user model), L6 (adaptive phase boundary). Building L0-1 first.
- **Sequence immutability**: Once tokens are written, they are never modified. All editing is branching.

## Architecture

- **Backend**: Python, FastAPI, WebSocket, SQLite, HuggingFace Transformers (local GPU) — deferred, known-solvable
- **Frontend**: TypeScript, @chenglou/pretext (text measurement), Vite, native browser APIs
- **Local models**: Sub-1B for prototyping (SmolLM 135M/360M, TinyLlama), API fallback for quality
- **Hardware target**: NVIDIA GTX 1070, 8GB VRAM

## Frontend Modules

```
frontend/src/
├── main.ts              # Wires modules, JIT pull loop, buffered initial load, render toggle
├── cursor.ts            # Reading position, movement, tip detection, change events
├── viewport.ts          # Follows cursor, scroll/touch/pinch detection, tip pull events
├── token-renderer.ts    # Per-token <span> creation, animation, data attributes
├── stream.ts            # Live token consumer with skip signal (mock timer → WebSocket later)
├── timeline.ts          # Block sequence, context-weight scaling, buffered/rendered modes
├── input.ts             # Fixed auto-growing textarea, font scaling, submit handling
├── markdown.ts          # Minimal markdown-to-HTML renderer (no dependencies)
├── measurement.ts       # Pretext.js wrapper — font, layout, resize
├── types.ts             # TokenData, Block, BlockRole
├── mock.ts              # Loads project docs as mock conversation via Vite raw imports
└── spike.ts             # Original spike (preserved for reference)
```

## Docs

- `docs/project-brief.md` — conceptual design, layer model, design principles
- `docs/architecture-plan.md` — stack, schema, data flow, component boundaries, WebSocket protocol
- `docs/theory.md` — coupled oscillator analogy, game theory, memetic acceleration
- `docs/research/attention-instrumentation.md` — prior art and implementation priorities for attention capture
- `docs/research/token-annotation-systems.md` — prior art for token visualization and annotation UX
- `docs/ux-poc-design.md` — UX PoC requirements, cursor model, module architecture

## Conventions

- Commit messages: imperative mood, explain "why" not "what", include Co-Authored-By for Claude
- Docs live in `docs/`, research in `docs/research/`
- Design decisions should be captured in the relevant doc, not scattered across code comments
- When in doubt, prefer simplicity. One primitive over two. Fewer message types over more.

## Current Priorities

1. Backend: inference, session persistence, real user interaction
2. Scrollback visual state (ambient dimming, temporal distance indicators)
3. Research survey topics 3 & 4 (predictive user modelling, adaptive difficulty) deferred until L5+

## Dev Environment

- Python venv at `.venv/` — `pip install -e ".[dev]"` for core, `".[inference]"` adds torch/transformers
- npm — `npm install`, `npx vite` for dev server on port 3000
- Vite config at root, frontend source in `frontend/`
