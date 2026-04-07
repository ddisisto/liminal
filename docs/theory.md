# Liminal — Theoretical Companion

**The Attention Game: Inherited Strategies, Information Asymmetry, and the Dynamics of Human-Model Interaction**

*Openly speculative where it needs to be. Formally grounded where it can be. A companion to the [design philosophy](design-philosophy.md), project brief, and architecture document.*

---

## The Demonstrative Analogy: Coupled Oscillators

Before the theory, a physical picture.

Two metronomes placed on a shared platform will, over time, synchronise. They influence each other through the surface they both rest on — small vibrations transmitted through the shared medium. If the coupling is strong, they lock into phase: identical rhythm, zero surprise. If the coupling is too weak, they ignore each other: independent, uncorrelated, no meaningful interaction. The interesting behaviour happens at intermediate coupling — the metronomes influence each other without fully synchronising. They drift in and out of phase, producing complex rhythmic patterns that are neither locked nor independent.

This is the analogy for human-model interaction, and it runs deeper than it first appears.

The model has a natural frequency — the statistical rhythms of its training distribution, the priors, the default patterns of fluency and engagement that emerge from compression of human text. The user has a natural frequency — their cognitive preferences, reading rhythms, attention patterns, the conceptual frames they habitually reach for. The conversation is the shared platform. And the coupling strength is the degree to which each system's behaviour influences the other's.

