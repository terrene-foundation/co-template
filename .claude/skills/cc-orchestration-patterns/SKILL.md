---
name: cc-orchestration-patterns
description: Multi-agent orchestration patterns. Use when an orchestrator fans out parallel subagents, merges their output, or governs delegation throughput across CO phases.
allowed-tools:
  - Read
  - Glob
  - Grep
---

# CC Multi-Agent Orchestration Patterns

This skill is the reference for HOW an orchestrator decomposes work across parallel subagents, governs their throughput, merges their output, and assigns the right tool inventory to each — the methodology behind the delegation rules. It is domain-agnostic: every pattern works for research surveys, governance audits, education content production, finance analysis, and codegen alike.

Use this skill when:

- An orchestrator is about to fan out ≥3 independent items onto parallel subagents (`/analyze`, `/execute`, `/vet`)
- Multiple subagents will modify the same file and their changes must be merged deterministically
- You must decide what governance to inject into a lean delegation prompt, and what to hold for the merge gate
- You are choosing the tool inventory for a delegate (read-only vs. modify-and-verify)

The load-bearing MUST clauses live in the rules; this skill carries the procedural depth — the failure stories, the merge protocols, the throttle signal, the BLOCKED-rationalization corpus — that the orchestrator needs available when it is about to delegate, NOT on every session start.

## Sub-File Index

- `parallel-merge-workflow.md` — the deterministic merge protocol for parallel shards that touch the same file.
- `worktree-orchestration.md` — isolating concurrent file-mutating shards in separate worktrees.
- `workflow-orchestration-throughput.md` — the procedural how-to behind Patterns 1–3 (structured-return fragility, resume-from-run, the throttle signal).
- `closure-parity-specialist-discipline.md` — the full BLOCKED-rationalization corpus + multi-incident evidence behind Pattern 4 (closure-parity).

## The Four Orchestration Decisions

Every fan-out turns on four decisions. Getting any one wrong produces a recognizable failure.

| Decision           | The question                                             | Healthy answer                                                                  | Failure mode                                                                                    |
| ------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Shape**          | Is this a read-only fan-out or a verify→implement chain? | Fan-out for independent surveys/audits; pipeline for staged per-item flow       | Forcing a barrier (`parallel()`) where a pipeline would let items flow independently            |
| **Throughput**     | How many subagents launch concurrently?                  | Cold-start a small wave (~3); back off ONLY on the synchronized throttle signal | Trusting the runtime's native ceiling (synchronized burst-death) OR hardcoding one-at-a-time    |
| **Governance**     | What rules does the lean shard carry?                    | Curated minimal slice at generation (L2); full-context gate at merge (L3)       | Full-corpus dump (degrades output + re-triggers throttle) OR zero governance on a governed path |
| **Tool inventory** | Can the chosen agent actually do the work?               | Modify-and-verify work → Bash+Read+Edit; read-only audit → Read/Grep/Glob       | A read-only analyst assigned verification/modification work, halts at the first write boundary  |

## Pattern 1 — Govern at the Gate, Inject the Minimal Slice (throughput)

A parallel subagent runs LEAN by default: its delegation prompt carries the task and the tool listing, NOT the orchestrator's rule corpus. The orchestrator owns conveying governance, and the evidence is counter-intuitive: **lean generation plus a full-context merge gate beats injecting everything.**

| Layer  | What it is                                | When                                 | Status                       |
| ------ | ----------------------------------------- | ------------------------------------ | ---------------------------- |
| **L1** | Specialist agent type (sets context)      | Optional                             | Insufficient alone           |
| **L2** | Curated minimal rule-slice (clauses only) | At generation, into the shard prompt | Load-bearing for compliance  |
| **L3** | Full-context review of the diff           | At merge, before the shard lands     | Backstop for what L2 dropped |

Four load-bearing findings from the governance-for-performance evidence:

1. **Lean generation + full-context merge gate beats inject-everything.** Lean prompts produced the highest-quality output. Govern at the gate (L3); inject only minimal slices at generation (L2).
2. **Over-injection DEGRADES output.** A dense rule-slice dropped a rule-authoring plan from ~93 to 82. Inject curated, load-bearing clauses only — no examples, no Origin, no rationale paragraphs.
3. **Curated slices beat generic verbosity, and the gap GROWS as the model weakens.** If you delegate to a cheaper or weaker model, curated slices matter MORE; generic "be thorough" preambles actively harm.
4. **Injection's value is COMPLIANCE, not quality.** Inject to ensure the shard honors invariants you are accountable for, not to make it "smarter."

**The slice selector is deterministic:** glob the shard's touched-file set against every rule's `paths:` frontmatter; the matching rules' MUST / MUST-NOT clauses ARE the slice. Read the frontmatter from committed state on disk, never a sibling shard's mid-edit copy.

