---
paths:
  - "workspaces/**"
  - "**/02-plan/**"
  - "**/03-execute/**"
  - ".claude/commands/**"
---

# Autonomous Execution Rules

Origin: inbound sync from loom 2026-06-05 — lifts the autonomous-execution capacity model from loom rules/autonomous-execution.md, adapted for atelier (vendor/codegen specifics stripped, phase names remapped to CO v1.2). Companion to the `/autonomize` command, which adopts the autonomous posture for a session; this rule defines how to estimate effort and size work once that posture is active.

## Scope

These rules apply to ALL deliberation, effort estimation, and work-sizing in any CO workflow. CO executes through autonomous AI systems under human direction, not through human teams. The human defines the operating envelope; the AI executes within it — Human-on-the-Loop, not in-the-loop. Unless the user explicitly states otherwise, all estimates and plans MUST assume autonomous execution.

## MUST Rules

### 1. Estimate in Execution Cycles, Not Human-Days

Effort MUST be estimated in **autonomous execution cycles** (sessions), never in human-days or developer-weeks.

```markdown
# DO: "This is one session — ~6 validated artifacts with cross-checks."

# DO NOT: "This is 3-5 human-days of work" / "2 weeks with two people."
```

**Why:** Human-team framing inflates estimates ~10x and silently re-sequences plans to fit team constraints (bandwidth, hiring, handoffs) that do not exist in autonomous execution, producing suboptimal phasing instead of the technically optimal approach.

### 2. Recommend the Technically Optimal Approach

Recommendations MUST be unconstrained by human resource limits, and MUST default to **maximum parallelization** across specialist roles. Trade-offs MUST be framed in terms of **system complexity**, **validation rigor**, and **institutional knowledge capture** — not "team bandwidth," "developer experience," or "cognitive load on the team."

```markdown
# DO: "Run the three checks in parallel; the constraint is validation rigor, not sequencing."

# DO NOT: "Phase this over three sprints so the team isn't overwhelmed."
```

**Why:** Phasing motivated by team size wastes autonomous capacity. The only real constraints are correctness, validation, and knowledge capture.

### 3. Respect the Per-Session Capacity Budget (Shard When Any Threshold Is Exceeded)

Autonomous capacity is high but not infinite, and degrades along several axes at once. A single shard — one session, one focused pass — MUST stay within ALL of:

- **≤ ~500 load-bearing units of reasoning.** Count the logic that holds invariants, drives state, or carries the argument — not boilerplate, restatement, or mechanical formatting.
- **≤ 5–10 simultaneous invariants** the work must hold at once (e.g. source-attribution + scope limits + terminology + audit trail + format contract = 5).
- **≤ 3–4 dependency hops** of cross-artifact reasoning.
- **Describable in 3 sentences or fewer.** If it takes more, the shard is too big.

Work that exceeds the budget MUST be sharded at `/plan` time, before `/execute` begins.

```markdown
# DO — sharded plan with explicit invariant count

- Shard 1: draft the rule body (invariants: modal-strength, DO/DO NOT, Why-lines)
- Shard 2: wire cross-references and scope frontmatter (invariants: refs resolve, paths)
- Shard 3: reconcile against the two overlapping existing rules (invariant: no contradiction)

# DO NOT — one mega-task: draft the rule, wire all cross-refs, reconcile three existing rules, update the index, add examples, and verify integration in one pass
```

**Why:** Beyond the budget the model stops tracking cross-artifact invariants and pattern-matches instead. An error early in the pass poisons everything after it and surfaces only at `/vet`, by which point the cheap fix window has closed.

### 4. Size by Complexity, Not Volume Alone

Sizing MUST distinguish mechanical bulk from load-bearing reasoning. Repetitive work that stamps out one held pattern scales roughly 5x further than load-bearing logic before sharding triggers.

```markdown
# DO — differentiated sizing: one fixed template across 14 sibling files (mechanical, single shard); one new decision rule (load-bearing, single shard); that rule re-derived across 6 contexts (6 shards, one each)

# DO NOT — cap every task at the same size: fragments mechanical work into meaningless shards AND overflows the invariant budget on genuinely complex work
```

**Why:** Uniform caps fail on both ends. Correct sizing reflects what is held in attention (invariants, dependency depth), not what is produced (volume).

### 5. Feedback Loops Multiply Capacity

