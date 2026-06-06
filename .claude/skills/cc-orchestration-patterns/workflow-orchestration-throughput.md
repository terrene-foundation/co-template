# Workflow-Orchestration Throughput

Procedural depth for SKILL.md Patterns 1–3 and the `rules/governed-throughput.md` L1/L2/L3 contract. This file is the how-to behind orchestration throughput: how to govern at the gate while injecting a minimal rule-slice, which fan-out SHAPE to choose, why structured-schema returns are fragile, how to resume a partial run, and how to keep concurrency throttle-aware. The orchestrator needs this when it is about to decompose work across parallel or staged subagents — not on every session start.

Domain-agnostic: the "items" are research sources to survey, governance controls to audit, education modules to draft, finance lines to analyze, or any independent unit a fan-out can carry.

## Govern at the Gate, Inject the Minimal Slice

A parallel subagent runs LEAN by default — its delegation prompt carries the task and the tool/skill listing, NOT the orchestrator's rule corpus. The counter-intuitive design constraint: **lean generation plus a full-context merge gate beats injecting everything.**

| Layer  | What it is                                | When                                 | Status                       |
| ------ | ----------------------------------------- | ------------------------------------ | ---------------------------- |
| **L1** | Specialist agent type (sets context)      | Optional                             | Insufficient alone           |
| **L2** | Curated minimal rule-slice (clauses only) | At generation, into the shard prompt | Load-bearing for compliance  |
| **L3** | Full-context review of the diff           | At merge, before the shard lands     | Backstop for what L2 dropped |

Four load-bearing findings:

1. **Lean generation + full-context merge gate beats inject-everything.** Lean prompts produce the highest-quality output. Govern at the gate (L3); inject only minimal slices at generation (L2).
2. **Over-injection DEGRADES output.** A dense, undifferentiated rule-slice crowds the task out of working memory and measurably lowers quality. Inject curated, load-bearing clauses ONLY — no examples, no Origin line, no rationale paragraphs.
3. **Curated slices beat generic verbosity, and the gap GROWS as the model weakens.** Delegating to a cheaper or weaker model makes curated slices matter MORE; a generic "be thorough" preamble actively harms.
4. **Injection's value is COMPLIANCE, not quality.** Inject to ensure the shard honors the invariants you are accountable for — not to make it "smarter."

The slice selector is deterministic: glob the shard's touched-file set against every rule's `paths:` frontmatter; the matching rules' MUST / MUST-NOT clauses ARE the slice. Read the frontmatter from committed state on disk, never a sibling shard's mid-edit copy.

```text
# DO — curated minimal slice (clauses only), full-context gate at merge
slice = "GOVERNANCE (honor these — you are accountable):
  - domain-independence MUST §1: no domain-specific assumptions; works for any domain.
  - no-stubs MUST §1: no [TODO]/[TBD] placeholders in canonical artifacts."
delegate(slice + task)        # L2: compliance lever
# L3: reviewer runs FULL context (not slice-limited) at merge.

# DO NOT — full-corpus dump (degrades output + re-triggers the throttle) OR zero governance.
```

This is the procedural depth behind `rules/governed-throughput.md` (the enforced L1/L2/L3 contract).

## Choose the Fan-Out Shape

| Shape                         | When                                                               | Mechanism                                            | Wall-clock                               |
| ----------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------- | ---------------------------------------- |
| **Read-only fan-out**         | Surveys, audits, claim-verification — independent, no shared edits | Independent concurrent calls, no shared-source edits | Slowest single call                      |
| **Verify→implement pipeline** | Each item flows through stages independently                       | A pipeline with no barrier; each item flows alone    | Slowest single chain, NOT sum-of-stages  |
| **Barrier (all-results)**     | A stage needs ALL prior results (dedup, early-exit, cross-compare) | An explicit barrier collecting every result          | Slowest stage across all items           |
| **Loop-until-dry**            | Accumulate to a target or until K consecutive empty rounds         | Re-launch until the round comes back empty           | Variable; honest tails beat fixed counts |