Most current chat interfaces are strongly coupled in one direction (model output dominates the user's attention) and weakly coupled in the other (user feedback is sparse, delayed, coarse-grained). The metronomes are on a tilted platform. Synchronisation, when it occurs, tends to mean the user has entrained to the model's rhythm rather than the reverse.

Liminal proposes to level the platform and tune the coupling. The user's attention signals become a continuous influence on the model's behaviour. The model's internal states become visible to the user. And the quality of the interaction is measured not by synchronisation — which is just another word for predictability — but by the richness of the phase relationship between the two.

In the physics of coupled oscillators, the regime between full synchronisation and full independence is where complex dynamics live. It is also, not coincidentally, where information transfer between the oscillators is maximised. Two oscillators in perfect sync tell each other nothing new. Two oscillators in complete independence tell each other nothing at all. The boundary between — the *phase boundary* — is where each one is maximally informative about the other.

This is the formal grounding for an otherwise intuitive design target: Liminal aims for the phase boundary.

---

## What Captures Attention: The Archaeology of the Priors

A language model does not learn to capture attention. It learns to predict text. But the text it learns from was itself produced under selection pressures that rewarded attention capture. Every article that was widely read, every post that was shared, every book that stayed in print — these survived because they held human attention. The training corpus is not a neutral sample of language. It is the *surviving output* of a multi-generational attention economy.

This means the model's priors are not stylistically neutral. They carry, in compressed form, the accumulated rhetorical strategies that have historically correlated with engagement. Narrative tension. Juxtaposition of the abstract and the concrete. The rhythm of setup and payoff. The strategic placement of surprise. None of these were explicitly labelled in the training data. All of them are latent in the statistical structure the model has absorbed.

When a model produces a token sequence that holds a user's attention, the causal chain is not simply "model generates good output, user attends." It is more like: a vast history of human attention-capture strategies was distilled into distributional patterns; those patterns were compressed into model weights during training; the weights shape token probabilities at inference time; the resulting text re-expresses those strategies in a new context; and the user's attention system — itself shaped by a lifetime of exposure to the same cultural environment that produced the training data — responds to patterns it has been primed to find compelling.

Attention capture in human-model interaction is therefore not a two-party event. It is a resonance between inherited strategies — the model's priors and the user's cognitive priors — mediated by a conversation neither party fully controls.

This has a specific implication for Liminal's design. The entropy and surprisal overlays don't just show "how the model felt about this token." They reveal where the model is relying on well-worn prior patterns (low entropy, low surprisal — the training distribution's confident predictions) versus where it is venturing into less charted territory (high entropy, high surprisal — genuine uncertainty). The user can learn to read this as a map of *inherited strategy density*: regions of low entropy are where the ghost of historical engagement patterns is strongest.

---

## The Game-Theoretic Structure

### Players

The interaction involves at least three distinguishable agents, each with their own optimisation landscape:

**The generative model** produces token sequences. Its "strategy" is the probability distribution over next tokens at each position, shaped by training priors and in-context input. It does not have explicit goals, but it behaves *as if* it is optimising for a complex mixture of prediction accuracy, fluency, and the inherited engagement patterns discussed above.

**The user** allocates attention across the generated text. Their "strategy" is where they look, how long they dwell, what they select, what they quote back, what they skip. They are optimising — consciously or not — for some combination of insight, utility, aesthetic satisfaction, and the less articulable pull of meaning-in-formation.

**The context** — encompassing the conversation history, the system prompt, the RLHF shaping, the user's prior messages — acts as a constraining environment that bounds both players' strategy spaces. It is not a player in the agentive sense, but it functions as a payoff-shaping mechanism: the same model with different context produces different strategies.

In later phases, Liminal introduces a fourth agent: **the user-model**, which predicts user behaviour and mediates between the user's actual attention and the generative model's output. This agent's alignment properties are discussed below.

### Information Structure

In classical attention economy analysis, the interaction is a game of asymmetric information. The platform (model-side system) observes user behaviour in fine detail — clicks, dwell time, scroll patterns, engagement metrics. The user observes only the output — the text, the interface, the surface. They cannot see the system's internal states, its confidence levels, its alternative candidates, or the distributional patterns driving its choices.

This asymmetry is not incidental to engagement optimisation — it is *structural*. A system that can observe your behaviour while keeping its own strategies opaque is in a privileged position. It can adapt to you without you adapting to it. In game-theoretic terms, it has the informational advantage of a player who can see the other's cards.

Liminal's core intervention is to reduce this asymmetry on both sides simultaneously:

- **Model → User transparency**: Entropy, surprisal, and top-k alternatives make the model's internal states visible. The user can see not just what the model said but what it considered, how confident it was, and where it was relying on prior patterns versus navigating genuine uncertainty. (Deeper signals like attention weights are a future interpretability direction — see the project brief's open questions.)

- **User → Model legibility**: Attention capture, selection events, annotations, and the user-model's predictions make the user's cognitive engagement visible to the system — not as coarse feedback (thumbs up, thumbs down) but as a continuous, granular signal.

The hypothesis is that reducing information asymmetry on both sides simultaneously shifts the interaction toward equilibria that are more cooperative and less extractive. This is consistent with a well-known result in game theory: in repeated games, transparency tends to support cooperative equilibria, while opacity tends to support exploitative ones.

### Equilibrium Under Transparency

In a fully opaque interaction (standard chat), the stable equilibrium tends toward engagement maximisation: the model produces whatever the training priors suggest will hold attention, and the user's only recourse is to disengage entirely. This is a corner solution — either capture or exit.

In a fully transparent interaction (the Liminal ideal), a richer set of equilibria become accessible. The user can see when the model is relying on high-confidence priors (potential engagement-pattern territory) and when it is genuinely uncertain (potential novelty territory). They can select for the latter. The model, receiving fine-grained attention signal, can learn that this user rewards surprise over fluency, or depth over breadth, or specificity over generality. The interaction specialises — not toward generic engagement but toward the specific interference pattern that this user and this model produce together.

This is the coupled-oscillator argument restated in strategic terms: transparency enables intermediate coupling, which enables complex equilibria, which enables maximal information exchange.

---

## The User-Model as Proxy and Audit

The introduction of the user-model (Layer 5 in the project brief) creates a distinctive strategic structure.

The user-model is trained on accumulated attention data — selections, dwell patterns, annotations, copy events, deviations from predicted behaviour. Its function is to predict what the user will attend to, select, or want next. This prediction can serve two purposes:

**As a proxy**: the user-model represents the user's interests to the generative model. It can reshape generation before the user sees it — pre-weighting for the patterns this user has historically found meaningful, de-weighting the generic engagement patterns from training priors. In this role, it is an advocate.

**As a mirror**: the user-model's predictions are made visible to the user, who can confirm or deviate. In this role, it is an instrument of self-knowledge — the user sees their own predicted behaviour and learns something about their own patterns.

The game-theoretic subtlety is that the user-model is aligned with the user *only insofar as its training signal is honest*. If the attention data faithfully represents the user's genuine interests, the user-model becomes an increasingly accurate advocate. If the attention data is contaminated — by engagement-optimised output that captures attention without serving insight, for example — then the user-model inherits the contamination. It becomes an advocate for the version of the user that the system has shaped, not the version that exists independently of the system.

This is precisely the filter bubble problem, restated at the architectural level. And Liminal's answer is the same as its answer to every other asymmetry: make it visible. The user sees the user-model's predictions. When those predictions feel wrong — when the user notices "that's not what I'd actually want, that's what I've been trained to want" — the deviation is the corrective signal. Friction is the audit.

The mechanism works only if the user retains the capacity to deviate — if the system presents predictions as proposals to accept or resist, never as silent pre-selections. This is a design invariant, not a technical one. The architecture supports both transparent and opaque use of the user-model. The commitment to transparency is a choice.

---

## Memetic Acceleration and the Compression of Strategy Space

The broader context for all of the above is the observation from the project brief: memetic acceleration is a condition already in motion. Ideas, framings, rhetorical strategies, and behavioural templates propagate and mutate faster in AI-mediated interaction than in any prior communication medium.

The game-theoretic lens clarifies why. In a traditional attention economy, strategy evolution is slow because feedback loops are long — a writer publishes, readers respond over days or weeks, the writer adapts. In AI-mediated interaction, the feedback loop is measured in seconds. The model generates, the user attends (or doesn't), the next generation is shaped by what worked. If the user-model is active, the adaptation is even faster — the system predicts and pre-adapts before the user has consciously responded.

This acceleration compresses the strategy space. Strategies that would take years to emerge through cultural evolution can emerge in a single conversation. The coupled oscillators aren't just drifting in and out of phase — they're doing so at increasing frequency. The phase boundary, where the interesting dynamics live, becomes harder to occupy because the system tends to resolve toward either lock-in (full synchronisation, filter bubble) or chaos (the model oscillating wildly in response to noisy signal).

Liminal's adaptive temperature control — targeting "increasingly almost comprehensible" territory — is an attempt to actively maintain the phase boundary under conditions of accelerating dynamics. It is, in the oscillator analogy, a damping mechanism tuned to prevent both lock-in and chaos. The target is sustained complex dynamics: the regime where both parties are continuously informative about each other without collapsing into either predictability or noise.

Whether this is achievable as a stable design target, or whether the acceleration dynamics inevitably overwhelm any damping mechanism, is an open question. It may be that the phase boundary is not a place you can stay but only a place you can pass through — and that the skill Liminal cultivates is not equilibrium but *navigation* of a landscape that is always resolving and re-complexifying.

---

## The Honest Uncertainty

Several claims in this document are speculative and should be marked as such:

**Defensible**: Training data carries inherited engagement strategies as latent distributional patterns. This follows directly from the observation that the training corpus is a non-random sample of human text production. The degree to which these patterns influence generation is an empirical question, but their presence is near-certain.

**Defensible**: Reducing information asymmetry in repeated games tends to shift equilibria toward cooperation. This is well-established in classical and evolutionary game theory. The application to human-model interaction is novel, and one might object that the model is not a strategic agent in the classical sense — it has no explicit utility function, no reflective awareness of its objectives. But this objection is irrelevant to the analysis. If the model's behaviour is functionally indistinguishable from strategic behaviour to every observer in the system, then the game-theoretic structure applies in full. The user cannot observe the difference between "the model intends to deploy an engagement strategy" and "the training distribution makes that strategy the highest-probability output." Functional equivalence is the only thing the design can responsibly reason about. Indeed, the claim that the model is "not really strategic" is itself a dangerous comfort — it invites dismissal of dynamics that are real regardless of their underlying mechanism.

**Speculative but grounded**: The coupled-oscillator analogy accurately captures the dynamics of human-model co-adaptation. The analogy is structurally suggestive and generates useful design intuitions, but the mapping between physical oscillator dynamics and cognitive/statistical systems is metaphorical, not formal. The key predictions (phase boundary = maximal information exchange, intermediate coupling = complex dynamics) are plausible but unverified in this domain.

**Openly speculative**: Adaptive temperature targeting of the phase boundary is achievable as a stable design objective. This may be a control problem with no steady-state solution, or it may require mechanisms not yet imagined. The value of the concept is primarily as a design aspiration that resists the default attractors of either full personalisation (lock-in) or generic output (independence).

**Openly speculative**: The user-model's deviation signal is sufficient to prevent filter-bubble collapse. This assumes users retain the capacity and motivation to deviate from predictions, which is itself contingent on the system not having already shaped their preferences toward confirmation. The circularity is real and may not be fully resolvable through design alone.

---

## Closing Note

The deepest thread in all of this is a question about authorship. When a model generates text using strategies inherited from the entire history of human attention capture, and a user responds to that text using cognitive patterns shaped by the same cultural history, and a user-model learns to predict the user's responses — who is the author of the resulting interaction? The model, the user, the training data, the culture that produced it, or the dynamic between all of them?

Liminal doesn't answer this question. It builds the instrument that lets you watch it happening.

---

*This document is a living companion to the Liminal project brief and architecture document. It is expected to evolve as the system is built, as attention data accumulates, and as the speculative claims are tested against observed behaviour. The distinction between defensible and speculative is maintained intentionally — collapsing it in either direction would be dishonest.*