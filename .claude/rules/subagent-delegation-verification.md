---
paths:
  - ".claude/agents/**"
  - ".claude/commands/**"
  - "**/workspaces/**"
---

# Subagent Delegation Verification Rules

Origin: inbound sync from loom 2026-06-05 - lifts the delegation-verification and adaptive-concurrency patterns from loom rules/worktree-isolation.md, adapted for atelier (vendor/codegen specifics stripped, phase names remapped to CO v1.2).

## Scope

These rules apply whenever a parent orchestrator delegates work to a subagent and the subagent claims to have produced an artifact — a drafted document, a dataset, a generated section, a code change, a filled template — in ANY domain (research, governance, education, finance, codegen). They govern the parent's behavior after the subagent exits and the parent's concurrency posture when launching subagents in parallel.

## MUST Rules

### 1. Parent MUST Verify A Delegated Deliverable Exists After The Subagent Exits

When a subagent reports completion of a task that was supposed to write a file, the parent MUST confirm the claimed file actually exists on disk (via a directory listing or a Read) before treating the task as done. A completion message is NOT evidence of file creation.

```markdown
# DO — verify on disk, then trust

Subagent returns "drafted the methodology comparison at <path>."
Parent lists/reads <path> to confirm it exists and is non-empty.
Only then mark the task complete.

# DO NOT — trust the prose

Subagent returns "Now let me write the comparison..." (and the turn ends).
Parent records the task as done and moves on. Nothing was written.
```

**BLOCKED responses:**

- "The subagent said 'done', that's good enough"
- "Verifying every file slows the orchestrator down"
- "The subagent would have errored if the write had failed"
- "Now let me write the file..." treated as if the file now exists

**Why:** Subagents exhaust their budget mid-message and emit "Now let me write X..." with zero files actually written — the completion prose is misleading and the filesystem is the source of truth. A one-call existence check is near-free and converts a silent no-op (a missing deliverable discovered phases later) into an immediate, loud retry.

## MUST NOT Rules

### 1. Parent MUST NOT Govern Parallel Launches By A Fixed Concurrency Cap

When launching multiple subagents in one turn, the parent MUST NOT use a fixed number or the runtime's native ceiling as the concurrency limit. Concurrency is throttle-aware ADAPTIVE: cold-start a small first wave, and back off ONLY on a specific server throttle signal — never preemptively, never on an unrelated failure.

```markdown
# DO — adaptive, signal-gated

Cold start (no throttle seen yet this session): launch a small first
wave (a few subagents), not the runtime's native maximum and not unlimited.
Back off to small serial waves ONLY when the throttle signal below fires.

# DO NOT — fixed cap or native ceiling

Launch all subagents at once "because the runtime allows it."
Or hardcode "always one-at-a-time" when no throttle has occurred (wastes headroom).
```

**The throttle signal (back off ONLY on this):** two or more subagents in the SAME launch wave fail within a short synchronized window AND the failure carries a server-side message stating the limit is a temporary request throttle — explicitly NOT the account's usage limit. A single subagent dying, a timeout, an out-of-memory, or an error that says "usage limit" is NOT this signal and MUST NOT trigger back-off.

**BLOCKED responses:**

- "The runtime's native cap is the ceiling to trust" (it throttles below that)
- "It's a usage-limit problem, wait for that" (the signal says NOT your usage limit)
- "Always one-at-a-time is the safe rule" (over-serializes low-contention sessions)
- "Rate limits only kick in on sustained load"
- "If any fail we'll just retry"

**Why:** The binding constraint is a server-side concurrency throttle that bites below the runtime's native cap — not account quota and not a fixed batch count. Trusting the native ceiling re-ships synchronized burst failures; hardcoding "one-at-a-time" wastes throughput on uncontended sessions. The adaptive model — cold-start small, back off only on the synchronized-stall-plus-"not your usage limit" signal — is the only posture that is neither extreme. The signal originates at the model-provider server boundary, so a local actor cannot fabricate it; a suppressed signal merely holds concurrency at the already-safe cold-start size — a slowdown, never an over-concurrency breach.
