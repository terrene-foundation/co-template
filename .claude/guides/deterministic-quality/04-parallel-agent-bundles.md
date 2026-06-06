# Parallel Agent Bundles for Non-Shard Follow-Ups

When a session accumulates many small, independent fixes — review-feedback triage, codify follow-ups, post-vet corrections, README or skill polish, scattered config nudges — the right shape is a single dispatch round of parallel agents, not a sequenced list of tasks and not a sharded plan. This guide names the pattern, gives the gate that decides "shard vs non-shard bundle," and describes the dispatch mechanics.

The decision is judgment-driven, not rule-bound, and the wrong choice has a different cost in each direction. Sharding trivial work fragments attention into context-switches that buy nothing. Bundling load-bearing work overflows the per-shard invariant budget — the number of distinct invariants one agent can hold while staying correct — and reproduces the dropped-invariant failure mode at smaller scale. The gate below keeps both errors out.

**Origin**: loom journal — codified from a review-feedback-triage session that dispatched a batch of follow-up items as one parallel round, with the post-vet correction round dispatched the same way. Generalized for cross-domain methodology application; codegen-specific isolation and tooling details replaced with the domain-agnostic parallel-vs-shard decision logic.

## The Two Shapes

A **shard** is a unit of load-bearing work that carries its own set of invariants the agent must preserve simultaneously (a tenant-isolation contract, an audit-row shape, a citation-integrity rule, a redaction policy). Shards are sized by the invariant budget, partitioned by reasoning surface, and reviewed at a full-context merge gate.

A **bundle entry** is a small, independent follow-up that carries no shared invariant with any other entry. A bundle is a set of these dispatched as parallel agents in one round. The bundle pattern is _not_ a way around the shard budget — it is a way to handle work that was never shard-shaped in the first place.

## When To Use The Bundle Pattern

Use the parallel bundle when ALL six criteria hold:

1. **N items, each describable in 1–2 sentences.** If any single item needs three sentences to scope, that item is a shard, not a bundle entry.
2. **Items are independent.** Item B's correctness does not depend on item A's output. Each agent reads only the material relevant to its own item.
3. **Each item is a small, bounded change.** A follow-up that rewrites a whole document, restructures a dataset, or reworks a multi-section argument is approaching the per-shard load-bearing budget — size it up to a shard.
4. **Each item touches at most ~2 correctness-relevant surfaces.** A change that ranges across five files, five sources, or five sections is not a bundle entry, even if each individual edit is small.
5. **No cross-item invariants.** If item A and item B both have to preserve the _same_ contract — the same isolation boundary, the same audit shape, the same terminology standard, the same citation rule — they belong in one shard, not two parallel agents.
6. **Each agent can ground-truth its own change.** Each item has a self-contained verification the agent runs before exiting — a check, a re-read against the spec, a lint, a cross-reference resolution — so the agent confirms its change rather than asserting it.

When all six hold, dispatch the items as one parallel round. The bundle's wall-clock is roughly the dispatch cost plus the single longest agent, rather than the sum of a serial task list — that compression is the entire reason to reach for the shape.

## When NOT To Use The Bundle Pattern

Drop back to a sharded plan (see `rules/governed-throughput.md` for the shard-governance model) when ANY of the following hold:

