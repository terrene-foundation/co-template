# Model Selection by Task Category

Claude offers a tiered model family — a stronger, slower tier (Opus), a balanced tier (Sonnet), and a faster, cheaper tier (Haiku). These tiers are not interchangeable. Each has measurable advantages in specific task categories, and the cost and latency difference between them is real money and real waiting time. This guide gives task-category heuristics for choosing a tier, so that the methodology spends the strong model where it earns its premium and the fast model where it would only burn tokens and time.

**Origin**: distilled from a model-comparison study of the Claude family across task categories. The numbers age as models version; the heuristic — match the task category to the tier whose strengths the task actually exercises — does not. Treat specific benchmark figures below as illustrative of the _shape_ of the gap, not as a fixed contract.

## The Core Principle

A task category warrants the stronger tier when **its failures are expensive and its successes require depth** — multi-step reasoning held across many inputs, adversarial thoroughness, or synthesis that must stay coherent across a long output. A task category is well served by the faster tier when **its failures are cheap and its successes require directness** — bounded transformations, mechanical edits, navigation, and routine drafting where extra deliberation produces verbosity, not value.

The mistake in both directions is symmetric:

- **Over-provisioning** (strong model on routine work) wastes cost and latency, and on simple tasks the strong model often produces _worse_ output — superfluous explanation where a direct answer was wanted.
- **Under-provisioning** (fast model on deep work) produces failures that are invisible until they compound: a missed edge case in review, a circular fix loop in a multi-step task, a synthesis that loses its thread halfway through.

The strong model's premium is justified only where the task exercises the capability the premium buys. Pay it there; do not pay it elsewhere.

## Task Categories and Their Tier

### 1. Deep reasoning — STRONGER tier

Tasks whose correctness depends on holding many interdependent facts in mind at once and reasoning across them: structural design, multi-part refactors of interdependent material, cross-referencing a body of rules or clauses against each other, mapping a dependency chain before acting.

**Why the stronger tier**: the gap between tiers is largest here. The faster tier tends to solve locally — fixing the symptom in front of it — and can enter circular loops when the real fix requires understanding the whole structure. The stronger tier maps the full chain first and acts once. On a documented multi-file dependency problem, the faster tier cycled through partial fixes while the stronger tier resolved it in a handful of targeted changes after mapping the whole chain.

**Use the stronger tier for**: system and structural design, multi-part refactors, cross-cutting analysis, cross-referencing a corpus of rules/clauses/requirements against itself.

### 2. Adversarial review — STRONGER tier

Tasks where the job is to find what is wrong, missing, or dangerous — and where a missed item is the failure: security and risk review, red-teaming, completeness validation, gap analysis, compliance checking against a standard.

**Why the stronger tier**: review quality is dominated by the long tail of issues a shallower pass misses. The stronger tier traces effects across multiple inputs, enumerates the attack or failure surface exhaustively, and explicitly states the hypotheses it checked before concluding — exactly the behavior needed when a missed item has material consequence. The faster tier catches the obvious issues but a meaningful fraction of the important ones slip past; acceptable when missed edge cases are low-stakes, costly when they are not.

**Use the stronger tier for**: adversarial review (`/vet`), security and risk analysis, compliance and completeness checking, gap analysis where missing items have material consequence.

**The faster tier is acceptable for**: routine review where a missed edge case is low-stakes and cheaply corrected later.

### 3. High-stakes document generation — STRONGER tier; routine doc-gen — FASTER tier

This category splits by stakes, not by surface form.

**Stronger tier for high-stakes synthesis**: governance and constitutional text, strategy documents, specification writing, multi-source synthesis, legal and regulatory drafting, anything that must surface the _implicit_ assumptions in its inputs. These reward thematic continuity across a long document and integration across layered sources — the stronger tier holds the thread and weaves the sources; the faster tier produces locally-fine prose that drifts globally.

**Faster tier for routine doc-gen**: status updates, changelog entries, README touch-ups, moderate-scope technical content, routine fixes. The stronger tier's extra deliberation adds length, not quality, here.

**A useful pattern — producer + editor**: draft at scale with the faster tier, then refine the high-stakes passages with the stronger tier. This captures most of the cost savings while protecting the parts of the document where coherence and assumption-surfacing actually matter.

**Use the stronger tier for**: governance/strategy/spec documents, multi-source synthesis, regulatory drafting.
**The faster tier is adequate for**: routine documentation, changelogs, status notes, moderate-scope content.

