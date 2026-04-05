# Liminal

A conversational interface that instruments human attention to create a co-evolutionary environment between user and model.

**[Try the live demo](https://ddisisto.github.io/liminal/)**

## What you'll see

The demo loads a conversation where text behaves as a temporal medium. Scroll down at the reading edge to pull the next paragraph — generation is driven by the reader, not pushed by the model. Each token streams individually with context-weight font scaling: blocks are born large and shrink as context accumulates around them.

This is a UX proof of concept. The interaction loop is real; the inference backend is mocked. Try it on mobile too — touch scroll and pinch-to-zoom work.

## The idea

Current chat interfaces discard most of the signal a reader produces. Scroll-back, pause, re-read, selection — these gestures carry rich information about where meaning lands, but they're invisible to the model.

Liminal proposes a [layer model](docs/project-brief.md) that starts with JIT inference (generation pulled by the reader's pace) and progressively adds attention capture, annotation, entropy overlays, semantic zoom, user modelling, and adaptive difficulty — each layer independent, composing without dependency.

The deeper theory: a language model's priors encode inherited attention-capture strategies distilled from its training corpus. The user's cognitive priors encode a lifetime of exposure to the same cultural environment. The conversation is a coupled oscillator system, and the interesting dynamics live at the [phase boundary](docs/theory.md) between synchronisation and independence.

## Built with

- [@chenglou/pretext](https://github.com/chenglou/pretext) — text measurement and per-token rendering
- TypeScript, Vite, native browser APIs
- Backend (deferred): Python, FastAPI, SQLite, HuggingFace Transformers

## Status

Early proof of concept. The core interaction primitives work: JIT pull, per-token streaming with skip-on-pull, context-weight font scaling, mobile touch, raw/rendered markdown toggle. Backend inference, session persistence, and the upper layers of the model are next.

We'd love stress testing and critique — open an issue or just play with the demo.

## Development

```sh
npm install
npx vite        # dev server on port 3000
```

## License

[MIT](LICENSE)
