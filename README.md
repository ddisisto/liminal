# Liminal

*an attention instrument*

> You're reading this on GitHub, which means flat text, no friction, everything at once. **[Try the live demo](https://ddisisto.github.io/liminal/)** for the experience as intended — pure text, no stored data, runs entirely in your browser.

This page isn't finished. Not because it's broken — because you haven't read it yet. The next piece arrives when you scroll down. Your pace, your decision. That's the point.

## The pull

By now you've done it several times without thinking about it. Scroll to the bottom, get the next piece. It's a small inversion — instead of everything arriving at once, you set the pace. The rhythm of your reading becomes part of the interface.

This isn't lazy loading or infinite scroll. There's no buffer waiting offscreen. Each paragraph appears in response to a specific gesture: you, at the bottom edge, asking for more. That request is a signal. It says "I'm ready" — and the *timing* of that signal says something about how you're engaging with what came before.

## What you're feeling

Notice that not all blocks are the same size? Short statements and questions are visually prominent — they're the anchors, the turning points. Longer passages are denser, settling into a size that invites sustained reading rather than demanding immediate attention.

This isn't decoration. It's a first approximation of how content signals its own role. A heading says "orient here." A question says "this matters." A long explanation says "settle in." The text's visual weight comes from what it *is*, not when it arrived.

## The inversion

Every scroll, pause, and click you make on the internet is already tracked — by the server, for the server's purposes, through means entirely opaque to you. Your attention is one of the most valuable commodities online, and you're not at the table.

Liminal inverts this. The attention tracking you're experiencing right now — the warmth building on blocks you've lingered on — is captured *for you*. How far did you get? What did you re-read? When you scroll back up, that history is visible, reducing your cognitive load without you having to remember or annotate anything.

**You own your attention data.** It's captured locally, stored locally, never transmitted without your explicit consent. But ownership implies agency — including the choice to share.

## What opens up

**For authors.** Not page views or time-on-page, but per-paragraph attention. Where did the argument lose people? Where did they lean in? Feedback at a resolution that's never existed — offered voluntarily by readers who want the content to improve.

**For communities.** Aggregate attention patterns across readers reveal collective engagement. The passages everyone lingers on. The sections most people skip. A shared attention heatmap is a new kind of annotation, emerging from behaviour rather than commentary.

**For models.** When the reader is in conversation with a language model, attention data closes the loop. The model sees not just what it generated, but what was actually read, re-read, or skipped. This is the signal current interfaces discard entirely.

## The deeper theory

Liminal proposes a [layer model](docs/project-brief.md) that starts with pull-driven pacing and progressively adds attention capture, annotation, entropy overlays, semantic zoom, user modelling, and adaptive difficulty — each layer independent, composing without dependency.

The text you're reading could be static, generated, or anything in between. The attention layer doesn't care about the source — it cares about the reader. A language model's priors encode inherited attention-capture strategies distilled from its training corpus. The user's cognitive priors encode a lifetime of exposure to the same cultural environment. Where these meet is a [coupled oscillator system](docs/theory.md), and the interesting dynamics live at the phase boundary between synchronisation and independence.

## How it's built

Every word on this page is individually addressable. Each token is its own element with data attributes — it can be styled, tracked, or annotated independently. This gives us per-word resolution: font size responds to context, reading patterns are measurable at the word level, and the document can reflect its own history.

The stack: TypeScript, Vite, native browser APIs, IntersectionObserver for attention capture. Backend (optional): Python, FastAPI, SQLite, WebSocket streaming. The demo runs entirely in the browser with no backend.

## What you're experiencing now

Try scrolling back up.

Everything is still there, still addressable.

This is a timeline, not a feed.

This is a proof of concept. The content is static — these are prewritten paragraphs, not live inference. The streaming animation is simulated. But the mechanics are real: pull-driven pacing, length-based font scaling, and attention tracking that's already recording which blocks hold your gaze.

## What's next

The ideas get more interesting from here. The project docs below explore [attention capture](docs/research/attention-instrumentation.md), entropy overlays, semantic zoom, and the dynamics of interaction between reader and text — whether that text comes from a model, an author, or an algorithm. The [attention ownership](docs/attention-ownership.md) thesis explores what happens when readers control their own attention data.

But the foundation is what you're already using: text that knows it's being read.

Scroll when you're ready.

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
