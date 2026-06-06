# Worktree-Isolated Orchestration — the Agnostic Subset

Procedural depth for SKILL.md Pattern 6. When an orchestrator delegates to subagents that work in ISOLATED checkouts and merge their output back, three disciplines are domain-agnostic and load-bearing: commit-as-you-go, post-exit deliverable verification, and adaptive concurrency back-off on the synchronized-stall signal. This file carries the methodology — WHY each discipline holds and the failure it prevents — not the mechanics of any particular isolation tool.

The load-bearing MUST clauses live in `rules/subagent-delegation-verification.md` and `rules/delegation-orchestration.md`. This file is the failure-story depth behind them; it does NOT duplicate the clauses.

Domain-agnostic: an isolated agent may be drafting a report section, building a dataset, producing a spec, or generating any artifact in its own working area before fan-in. The disciplines below are about the isolation-and-merge lifecycle, independent of what is produced.

## Why Isolation Needs Its Own Disciplines

Isolation buys parallelism — two agents editing the same surface no longer step on each other, and each produces a cleanly-mergeable unit. But isolation also creates two new failure surfaces that do NOT exist for an in-context agent: an isolated working area can be silently reclaimed if the agent leaves nothing durable behind, and the orchestrator cannot see inside the isolated area until fan-in, so a claimed deliverable that never landed is invisible until it is needed. The three disciplines below close exactly those gaps.

## Discipline 1 — Commit-as-You-Go (Incremental, Verifiable Progress)

An isolated working area that the agent never durably checkpoints is at risk of being reclaimed on exit — and an agent that writes perfect content but exits before checkpointing it loses 100% of its output.

**Instruct the delegate explicitly:** durably record each unit of work the moment it is complete — checkpoint after each file or section, do NOT hold all work in a staging area until the final report. The single most common loss mode is an agent that drafts a complete unit, then exhausts its budget on the NEXT message ("Now let me write the next part…") having never checkpointed the first — so the completed work is reclaimed along with the isolated area.

**Why incremental, not batched at the end:** a single end-of-run checkpoint means any interruption — budget exhaustion, crash, interruption — loses everything since the start. Incremental checkpoints bound the loss to the current in-flight unit. The instruction costs one sentence in the delegation prompt; the loss it prevents is the agent's entire output.

This is the depth behind `rules/delegation-orchestration.md` (decompose-and-delegate) and pairs with Discipline 2 below: incremental checkpointing protects the isolated area, post-exit verification protects against a claim that never produced a durable artifact at all.

## Discipline 2 — Post-Exit Deliverable Verification

After a delegated agent reports a file-producing task done, the orchestrator MUST confirm the claimed deliverable exists on disk — list it or read it — before treating the task as landed and building the next step on it. A completion message is NOT evidence of a write.

The failure mode: a budget-exhausted agent emits "Now let me write X…" with no tool call behind it, then the turn ends. The prose says done; the filesystem says nothing was written. The existence check is O(1) and converts a silent no-op — discovered phases later when a downstream step reads an absent or empty file — into an immediate, loud retry.

**This file does NOT duplicate the protocol.** The full post-exit verification clause, its BLOCKED-response corpus, and the convergence-receipt extension live in `rules/subagent-delegation-verification.md` MUST §1. This entry is the pointer plus the one-line rationale for why isolation makes the check non-optional: the orchestrator cannot see inside the isolated area before fan-in, so the filesystem check at fan-in is its first and only chance to catch the empty deliverable.

## Discipline 3 — Adaptive Concurrency Back-Off on the Synchronized-Stall Signal

Concurrent launches of isolated agents MUST be governed by an adaptive back-off model, NOT a fixed cap and NOT the runtime's native ceiling. Cold-start a small wave (a few at a time, ~3); back off to small serial waves ONLY when the synchronized throttle signal fires.

**The synchronized-stall signal (back off ONLY on this):** two or more agents in the SAME wave fail within a short synchronized window (tens of seconds) AND the failure carries a server-side message stating the limit is a temporary request throttle — explicitly NOT the account's usage limit. A single agent dying, a timeout, an out-of-memory, or a "usage limit" error is NOT this signal and MUST NOT trigger back-off.

**Why neither extreme works:** the binding constraint is a server-side concurrency throttle that bites BELOW the native ceiling — so trusting the native ceiling re-ships synchronized burst-death, while hardcoding "always one-at-a-time" wastes throughput on uncontended sessions. The adaptive model — cold-start small, back off only on the synchronized-stall-plus-"not your usage limit" signal — is the only posture that is neither. Isolation itself is unaffected by the concurrency count; only the governance of how many isolated agents launch at once is reframed.

The full clause and BLOCKED-rationalization corpus live in `rules/subagent-delegation-verification.md` MUST NOT §1; `workflow-orchestration-throughput.md` carries the same signal in its throughput context. This entry frames it specifically for the isolated-agent lifecycle.

## What This File Deliberately Omits

To stay domain-agnostic and methodology-focused, this file does NOT cover the mechanics of any specific isolation tool — how isolated areas are created, base-revision selection, branch-naming conventions, or compile-environment isolation. Those are tool-specific and belong to whichever execution tool implements the isolation, not to the CO orchestration methodology. The three disciplines above are the agnostic, load-bearing subset that holds regardless of the mechanism.

## Cross-References

- `rules/subagent-delegation-verification.md` MUST §1 (post-exit deliverable verification) + MUST NOT §1 (adaptive concurrency) — the load-bearing clauses Disciplines 2 and 3 point to; this file does not duplicate them.
- `rules/delegation-orchestration.md` — decompose-and-delegate discipline that Discipline 1 supports.
- `SKILL.md` Pattern 6 — the orchestration-decision framing this file is the depth behind.
- `workflow-orchestration-throughput.md` — the same throttle-aware concurrency signal in the broader throughput context.
- `parallel-merge-workflow.md` — the deterministic fan-in protocol for when isolated same-artifact changes merge back.