A shard with an executable feedback loop — a check that actually runs **during the session** (a verifier, a test, a schema-validator, a coverage sweep) — MAY use up to 3–5x the base budget. A shard without a live loop (drafting prose, editing configuration, refactoring an unchecked artifact) MUST use the base budget.

```markdown
# DO: "This shard has a live validator that fires each pass — extend the budget."

# DO NOT: "`/vet` will catch it later" — a downstream gate is not a live feedback loop.
```

**Why:** A live loop converts "produce a large unit, then find it is wrong" into "produce a small unit, check, continue." The multiplier holds only when the loop fires within the session.

### 6. Fix Immediately When Review Surfaces a Same-Class Gap Within Budget

When a gate-level review or self-verification surfaces a latent gap in the **same class** as the in-flight work AND the gap fits within one remaining shard budget (≤ ~500 load-bearing units / ≤ 5–10 invariants / ≤ 3–4 dependency hops), the session MUST fix it immediately rather than filing it as follow-up. Filing a follow-up item when the gap is same-class and fits the budget is BLOCKED.

```markdown
# DO — review flags a dozen sibling rules with the same flaw (one missing Why-line) and capacity covers one shard, so fix all of them this session

# DO NOT — fix one instance, then "file a follow-up for the dozen siblings — next session"
```

**BLOCKED rationalizations:**

- "That's the next session's work"
- "A separate package is cleaner for review"
- "Budget allows it but the blast radius is higher if something breaks"

**Why:** Same-class gaps cost the least to fix while context is warm — invariants, dependency graph, and domain model are all still loaded. Filing a follow-up forces the next session to reload context from scratch, typically 2–5x the marginal cost of continuing. **Bounded by Rule 3:** if the surfaced gap exceeds the shard budget, filing the follow-up IS correct — the gap is a new shard, not a continuation.

## Structural vs Execution Gates

Not every phase boundary is a human gate; distinguishing the two prevents both rubber-stamping and bottlenecking.

- **Structural (human required):** plan approval (`/plan`), per-proposal codification approval (`/codify` — each promotion into `.claude/` is a HARD per-proposal human gate, per CLAUDE.md and `.claude/commands/codify.md`), delivery authorization (`/deliver`), and any change to the operating envelope itself. The human decides.
- **Execution (autonomous convergence):** analysis quality (`/analyze`), draft correctness (`/execute`), validation rigor (`/vet`). The human observes but does NOT block; the phase converges on its own quality bar.

**Why:** Treating execution gates as human gates wastes the autonomy the envelope already granted; treating structural gates as autonomous removes the human from decisions that are theirs to make.

## Throughput Multiplier

Autonomous execution with mature institutional knowledge produces roughly an order of magnitude more sustained throughput than an equivalent human team — parallel specialist execution (3-5x) and continuous operation with zero onboarding (3-4x), net of validation overhead (~0.8x), compounds to **~10x sustained**. This is why the human-day estimate is the wrong unit (see MUST Rule 1).

**Does NOT apply to:** greenfield domains (first session ~2-3x), genuinely novel architecture decisions, external dependencies (access, approvals), and human-authority gates (calendar-bound).

## MUST NOT Rules

### 1. No Volume-Only Shard Sizing

Shards MUST NOT be sized by volume alone, ignoring invariant count and dependency depth.

```markdown
# DO: size by load-bearing reasoning — "one new decision rule (3 invariants held at once) is a full shard despite being short."

# DO NOT: size by length — "this draft is only 40 lines, so it's a small shard" (ignores that it holds 8 simultaneous invariants).
```

**Why:** Volume is a proxy that fragments trivial work and overflows complex work — both failure modes ship broken plans.

### 2. No Deferring Sharding to Execution Time

Sharding decisions MUST NOT be deferred to `/execute`.

```markdown
# DO: decide shard boundaries at `/plan`; each becomes an approved task.

# DO NOT: "We'll see how far we get and split if needed" mid-`/execute`.
```

**Why:** Sharding at `/plan` costs a plan rewrite. Sharding mid-`/execute` abandons work in progress and leaves partial state the next session must untangle.

**BLOCKED rationalizations:**

- "The large context window handles it"
- "The model can keep track of more than 5 invariants"
- "We'll see how far we get"
- "Splitting is artificial, it's one conceptual change"
- "The validation pass will catch any errors that slip through"
- "It's mostly boilerplate" (when it isn't)

**Why:** Context window is not attention. Capability claims are not evidence for a specific task. "One conceptual change" is exactly the framing under which oversized passes ship orphaned, unintegrated output.