- The work has cross-shard invariants that all shards must preserve simultaneously (isolation, audit, redaction, classification, error taxonomy, citation integrity, terminology compliance).
- The work is one conceptual change large enough that a single agent must hold the whole thing at once — its load-bearing logic does not partition cleanly.
- The reasoning for any single item crosses three or more surfaces (files, sources, sections) that must be held together.
- The items are sequenced by dependency (item B reads item A's output) — these are ordered tasks, not a bundle.
- Any single item takes more than three sentences to describe.

The shard budget exists because beyond it the model stops tracking invariants and pattern-matches instead. Bundling does not raise that ceiling; it sidesteps it by only ever bundling work that has no invariants to track.

## Decision Matrix

| Trigger                                                         | Shape          | Why                                                                    |
| --------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------- |
| N small independent fixes, each 1–2 sentences                   | Bundle         | Independence plus small size makes parallel dispatch the right move    |
| 1 conceptual change with several interacting invariants         | Single shard   | Load-bearing logic — the invariant budget governs                      |
| 1 large conceptual change exceeding the invariant budget        | Multi-shard    | Partition by reasoning surface, one invariant set per shard            |
| Many near-identical artifacts stamped from one pattern          | Single shard   | One pattern, no per-item invariants — the variation is mechanical      |
| Several migrations that each carry their own contract           | One shard each | Each migration has its own invariants to preserve                      |
| 4 dependent fixes (B reads A, C reads B)                        | Sequential     | Dependency forbids parallelism — these are ordered tasks, not a bundle |
| 5 review-feedback items, mostly skill rewrites plus 1 rule fix  | Bundle         | Independent, small, 1–2 surfaces each                                  |
| A paired change whose halves must round-trip against each other | Single shard   | The cross-item invariant (the round-trip identity) lives in one place  |

The matrix encodes one distinction: does any item share an invariant with another item? If yes, the items belong together in a shard. If no, and each is small and independent, they belong apart in a bundle.

## Dispatch Mechanics

For the bundle pattern, dispatch all agents in a single message — multiple delegation calls in one response. Sequential dispatch defeats the purpose; parallel is the entire point.

```
# Dispatch round (all in one message):
Agent(prompt: "fix item 1 ...")
Agent(prompt: "fix item 2 ...")
Agent(prompt: "fix item 3 ...")
Agent(prompt: "fix item 4 ...")
Agent(prompt: "fix item 5 ...")
Agent(prompt: "fix item 6 ...")
# Items with a dependency are done inline / serialized (see below)
```

### Verify Each Delegated Deliverable

A completion message is not evidence that a file was written. After the bundle round returns, the orchestrator confirms each claimed deliverable exists on disk before treating the item as done — per `rules/subagent-delegation-verification.md` MUST §1. A subagent can exhaust its budget mid-message and emit "Now let me write X..." with nothing actually written; the one-call existence check converts that silent no-op into an immediate, loud retry.

### Concurrency Is Adaptive, Not A Fixed Cap

Do not launch the whole bundle at the runtime's native ceiling "because it allows it," and do not hardcode "one at a time." Cold-start a small first wave and back off only on the specific server-throttle signal — per `rules/subagent-delegation-verification.md` MUST NOT §1. A single agent dying, a timeout, or an "usage limit" error is not that signal and MUST NOT trigger back-off.

### Inject the Load-Bearing Invariants the Orchestrator Owns

A bundle agent runs lean by default — its prompt carries the item and the relevant material, not the repo's full rule corpus, and lean prompts produce the highest-quality raw output. But a bundle entry whose touched surface matches a governed path still has to honor the invariants the orchestrator is accountable for. Inject the matching rules' load-bearing clauses — sliced minimal, clauses only — into that agent's prompt, and keep a full-context review at the merge as the backstop. This is the three-layer model in `rules/governed-throughput.md`: lean by default (L1), curated minimal slice for any governed entry (L2), full-context gate at merge (L3). Over-injecting the whole corpus measurably degrades the output; injecting zero governance into a governed entry bypasses your invariants. The minimal slice is the only correct middle.

### Dependency Serialization

When one bundle item legitimately depends on another (item B needs an identifier or output that item A produces), serialize that pair while keeping the rest of the bundle parallel. Do not serialize the entire bundle to handle one dependency.

## The Post-Vet Round Is the Same Shape

After a sharded `/execute` cycle finishes, the `/vet` adversarial round typically surfaces a handful of small, independent corrections. This is the same bundle shape — dispatch the corrections as one parallel round, not as a fresh round of sharded tasks. The post-vet correction round is the most common application of this pattern: by construction the corrections are small, scattered, and independent, which is exactly when the bundle wins.

## Cross-References

- `rules/governed-throughput.md` — the three-layer governed-parallelism model (lean default, curated slice, full-context merge gate) that governs any parallel dispatch touching a governed path.
- `rules/subagent-delegation-verification.md` — verify each delegated deliverable exists on disk (MUST §1); adaptive throttle-aware concurrency instead of a fixed cap (MUST NOT §1).
- `rules/execution-discipline.md` § Draft/Integrate Split — each bundle entry is drafted and then integration-verified, not conflated into one step.
- `guides/deterministic-quality/02-session-architecture.md` — the broader session-shape decision space the bundle-vs-shard choice sits inside.
