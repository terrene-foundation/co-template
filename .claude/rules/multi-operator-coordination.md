---
paths:
  - "**/.session-notes"
  - "workspaces/**"
---

# Multi-Operator Coordination Rules

Origin: inbound sync from loom 2026-06-05 — lifts the claim/lease coordination kernel from loom rules/multi-operator-coordination.md, adapted for atelier (loom's crypto-signing, hash-chain, genesis, and VCS-adapter machinery dropped — ~85% of the source; phase names remapped to CO v1.2).

## Scope

These rules apply whenever two or more operators work the SAME atelier repository concurrently, each in their own session, editing the same or adjacent workspace files — in ANY domain (research, governance, education, finance, codegen). They do NOT govern a single operator running sequential sessions.

## MUST Rules

### 1. Coordinate Through An Explicit Shared Claim Record, Not Inferred Intent

Concurrent operators MUST discover each other through an EXPLICIT shared claim/lease record — a stated "I am working this path now" — NOT by inferring intent from journals, `.session-notes`, or status files. Guessing a sibling is mid-edit from their journal is BLOCKED as the coordination mechanism.

```markdown
# DO: stake a claim on the path in the shared record; siblings read it and defer.

# DO NOT: "the journal shows analysis here yesterday, so nobody's editing now."
```

**Why:** Journals, session notes, and status files record knowledge and history, not live occupancy — inferring "who is editing now" from them goes stale the moment it is read. Only a record whose PURPOSE is to signal an active claim can mean "this path is taken right now."

### 2. Claim Before Edit — Never Edit Then Claim Retroactively

An operator MUST stake the claim BEFORE the first edit to a shared-class scope. Editing first and recording the claim afterward is BLOCKED.

```markdown
# DO: claim → confirm uncontested → edit.

# DO NOT: edit the shared file → backfill the claim → find a sibling was already mid-edit.
```

**Why:** A claim staked after the edit records a collision that already happened, not a gate that prevents one. Claim-before-edit converts a silent concurrent-edit into a deterministic "defer" before work is lost; the reverse turns every shared file into a merge contest.

### 3. Same-Class Concurrent Work Gates; Independent Work Parallelizes

Two operators on the SAME scope (same path, glob, or workspace) MUST gate — one defers or re-scopes. Operators on INDEPENDENT scopes (different workspaces, non-overlapping paths) parallelize freely. The claim record distinguishes the two; "we'll both be careful" is BLOCKED as a substitute.

```markdown
# DO: A claims workspaces/research-sync/**, B claims workspaces/gov-audit/** → both proceed.

# DO NOT: both edit the same draft "carefully, in different sections" → merge-invariant violations.
```

**Why:** Same-class concurrent edits produce conflicts that erase one operator's work, or merge violations a reviewer cannot catch without re-reading both transcripts — the merge-loss dominates the throughput "gain." Independent work carries no such cost, so it parallelizes; the claim record is the only structural defense.

### 4. A Gate Approval Needs Genuinely-Distinct Approvers (4-Eyes)

When a coordination decision needs sign-off (releasing a claim another operator holds, approving a shared-state change), the approver MUST be a genuinely distinct operator from the requester — including across a second session under the same identity. The check is operator-identity inequality, NOT session inequality.

```markdown
# DO: A requests release of B's stale claim → a distinct operator C approves.

# DO NOT: A opens a second session and "approves" A's own request from it.
```

**Why:** A gate approval's entire meaning is the distinctness check — an approval from the requester's own identity is indistinguishable from no approval. Counting sessions instead of operators re-opens the self-approval path the gate exists to close: one human with two sessions is still one set of eyes.

### 5. Capacity Is Counted Per-Operator, Not Per-Session

The per-session capacity budget (`rules/autonomous-execution.md` § Respect the Per-Session Capacity Budget) MUST be counted per-OPERATOR. An operator running two concurrent sessions does NOT get two budgets — the operator's identity is the budget key. Treating a second session as fresh capacity is BLOCKED.

```markdown
# DO: one operator with two sessions tracks ONE shared budget against the shard-fit ceilings.

# DO NOT: "session one is at capacity, so I'll open a second to do more in parallel."
```

**Why:** Per-session counting lets one operator amplify load past the structural ceiling by opening parallel sessions — the cross-file invariant tracking the ceiling defends degrades the same whether load comes from one session or two of the same operator's. Per-operator accounting closes that loophole.

## Cross-References

- `rules/autonomous-execution.md` — the per-session capacity budget this rule re-keys to per-operator (MUST §5).
- `rules/journal.md` — journals are a knowledge trail, NOT a coordination signal (MUST §1).
