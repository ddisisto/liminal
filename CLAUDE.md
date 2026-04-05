# Liminal

A conversational interface that instruments human attention to create a co-evolutionary environment between user and model.

## Project State

Pre-prototype. Foundational docs complete, research survey done for Layers 0-3. Currently building toward a UX proof-of-concept focused on Pretext.js streaming token rendering and JIT inference interaction.

## Key Concepts

- **JIT inference**: Generation is pulled by the reader, not pushed by the model. One repeating primitive: client sends stop conditions, backend streams tokens until one fires, client decides what to do next. The pull cadence is itself the primary attention signal.
- **Layer model**: L0 (conversation + JIT), L1 (attention capture from pull cadence + browser events), L2 (annotation/tagging), L3 (entropy/surprisal overlays), L4 (semantic zoom — expansion/compression), L5 (user model), L6 (adaptive phase boundary). Building L0-1 first.
- **Sequence immutability**: Once tokens are written, they are never modified. All editing is branching. This guarantees attention events and annotations reference stable positions.

## Architecture

- **Backend**: Python, FastAPI, WebSocket, SQLite, HuggingFace Transformers (local GPU)
- **Frontend**: TypeScript, Pretext.js (text measurement), native browser APIs for attention capture
- **Local models**: Sub-1B for prototyping (SmolLM 135M/360M, TinyLlama), API fallback for quality
- **Hardware target**: NVIDIA GTX 1070, 8GB VRAM

## Docs

- `docs/project-brief.md` — conceptual design, layer model, design principles
- `docs/architecture-plan.md` — stack, schema, data flow, component boundaries, WebSocket protocol
- `docs/theory.md` — coupled oscillator analogy, game theory, memetic acceleration
- `docs/research/attention-instrumentation.md` — prior art and implementation priorities for attention capture
- `docs/research/token-annotation-systems.md` — prior art for token visualization and annotation UX

## Conventions

- Commit messages: imperative mood, explain "why" not "what", include Co-Authored-By for Claude
- Docs live in `docs/`, research in `docs/research/`
- Design decisions should be captured in the relevant doc, not scattered across code comments
- When in doubt, prefer simplicity. One primitive over two. Fewer message types over more.

## Current Priorities

1. UX proof-of-concept: Pretext.js streaming token rendering + JIT pull interaction
2. Backend is deferred — known-solvable, lower risk
3. Research survey topics 3 & 4 (predictive user modelling, adaptive difficulty) deferred until L5+
