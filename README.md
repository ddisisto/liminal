# Liminal

*an attention instrument*

[Use the reader](https://ddisisto.github.io/liminal/) · [Explore the source](https://github.com/ddisisto/liminal)

This page isn't finished. Not because it's broken — because you haven't read it yet. The next piece arrives when you scroll down. Your pace, your decision.

## The pull

By now you've done it several times without thinking about it. Scroll to the bottom, get the next piece. It's a small inversion — instead of everything arriving at once, you set the pace. The rhythm of your reading becomes part of the interface.

This isn't lazy loading or infinite scroll. There's no buffer waiting offscreen. Each paragraph appears because you asked for it — you, at the bottom edge, requesting more. That request is a signal. It says "I'm ready" — and its *timing* says something about how you engaged with what came before.

## What you're feeling

Not all blocks are the same size. Short statements are prominent — anchors, turning points. Longer passages settle into a density that invites sustained reading. The text's visual weight comes from what it *is*, not when it arrived.

The blocks you've spent time on are warming. Scroll back and you'll see it — a subtle shift in the left border, building with accumulated attention. That warmth is yours: your reading history, made visible, reducing the cognitive load of returning to something you've already engaged with.

## The inversion

Every scroll, pause, and click you make on the internet is already tracked — by the server, for the server's purposes, through means entirely opaque to you. Your attention is one of the most valuable commodities online, and you have no seat at the table.

Liminal inverts this. The attention tracking you're experiencing right now is captured locally, stored locally, never transmitted without your explicit consent. You own your attention data. Ownership implies agency — including the choice to share it, with [authors, communities, or models](docs/attention-ownership.md).

## What this is

A reading instrument. Any text can be loaded into it — a blog post, a research paper, a conversation with a language model. The attention layer doesn't care about the source. It cares about the reader.

Underneath, every word is individually addressable. Each token is its own element — it can be styled, tracked, or annotated independently. This gives per-word resolution for everything: visual weight, attention measurement, and eventually [entropy overlays](docs/project-brief.md) that reveal what the model found surprising about its own output.

The [design philosophy](docs/design-philosophy.md) starts from a single principle: the reader owns the viewport. The system writes content; the reader decides when and how to engage with it. Everything else follows.

## Go deeper

This document is one node in a graph. The links below open other documents in the same reader — your reading position here is saved, attention carries across, and you can return anytime.

- [Design philosophy](docs/design-philosophy.md) — the reading instrument, viewport ownership, content-intrinsic scaling
- [Project brief](docs/project-brief.md) — the layer model from pacing through attention to adaptive difficulty
- [Attention ownership](docs/attention-ownership.md) — why your data belongs to you, and what opens up when you choose to share it
- [Theory](docs/theory.md) — coupled oscillators, game theory, memetic acceleration at the reader-model boundary
- [Architecture](docs/architecture-plan.md) — stack, schema, data flow
- [Document model](docs/document-model.md) — how documents, blocks, and attention are structured
- [Semantic zoom](docs/semantic-zoom.md) — scaling content density to viewport (planned)
- [Settings](docs/ui-settings-control.md) — the controls you can already use (try the cog, top right)
- [Attention instrumentation research](docs/research/attention-instrumentation.md) — prior art in viewport tracking and engagement measurement
- [Token annotation research](docs/research/token-annotation-systems.md) — prior art in per-token visualization and annotation UX

Follow what's interesting. Return here when you need bearings.

## Development

```sh
# Frontend (bundled docs, works standalone)
npm install
npx vite                # dev server on port 3000

# With backend (session persistence, viewport event capture)
pip install -e ".[dev]"
uvicorn backend.main:app --reload --port 8000
npx vite                # in another terminal
```

## License

[MIT](LICENSE)
