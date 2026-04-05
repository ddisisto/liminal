# Liminal

A conversational interface that instruments human attention to create a co-evolutionary environment between user and model.

**[Try the live demo](https://ddisisto.github.io/liminal/)**

## What you'll see

The demo loads a conversation where text behaves as a temporal medium. Scroll down at the reading edge to pull the next paragraph — generation is driven by the reader, not pushed by the model. Each token streams individually with context-weight font scaling: blocks are born large and shrink as context accumulates around them.

As you read, the blocks you spend time on develop a warm border — that's live attention tracking via viewport time. It's the first layer of the attention model, running entirely in the browser.

This is a UX proof of concept. The interaction loop is real; the inference backend serves static content (real inference is next). Try it on mobile too — touch scroll and pinch-to-zoom work.

## The idea

Current chat interfaces discard most of the signal a reader produces. Scroll-back, pause, re-read, selection — these gestures carry rich information about where meaning lands, but they're invisible to the model.

Liminal proposes a [layer model](docs/project-brief.md) that starts with JIT inference (generation pulled by the reader's pace) and progressively adds attention capture, annotation, entropy overlays, semantic zoom, user modelling, and adaptive difficulty — each layer independent, composing without dependency.

The deeper theory: a language model's priors encode inherited attention-capture strategies distilled from its training corpus. The user's cognitive priors encode a lifetime of exposure to the same cultural environment. The conversation is a coupled oscillator system, and the interesting dynamics live at the [phase boundary](docs/theory.md) between synchronisation and independence.

## Built with

- [@chenglou/pretext](https://github.com/chenglou/pretext) — text measurement and per-token rendering
- TypeScript, Vite, native browser APIs, IntersectionObserver for attention capture
- Python, FastAPI, SQLite (WAL mode), WebSocket streaming

## Status

L0-1 implemented. The core interaction primitives work: JIT pull, per-token streaming with skip-on-pull, context-weight font scaling, viewport-time attention tracking with live visual feedback, light/dark theme, mobile touch. Backend serves sessions over REST and WebSocket, persists viewport events to SQLite. Frontend falls back to mock data when no backend is running (the live demo runs without one).

Next: real inference (local models via HuggingFace Transformers), then layers 2-3 (annotation, entropy overlays).

We'd love stress testing and critique — open an issue or just play with the demo.

## Development

```sh
# Frontend only (mock data, works standalone)
npm install
npx vite                # dev server on port 3000

# With backend (session persistence, viewport event capture)
pip install -e ".[dev]"
uvicorn backend.main:app --reload --port 8000
npx vite                # in another terminal
```

## License

[MIT](LICENSE)