Use the barrier ONLY when a stage genuinely needs all prior results. Defaulting every fan-out to a barrier serializes wall-clock to the slowest stage when a pipeline would let fast items finish first. The read-only fan-out needs no isolation; only modify-and-verify work that contends on shared state does.

## Structured-Schema Returns Are Fragile — Prefer Plain Text When Robustness Matters

A subagent forced to return a structured/typed result through a schema-bound return tool can **complete the work correctly yet fail to emit the structured output** — the analysis happened, but the structured-return call never fired, especially across an auth or account interruption mid-run. The work is done; the return is empty.

Mitigation, in priority order:

- **Use non-schema agents for analysis** — let them return plain text. Plain-text returns are reliable; the agent narrates its result and the orchestrator reads it directly.
- **Reserve schema returns for judges and machine-checkable verdicts** — where a fixed shape is genuinely needed for deterministic scoring, accept the fragility and mitigate it below.
- **Tolerate dropout** — filter out empty results rather than treating one empty return as a wave failure.
- **Keep waves small** — a failed wave is then cheap to re-run (see throttle-aware concurrency below).

The rule of thumb: structured output is for the few places a downstream check parses it; everywhere else, plain text is the robust default.

## Resume From a Prior Run

A killed or edited orchestration run can re-execute ONLY the changed calls — the unchanged prefix returns from cache. Edit the persisted run definition, re-invoke pointing at the prior run's identifier, and the orchestrator replays the unchanged steps without re-spending on them. This converts a mid-run interruption from "restart everything" into "resume from the edit point," which makes small waves and occasional dropout cheap to recover from rather than catastrophic.

## Throttle-Aware Adaptive Concurrency

The runtime's native concurrency ceiling is too high to trust. The binding constraint is a **server-side concurrency throttle that bites BELOW the native ceiling** — not account quota, not a fixed batch count. Cold-start a small wave (a few at a time, ~3), and back off ONLY on the synchronized throttle signal.

```text
# DO — cold-start a small wave (~3); back off ONLY on the synchronized throttle signal
wave = launch(items[:3])          # cold start ~3, NOT the native ceiling, NOT unlimited
wait_for_all(wave)                # wave barrier
# if ≥2 of `wave` died within a ~30-48s synchronized window carrying
#   "(not your usage limit)" → keep next waves small (~3)
# else (clean) → the SIGNAL is the gate, not a fixed number

# DO NOT — trust the runtime's native ceiling (synchronized burst-death)
# DO NOT — hardcode "always one-at-a-time" with no throttle signal (over-serializes headroom)
```

**The throttle signal (back off ONLY on this):** two or more subagents in the SAME wave fail within a short synchronized window AND the failure carries a server message stating the limit is a temporary request throttle — explicitly NOT the account's usage limit. A single agent dying, a timeout, an out-of-memory, or a "usage limit" error is NOT this signal. The signal originates at the model-provider server boundary, so a local actor cannot fabricate it; suppressing it merely holds concurrency at the already-safe cold-start size — a slowdown, never a breach.

This is the procedural depth behind `rules/subagent-delegation-verification.md` MUST NOT §1.

## Cross-References

- `rules/governed-throughput.md` — the enforced L1/L2/L3 contract; this file is its how-to.
- `rules/subagent-delegation-verification.md` MUST NOT §1 — the throttle-aware adaptive-concurrency clause this file expands.
- `rules/delegation-orchestration.md` MUST §1 — decompose onto parallel delegation by default when the work earns it (≥3 independent items OR analyze→execute→verify shape).
- `SKILL.md` Patterns 1–3 — the orchestration-decision framing this file is the depth behind.
- `worktree-orchestration.md` — the isolation-and-verification disciplines for the modify-and-verify shape.