### 4. Multi-step orchestration — STRONGER tier

Tasks that chain many actions toward a goal, where each step depends on the last and recovery from a wrong turn is expensive: driving a long automated sequence, coordinating sub-tasks, any workflow that punishes drift.

**Why the stronger tier**: multi-step work rewards first-attempt correctness and punishes drift — a wrong early step propagates and the recovery cost dwarfs the per-token saving from a cheaper model. The stronger tier reaches the goal in _fewer steps and fewer total tokens_ on these tasks, so the apparent premium per token is often a net saving end-to-end. Output-ceiling also matters: when a single pass must emit a large artifact, the stronger tier's higher maximum output determines whether it can be produced in one pass at all.

**Use the stronger tier for**: multi-step orchestration where failure recovery is expensive, and single-pass generation of large artifacts.

### 5. Broad search and exploration — FASTER tier

Navigating a corpus, discovering relevant files or sources, locating where something lives, gathering candidate material.

**Why the faster tier**: navigation and discovery are comparable across tiers; the stronger tier's depth is not exercised until the search _results_ require reasoning. Search is also high-volume — it is exactly the place where the latency and cost of the stronger tier compound without return.

**Use the faster tier for**: search, file and source discovery, corpus navigation. **Escalate** to the stronger tier only when analysis of what was found requires the depth of category 1 (deep reasoning).

### 6. Routine and mechanical tasks — FASTER tier

Formatting, renaming, file manipulation, bounded transformations, version-control bookkeeping, simple checklists, straightforward enumeration.

**Why the faster tier — and why the stronger tier is actively worse here**: on simple, bounded tasks the stronger tier tends to generate superfluous content and unnecessary explanation, spending tokens and latency to produce something _longer_ than wanted. The faster tier is more concise and direct, and on routine real-world office-style tasks it measures as the better choice, not merely the cheaper one. This is the one category where reaching for the strong model degrades the result.

**Use the faster tier for**: formatting, renaming, file manipulation, version-control bookkeeping, routine checklists, simple enumeration.

### Near-parity categories — choose by cost

Some categories sit near parity, splitting by complexity rather than landing cleanly in one tier:

- **Isolated content generation** (a single self-contained function, a simple module, boilerplate): near-parity — use the faster tier. The gap opens only when the output must integrate with surrounding structure or span multiple parts, at which point it becomes a category-1 deep-reasoning task and warrants the stronger tier.
- **Straightforward test or check writing** (unit-level, single-behavior): near-parity — use the faster tier. Integration- and end-to-end-level cases that require understanding complex system interactions warrant the stronger tier.
- **Simple enumeration vs. reasoned completeness**: a flat checklist is fine on the faster tier; validating that a checklist is _complete_ — reasoning about what is missing — is a category-2 adversarial task and warrants the stronger tier.

The rule for near-parity work: default to the faster tier and escalate the moment the task acquires a deep-reasoning or adversarial-completeness character.

## The Cost and Latency Trade-off

The strong tier costs more per token and is slower — higher time-to-first-token and lower throughput. The exact multiplier shifts each generation (recent generations narrowed it well below the wide ratios sometimes quoted from older ones), but the _direction_ is permanent: stronger costs more and waits longer; faster costs less and responds sooner.

Three corrections to the naive "always pick the cheapest model" instinct:

1. **End-to-end cost is not per-token cost.** On multi-step and deep-reasoning tasks, the stronger tier reaches the goal in fewer steps and fewer total tokens. A higher per-token price can still be a lower total bill — and a lower total wait — when the cheaper model loops, drifts, or has to be re-run after a missed issue surfaces downstream.

2. **Latency is a category property, not a global preference.** For interactive, high-volume, bounded work (search, formatting, routine edits) the faster tier's lower latency compounds into a materially better experience. For deep one-shot work, the difference of a few seconds at the start is noise against the value of getting it right the first time.

3. **Output ceiling can be a hard gate, not a preference.** When a single pass must emit a large artifact, the stronger tier's higher maximum output can be the difference between "produced in one pass" and "cannot be produced in one pass." This is a capability constraint, not a cost trade-off.

## Decision Table

