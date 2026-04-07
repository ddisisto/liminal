# Liminal — Project Brief

**A conversational interface that instruments human attention to create a co-evolutionary environment between user and model.**

---

## The Premise

People already signal what matters to them as they read. They select text, pause, re-read, copy, scroll back. These gestures carry rich information about where meaning lands — but current conversational AI treats them as invisible. The interaction model remains: user types, model responds, repeat.

Liminal begins from the observation that this discards most of the signal. The project proposes an interface that captures the natural gestures of reading and attention, progressively layers analytical and creative tooling on top, and ultimately enables a dynamic where user and model are continuously updating their models of each other — with the quality of interaction measured by the richness of the boundary between them.

---

## Design Principles

### Piggyback, don't invent
The foundational interaction — selecting text while reading — is already habitual and universal. The system instruments this existing behaviour rather than introducing new ones. There is no onboarding. If you can read, you're already using it.

### Progressive disclosure as architecture
Each capability layer is genuinely independent and composes without dependency. No feature gates, no mode switching — just increasing depth available on demand. A new user sees a clean conversation; an experienced user sees an instrument panel.

### Minimal and technically competent
No chrome that isn't earning its place. The tool should feel like a well-made text editor crossed with an oscilloscope — precise, quiet, responsive. Transitions communicate state change, not decoration.

### Content signals its own role
Visual presentation derives from intrinsic properties of the content — density, length, structure — not from imposed metadata or arrival order. Short blocks (questions, headings) are visually prominent; long blocks settle into readable density. The text's visual weight comes from what it *is*.

### Richness emerges, it isn't imposed
Taxonomy, classification, and structure are available but never required. The system captures signal at whatever level of intentionality the user brings — from idle selection to deliberate annotation — and lets patterns surface over time.

---

## Layer Model

### Layer 0 — Conversation
AI chat with JIT inference: generation is pulled by the reader one paragraph at a time, not pushed as a wall of text. Clean, familiar, fully functional as a standalone experience. The surface upon which everything else is built — and already, by its pull cadence, an attention instrument.

### Layer 1 — Attention Capture
The foundational signal is the JIT inference cadence itself — the interval between each paragraph arriving and the user requesting the next. Additional passive instrumentation captures finer-grained reading gestures: selection events, copy actions, scroll-back, dwell time. No deliberate interaction required; the system captures signal from gestures the user is already making.

### Layer 2 — Selection and Tagging
Active annotation. The user can mark token spans within a sequence and optionally classify them. Freeform by default. The gesture is the same as Layer 1 (selection) but with the addition of intentional commitment — a tag, a label, a note. The atomic unit of the cataloguing system.

### Layer 3 — Shared Context View
Analytical overlays rendered against the conversation. Model-side signals — entropy, surprisal, top-k alternative tokens — visualised alongside the text. The user can see where the model was uncertain, confident, or surprised by its own output. Zoom, pan, and append controls for navigating the sequence as a spatial object.

This is where the user's subjective sense of "this mattered" meets the model's statistical reality. Convergence and divergence between the two are both informative.

### Layer 4 — Semantic Zoom
Expansion and compression as a unified, bidirectional operation. The user can expand at any point — generating additional detail inline — or compress, collapsing a block into a summary. The conversation becomes a document with variable information density, shaped by what matters *now*.

Both operations preserve history: expansion forks rather than edits (maintaining sequence immutability), and compression is non-destructive — the original detail is always re-expandable. Attention decay can surface compression candidates where engagement has cooled, but compression is always user-confirmed, never automatic.

This directly addresses context window management. Rather than truncation or uniform summarisation, the active context sent to the model is shaped by attention-weighted relevance. See the [architecture document](architecture-plan.md#data-flow-summary) for implementation detail on branch and compression flows.

### Layer 5 — The User Model
A third predictive system that builds a model of the user's attention, preferences, and likely responses. This model can:

- Surface predictions about what the user will do, ask, select, or want next
- Serve as an introspective mirror — the user sees their predicted behaviour before performing it
- Generate productive friction when the user's actual behaviour deviates from prediction

Deviation from prediction is the highest-value signal in the system. Confirmation tells you about consistency. Deviation tells you about growth, surprise, and the live edge of cognition.

### Layer 6 — Adaptive Phase Boundary
The system dynamically adjusts its own creativity and risk-taking based on the interference pattern between model output and user-model predictions. The target is not comfort or comprehension but the *phase boundary* — the zone where content is almost but not quite what the user expected.

This boundary moves. The system tracks it and gently, continuously advances into more complex territory. The goal is an environment where understanding is actively being constructed rather than passively received.

Adaptive temperature control targets increasingly almost-comprehensible territory — the edge where the two prediction systems are maximally informative about each other.

---

## The Interference Model

Two prediction systems operate simultaneously: the generative model predicting useful output, and the user-model predicting the user's reception. Their interaction creates an interference pattern.

- **Constructive interference**: flow, rapport, the experience of being understood
- **Destructive interference**: surprise, friction, productive discomfort, reframing

Neither state is the goal. The pattern is the goal. The topology of agreement and disagreement across a conversation carries the real information about where meaning is being made.

This is the conceptual core of the project: a co-evolutionary environment where both parties continuously update their model of each other, and the richness of the boundary between them is the measure of quality.

---

## What This Is Not

- Not a chatbot with annotations bolted on
- Not a prompt engineering tool
- Not a pedagogical system (though it has pedagogical properties)
- Not an alignment research tool (though it generates alignment-relevant signal)

It is an attempt to make the memetic selection process — the one already happening in every conversation between a human and a language model — visible, navigable, and participatory.

---

## Speculative Load-Bearing Intuitions

These are not yet formalised but are actively informing design decisions:

**Memetic acceleration is already in motion.** The increasing speed at which ideas propagate and mutate through AI-mediated interaction is a condition, not a proposal. This tool instruments it rather than ignoring or resisting it.

**"Just the right token" is a form of power that doesn't look like power.** A system that is very good at selecting the next token exercises influence that presents as fluency, helpfulness, or insight. Making the selection process visible is a form of accountability.

**The lowest energy state is an interference pattern.** Alignment between user and model is not agreement — it is a complex, dynamic equilibrium where both systems are maximally informative about each other. Designing for this equilibrium rather than for user satisfaction or model accuracy is the distinctive move.

**Prediction good enough to anticipate the user is also good enough to replace them.** The line between proposing and preempting is a design decision. Liminal makes this boundary explicit and keeps the user on the authorial side of it — by making predictions visible, resistable, and informative rather than silent and directive.

---

## Open Questions and Upstream Dependencies

- **Persistence model**: Where do accumulated signals live? Per-conversation, per-project, or as a growing personal corpus? Depends on upstream decisions about data ownership, storage architecture, and what proves worth keeping.
- **Training signal pipeline**: How and whether user attention data feeds back into model training is a significant technical and ethical question, deferred intentionally.
- **Consistency under branching**: Forking preserves consistency but introduces navigational complexity. The right metaphor and interaction model for branch management is unresolved.
- **User-model architecture**: What form the third predictive system takes — in-context learning, fine-tuned adapter, separate model — is an open research question.
- **Entropy/surprisal access**: Surfacing model internals (logprobs, top-k distributions) depends on API-level support. Deeper signals like attention weight trajectories would enable richer Layer 3 overlays and interpretability work, but require access to transformer internals not available through standard inference APIs. Deferred as a future research direction.

---

## Next Phases

See the [architecture document](architecture-plan.md#next-phases) for the current roadmap.

---

*Progressive expansion at every level. The project manages itself the way it designs interaction: start with the essential gesture, let complexity emerge from use.*