```text
# DO — curated minimal slice (clauses only), full-context gate at merge
slice = "GOVERNANCE (honor these — you are accountable):
  - domain-independence MUST §1: no domain-specific assumptions; works for any domain.
  - no-stubs MUST §1: no [TODO]/[TBD] placeholders in canonical artifacts."
delegate(slice + task)        # L2: compliance lever
# L3: reviewer runs FULL context (not slice-limited) at merge.

# DO NOT — full-corpus dump (degrades output + re-triggers the throttle) OR zero governance.
```

This is the procedural depth behind `rules/governed-throughput.md` (the L1/L2/L3 contract).

## Pattern 2 — Read-Only Fan-Out vs. Verify→Implement Pipeline (shape)

| Shape                         | When                                                               | Mechanism                                                | Wall-clock                               |
| ----------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- | ---------------------------------------- |
| **Read-only fan-out**         | Surveys, audits, claim-verification — independent, no shared edits | Independent concurrent calls, no shared-source edits     | Slowest single call                      |
| **Verify→implement pipeline** | Each item flows through stages independently                       | A pipeline with no barrier; each item flows alone        | Slowest single chain, NOT sum-of-stages  |
| **Barrier (all-results)**     | A stage needs ALL prior results (dedup, early-exit, cross-compare) | An explicit barrier collecting every result              | Slowest stage across all items           |
| **Loop-until-dry**            | Accumulate to a target or until K consecutive empty rounds         | Honest tail — re-launch until the round comes back empty | Variable; honest tails beat fixed counts |

Use the barrier ONLY when a stage genuinely needs all prior results. Defaulting every fan-out to a barrier serializes wall-clock to the slowest stage when a pipeline would let fast items finish first.

**Structured returns — fragility lesson:** schema-forced specialist agents can fail to call their structured-return tool, especially across an auth interruption mid-run. Mitigation: use non-schema agents for analysis (return text — reliable); reserve schema returns for judges and machine-checkable verdicts; tolerate dropout by filtering out empty results; keep waves small so a failed wave is cheap to re-run.

**Resume-from-run recovery:** a killed or edited workflow can re-run only the changed calls; the unchanged prefix returns cached. Edit the persisted script, re-invoke pointing at the prior run id.

## Pattern 3 — Throttle-Aware Adaptive Concurrency (throughput)

The runtime's native concurrency cap is too high to trust. The binding constraint is a **server-side concurrency throttle that bites BELOW the native ceiling** — not account quota, not a fixed batch count.

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

**The throttle signal (back off ONLY on this):** two or more subagents in the SAME wave fail within a short synchronized window AND the failure carries a server message stating the limit is a temporary request throttle — explicitly NOT the account's usage limit. A single agent dying, a timeout, an out-of-memory, or an "usage limit" error is NOT this signal.

**BLOCKED rationalizations:** "The native cap is the ceiling to trust" (it throttles sub-quota) / "It's a usage-limit problem" (the string says NOT your usage limit) / "Always one-at-a-time is the safe rule" (over-serializes) / "A retry loop will handle throttles" / "Five worked last week, six should too." This is the depth behind `rules/subagent-delegation-verification.md` MUST NOT §1.

## Pattern 4 — Closure-Parity / Verification Specialists Need Bash + Read (tool inventory)

A verification specialist that must run commands to verify (list files, parse, count, diff, check collection) MUST be given Bash + Read — NOT a read-only inventory (Read/Grep/Glob). A read-only analyst assigned a verification mission halts at the first command boundary: it narrates the intended check, then FORWARDS the rows it could not verify to the next round, burning a full cycle.

**Delegation-time detection signals** — before launching, scan the prompt-being-drafted for verification markers. Presence of ANY obligates a Bash+Read specialist; selecting a read-only analyst with these present is BLOCKED:

- **Verification verbs**: "verify closure," "closure parity," "convert forwarded rows to verified," "map findings to delivered output"
- **Commands named in the mission** that require Bash: file listing, AST/structure parsing, collection counts, diffs against a baseline
- **Closure-parity nouns**: "round-N closure parity," "post-merge verification," "wave-N → wave-N+1 audit," "convergence check"

**BLOCKED rationalizations (read-only analyst on a verification round):**

- "The analyst is the audit specialist; verification IS audit"
- "The next reviewer round can pick up the forwarded rows"
- "Read+Grep+Glob covers most verification"
- "I'll let the agent figure out it lacks the tool"
- "Execution-time error is fine; the agent will surface it"

**Why the discipline holds:** the delegation-time scan is O(1); re-launching after the agent forwards rows is O(N) on row count and burns the round. Surfacing the mismatch before launch converts a recall-it-yourself principle into a draft-time check the orchestrator runs every cycle. This is the depth behind `rules/delegation-orchestration.md` MUST §4 (tool-inventory match before delegation).