| Task category                             | Tier         | Performance gap    | Why                                                               |
| ----------------------------------------- | ------------ | ------------------ | ----------------------------------------------------------------- |
| Deep / structural reasoning               | **Stronger** | Significant        | Maps whole dependency chain; faster tier loops locally            |
| Adversarial / security review             | **Stronger** | Significant        | Exhaustive surface enumeration; missed items are the failure      |
| Governance / strategy / spec docs         | **Stronger** | Significant        | Thematic continuity + assumption-surfacing across layered sources |
| Multi-step orchestration                  | **Stronger** | Significant        | Fewer steps, fewer tokens; drift recovery is expensive            |
| Large single-pass artifact                | **Stronger** | Capability gate    | Higher max output ceiling                                         |
| Compliance / completeness validation      | **Stronger** | Moderate           | Reasoning about what is missing                                   |
| Integration / end-to-end tests            | **Stronger** | Moderate           | Requires understanding complex interactions                       |
| Complex / integrating content generation  | **Stronger** | Marginal–moderate  | Gap opens once output must span structure                         |
| Isolated content generation               | **Faster**   | Negligible         | Bounded, self-contained — no depth to exercise                    |
| Routine documentation / changelogs        | **Faster**   | Negligible         | Extra deliberation adds length, not value                         |
| Unit-level tests / simple checks          | **Faster**   | Near-parity        | Single-behavior, bounded                                          |
| Search / exploration / navigation         | **Faster**   | Equivalent         | Depth unexercised until results need reasoning                    |
| Formatting / renaming / file manipulation | **Faster**   | Faster tier better | Strong tier over-explains; concise wins                           |
| Version-control bookkeeping               | **Faster**   | Faster tier better | Routine, bounded, high-volume                                     |
| Simple checklists / enumeration           | **Faster**   | Faster tier better | No completeness reasoning required                                |

## Selection Checklist

Before assigning a tier to a task, ask:

- [ ] **Does correctness require holding many interdependent facts at once?** If yes → stronger tier (deep reasoning).
- [ ] **Is a missed item the failure mode?** If yes → stronger tier (adversarial review / completeness).
- [ ] **Must the output stay coherent across a long synthesis, or surface implicit assumptions?** If yes → stronger tier (high-stakes doc-gen).
- [ ] **Does the task chain many dependent steps where drift is expensive to recover?** If yes → stronger tier (orchestration).
- [ ] **Must a single pass emit a large artifact?** If yes → stronger tier (output-ceiling gate).
- [ ] **Is the task a bounded transformation, navigation, or routine draft where directness beats deliberation?** If yes → faster tier — and note that the stronger tier may produce _worse_, longer output.
- [ ] **Is the task near-parity (isolated generation, unit test, flat checklist)?** If yes → default faster tier; escalate only if it acquires a deep-reasoning or completeness character.
- [ ] **Did I consider end-to-end cost, not per-token price?** A looping cheaper model can cost more in total than a stronger model that succeeds once.

## Anti-Patterns in Model Selection

### Anti-Pattern 1: "Strongest model everywhere, to be safe"

Reaching for the strongest tier on every task because it "can't hurt." It can: on routine and bounded work the strong tier produces longer, over-explained output and pays cost and latency for the privilege. "Safe" is not free — it is a standing tax on every routine action, and on simple tasks it actively degrades the result.

### Anti-Pattern 2: "Cheapest model everywhere, to save cost"

The mirror failure: pinning everything to the faster tier to minimize the per-token bill. This under-provisions deep reasoning, adversarial review, and multi-step orchestration — where the faster tier loops, misses, or drifts, and the _end-to-end_ cost (re-runs, missed issues surfacing downstream, recovery from drift) exceeds what the stronger tier would have cost in one pass.

### Anti-Pattern 3: "Tier by surface form, not by task character"

Choosing the tier from what the task looks like rather than what it exercises. "It's a document, so faster tier" misroutes a constitutional draft; "it's code, so stronger tier" over-provisions a one-line boilerplate function. The discriminator is the _character_ of the work — depth, adversarial-ness, multi-step dependency, output size — not its surface category. Isolated generation and structural integration look alike on the surface and belong in different tiers.

### Anti-Pattern 4: "Set the tier once and never escalate"

Treating tier as a fixed property of a whole session rather than a per-task decision. Search starts on the faster tier — correctly — but the moment the search results demand structural reasoning, the task has changed category and should escalate. The near-parity categories exist precisely because the right tier flips mid-task; a static assignment misses the flip.
