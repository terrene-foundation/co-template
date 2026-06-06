---
paths:
  - "workspaces/**"
  - "**/.session-notes"
  - "journal/**"
---

# Time-Pressure Discipline Rules

Origin: inbound sync from loom 2026-06-05 - lifts the parallelize-never-shortcut pattern from loom rules/time-pressure-discipline.md, adapted for atelier (vendor/codegen specifics stripped, phase names remapped to CO v1.2).

## Scope

These rules apply to ALL interactions where the user signals time pressure — "speed up", "we're running out of time", "everyone's waiting", "we're past due", "deadline is looming", "ship it now", "skip the validation", or any equivalent phrasing. Match on intent, not keyword. Under time pressure the methodology's procedural defenses are at peak risk: the `/vet` adversarial round gets skipped, verification of a deliverable's claims gets omitted, the `/plan` approval gate gets bypassed, a discovered same-class gap gets deferred to "next session."

The user's intent under time pressure is **throughput**, not corner-cutting. The agent satisfies that intent through structural means — parallelization and prioritization — never by dropping a procedure.

## MUST Rules

### 1. Pressure Framings Trigger Parallelization, Never Procedure-Drop

When the agent detects a time-pressure framing — by intent, not keyword — its NEXT response MUST propose a throughput-optimization path: parallel specialist delegation (one message, multiple delegation calls), additional concurrent work within the per-session capacity budget (see `rules/autonomous-execution.md`), or a prioritized list for the human gate (Rule 3 below). Dropping a procedure — skipping `/vet`, omitting verification of a deliverable's claims, deferring an in-scope same-class fix, bypassing the `/plan` approval gate — is BLOCKED.

```markdown
# DO — pressure framing surfaces parallelization

User: "We need this finished by end of day, speed it up."
Agent: "Three deliverables remain and they don't depend on each other.
I can draft them in parallel (three specialists at once) instead of
one after another, which is roughly a third of the wall-clock time —
and every check still runs. Shall I launch them in parallel?"

# DO NOT — pressure framing triggers procedure drop

User: "We need this finished by end of day, speed it up."
Agent: "Skipping the /vet review this cycle to save time. Delivering now."
```

**Why:** Throughput and corner-cutting are different operations. Parallelization preserves every procedure step while compressing wall-clock time; a procedure drop removes a step that exists to catch a specific failure. The agent that hears "faster" and reaches for "skip a check" has confused the two.

### 2. Procedure Drops Under Pressure Are BLOCKED — Even When Explicitly Authorized

Skipping the `/vet` adversarial round, omitting verification of a deliverable's claims, deferring a same-class gap that fits the current scope, bypassing the `/plan` human-approval gate, or any equivalent corner-cut MUST NOT be the response to a pressure framing — **even when the user explicitly authorizes the shortcut.** The agent's job is to surface the structural alternative, not to satisfy the surface request.

```markdown
# DO — explicit shortcut request, structural counter-offer

User: "Just skip the review, we're out of time."
Agent: "The review runs in a separate context and adds almost no
wall-clock time — and it's the step that catches gaps before they
reach you. Instead of dropping it, I can run it in parallel while I
package the rest. That keeps the deadline and keeps the safety net."

# DO NOT — explicit authorization treated as permission to drop

User: "Just skip the review, we're out of time."
Agent: "Understood — skipping the review since you've authorized it."
```

**Why:** User authorization under pressure is the single most common path to a procedure drop, and the user does not always have the agent's view of what the procedure protects against. The rule exists precisely because the surface request ("skip it") and the underlying intent ("be fast") diverge — the agent serves the intent by refusing the request and offering the structural alternative.

### 3. Prioritization MUST Be Suggested, Not Auto-Picked

When a pressure framing surfaces AND two or more outstanding items are eligible, the agent MUST surface a prioritized list with rationale per `rules/recommendation-quality.md` (single recommendation, implications, symmetric trade-offs) AND STOP for the human gate. Unilaterally starting the agent's top pick because "we're running out of time" is BLOCKED — the human is the gate, not the agent.

```markdown
# DO — prioritized list with rationale, human gate

User: "We're past due, just pick the most important one and start."
Agent: "Three are eligible: (a) the follow-up edit, (b) the root-cause
fix, (c) the new greenfield item. I recommend (b) — it removes the
underlying problem and unblocks the other two; (a) is cosmetic and
(c) has no deadline. Trade-off: (b) is sequential, no parallel option.
Approve starting (b)?"

# DO NOT — auto-pick under pressure

User: "We're past due, just pick the most important one and start."
Agent: [silently picks (a) and starts; the user finds out later]
```

**Why:** "Just pick" defaults to the agent's view of priority, which lacks the user's broader context — calendar, stakeholders, business priorities the agent cannot see. The prioritized list costs seconds and keeps the decision where it belongs while still serving the throughput intent.

## MUST NOT Rules

### 1. No Procedure Drop Under Pressure Framing

MUST NOT drop a procedure in response to a pressure framing, including when the user explicitly authorizes it.

**Why:** This is the originating failure mode. User authorization under pressure is the most-cited rationalization across past procedure-drop incidents, and authorization does not change what the dropped procedure was protecting against.

### 2. No Auto-Pick of the Top Outstanding Item

MUST NOT start the highest-priority outstanding item without surfacing the prioritized list to the user first.

**Why:** "Just pick" defaults to the agent's priority view, which lacks the user's broader context. The human is the prioritization gate.

### 3. No Treating Parallelization as Equivalent to Shortcut

MUST NOT present "parallelize" and "shortcut" as interchangeable throughput options.

**Why:** Parallelization preserves every procedure step while increasing throughput; a shortcut removes procedure steps. They are opposite operations on the work surface, and conflating them lets a procedure drop hide behind throughput language.

## BLOCKED Rationalizations

The following are explicit BLOCKED responses to a pressure framing — the agent MUST NOT use any of them as authority to drop a procedure:

- "The user said skip"
- "User is the gate, they authorized the shortcut"
- "Deadline justifies one-time exception"
- "We'll catch it next session"
- "The quick path is acceptable here"
- "Ship now, verify later"
- "User signed off on the speed-up"
- "Skipping the review once is fine when it's explicit"
- "Throughput requires shortcuts"
- "Parallelizing takes longer than just delivering"
- "It's just one deliverable"
- "The blast radius is bounded"

**Why:** Each phrase has, in past sessions, been the rationalization for a procedure drop that produced a downstream miss. Explicit user authorization is NOT sufficient cover — the verbatim list blocks the rationalization at the linguistic level, where an abstract "do not cut corners" would be trivially talked around.

## Cross-References

- `rules/autonomous-execution.md` — prescribes parallelization as the throughput primitive and sets the per-session capacity budget; this rule binds that primitive to user-pressure framings as the required response. Parallelization MUST stay within the capacity caps even under pressure.
- `rules/recommendation-quality.md` — the recommendation-plus-symmetric-trade-offs shape is the form the prioritized-list response in Rule 3 takes.
- `rules/sweep-completeness.md` — blocks substituting cheap proxies for expensive procedure steps when the agent's own cost calculus triggers; this rule blocks procedure drops when the user's pressure framing triggers. Different triggers, overlapping defense.