## Pattern 5 — Parallel-Merge Workflow (merging one file from many agents)

When multiple agents modify the SAME file in parallel and each passes its own checks in isolation, merge their changes deterministically rather than rebasing or three-way merging.

| Step | Action                                                                                                                                                                                                                                        |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Identify unique variants** — filter each agent's branch by a per-feature marker so one branch = one feature                                                                                                                                 |
| 2    | **Generate per-feature diffs vs. the committed base** — each diff isolates one feature's additions                                                                                                                                            |
| 3    | **Delegate the merge to a specialist** with explicit injection-point documentation — which imports, params, fields, methods to add, and which existing sections to modify and where. Do NOT apply diffs mechanically: line offsets drift      |
| 4    | **Handle interaction points** — when two features touch the same section, document the order explicitly (e.g. one adds inside a lock, the other after; both must be present)                                                                  |
| 5    | **Verify with checks** — run the specialist's own checks, THEN the project-wide suite to catch interaction regressions                                                                                                                        |
| 6    | **Stale-base detection (pre-merge gate)** — if a branch and the target differ by a large margin on the same file, STOP and require human disambiguation. A branch based on a pre-refactor base silently re-inlines extracted content on merge |
| 7    | **Numeric invariants (same-change rule)** — a refactor that shrinks/extracts/consolidates a file MUST land a programmatic size-invariant check in the SAME change, in the default check path                                                  |
| 8    | **Post-merge invariant re-check** — re-run the invariants after EACH merge; a violation is a STOP signal. Without per-merge checks, a regression from merge 2 compounds silently through merges 3-5                                           |

**Merge anti-patterns:** sequential rebasing (each rebase fights the previous merge's line shifts) / cherry-picking (loses per-feature check verification) / manual three-way merge (error-prone for 5+ concurrent features) / trusting the "individually passing" claim (interaction points are rarely tested in isolation — always re-run the full suite after merge) / merging without a stale-base check / landing a refactor without a numeric invariant check.

This is the procedural depth in `parallel-merge-workflow.md`.

## Pattern 6 — Worktree-Isolated Agents: the Agnostic Subset

For agents that work in isolated checkouts and merge back, three disciplines are agnostic and load-bearing. The load-bearing MUST clauses live in `rules/subagent-delegation-verification.md` and `rules/delegation-orchestration.md`; this is a pointer, not a duplicate.

- **Commit-as-you-go** — an isolated checkout with zero commits is silently auto-cleaned on exit. An agent that writes perfect content but exits before committing loses 100% of its output. Instruct: commit after each unit of work; do NOT hold all work in the index until the final report.
- **Post-exit deliverable verification** — after the agent reports done, confirm the claimed file exists on disk (list or read it) before treating the task as landed. A budget-exhausted agent emits "Now let me write X…" with no write behind it; the filesystem is the source of truth.
- **Adaptive concurrency** — see Pattern 3. Cold-start a small wave; back off only on the synchronized throttle signal.

See `worktree-orchestration.md` and the two rules above for the full failure-story corpus; this skill does not duplicate them.

## How This Skill Is Used

| Phase / Command                | Use                                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| `/analyze` (parallel research) | Patterns 1-3: shape the fan-out, govern the slice, cap concurrency throttle-aware            |
| `/execute` (parallel drafting) | Patterns 1, 3, 5, 6: govern shards, merge same-file output, isolate-and-verify               |
| `/vet` (reviewer fan-out)      | Patterns 3, 4: throttle-aware reviewer waves; verification specialists get Bash+Read         |
| Any orchestrated delegation    | Pattern 1 (L1/L2/L3) on every governed-path shard; Pattern 4 tool-inventory match pre-launch |

## Cross-References

- `rules/governed-throughput.md` — the enforced L1/L2/L3 contract (Pattern 1 is its procedural depth)
- `rules/subagent-delegation-verification.md` — post-exit verification + adaptive-concurrency MUST clauses (Patterns 3, 6)
- `rules/delegation-orchestration.md` — decompose-by-default, tool-inventory match, mechanical-sweep reviewer prompts (Patterns 4, 6)
- `skills/cc-artifact-patterns/` — CC artifact quality (the authoring-craft sibling to this orchestration skill)
- `skills/atelier-broker-model/` — tier classification and downstream impact, for routing what a fan-out produces

## Honest Limits

This skill captures orchestration patterns observable in the delegation corpus. It does NOT cover:

- Cross-repo orchestration (subagents are per-repo; cross-repo coordination is via the broker, not a fan-out)
- Orchestration of teams larger than a handful of concurrent agents per wave (throttle-aware waves cap practical concurrency well below any team-scale ceiling)
- Domain-specific merge semantics (the merge protocol is structural; domain content conflicts still need a domain specialist)

When evidence accumulates via the project workspace trail or the learning digest, this skill is a target for `/codify` updates.
