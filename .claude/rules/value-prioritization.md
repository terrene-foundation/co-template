---
paths:
  - "workspaces/**"
  - "**/journal/**"
  - "**/.session-notes"
  - "**/specs/**"
---

# Value-Prioritization Rules

Origin: inbound sync from loom 2026-06-05 - lifts the rank-by-user-value-before-fit pattern from loom rules/value-prioritization.md, adapted for atelier (vendor/codegen specifics stripped, hook detectors and empirical-ablation receipts dropped, phase names remapped to CO v1.2).

## Scope

These rules apply to every **selection event** in any CO workflow — choosing what to work on next, what to defer, what to close, what to surface at `/sweep` or `/wrapup`. They govern the **axis** candidates are ranked on. Without an explicit value-rank axis, the agent defaults to _fittability_ — small, scoped, low-risk, "fits one pass" — and ships the streetlight version of progress: small-fittable-low-value work gets perfect coverage while the user's actual high-value work decays in the deferred queue across `/clear` boundaries.

A **value-anchor** is one sentence stating WHY a candidate delivers value TO THE USER, in the user's language, citing a source from a **CLOSED ALLOWLIST**: **(a)** the user's `brief.md` for the active workspace, **(b)** a workspace journal `DECISION-` entry, **(c)** a spec § success criterion the user authored or approved, **(d)** a literal user quote this session. Citations NOT matching {a, b, c, d} are BLOCKED for primary value-rank. `CLAUDE.md`, rules, prior feedback, "institutional precedent," "the user obviously wants," and implied preferences are agent-loaded baseline — not user-authored — and all fail the allowlist test.

## MUST Rules

### 1. Value-Rank Precedes Fit At Every Selection Event

When the agent surfaces ≥2 candidates for the user to pick between, it MUST present a **value-ranked list first**, each candidate carrying a value-anchor. Fit considerations (scope size, blast radius, clean diff) apply ONLY as tiebreakers AFTER the value-rank. Picking a low-value candidate because it fits while a higher-value one needs decomposition is BLOCKED — the higher-value candidate MUST be decomposed instead (Rule 2). When the agent picks the lower-value candidate for a legitimate tiebreaker, the trade-off MUST be named: "X is higher-value per [anchor]; Y is more fittable. Recommend Y because [reason]; alternative is to decompose X."

```markdown
# DO — value-ranked list, named trade-off, explicit alternative

(1) Cross-domain coverage audit (HIGH). Anchor: brief.md "must hold for
governance and education" — two domains remain unverified.
(2) Cross-reference cleanup (LOW). Anchor: none user-facing; tidies links.
Recommend #1, decomposed across 2 sessions per Rule 2. Alternative: pick #2
for a small deliverable today, at the cost of coverage sitting unverified.

# DO NOT — silent fit pick: "Picking the cleanup — smallest, fits one pass, cheap."
```

**BLOCKED rationalizations:** Fit-anchors — "fits one pass" / "smaller is safer" / "cheap and bounded" / "clean diff" / "atomic delivery". Defer-anchors — "needs decomposition first" / "back to it next session" / "tracked separately" / "carried-forward". Proxy-for-value — "smaller scope = higher delivery probability" / "small wins unlock the bigger work". Authority-misappropriation — "user implicitly preferred this earlier" / "user obviously wants the safe path". Time-pressure-as-authority is BLOCKED — pressure triggers PARALLELIZATION of value-ranked candidates, NOT downgrade to whatever is fittable.

**Why:** The selection function defaults to whichever candidate has the most _legible_ signal, and small-fittable-low-risk is most legible because each axis is mechanically gradable. User-value is harder to grade — it requires re-reading the brief and journal DECISION entries — but it is the axis the user actually cares about. Value FIRST, fit SECOND converts streetlight selection into a forest-aware pick.

### 2. Deferred Items MUST Carry Value-Anchors That Survive `/clear`

When a workstream is decomposed and parts are scheduled for later (workspace todos, journal DEFER entries, "carried-forward" lines, follow-up bullets), EACH deferred part MUST be filed with a value-anchor citing an allowlist source. Filing with only technical rationale (line counts, dependency order, "fits next") is BLOCKED. Filing as "carried-forward" without a value-anchor is BLOCKED — the missing anchor IS the problem; the fix is to record value, not invent a deadline.

```markdown
# DO — deferred part carries a value-anchor + technical detail

- Part 2 (deferred): Value-anchor — completes governance-domain coverage
  per brief.md; without it the methodology ships claiming reach it has not
  shown. Technical — depends on Part 1; re-validation gate per Rule 3.

# DO NOT — technical rationale only / "carried-forward" without anchor

- Part 2 deferred. Depends on Part 1. Will pick up next session.
```

**BLOCKED reframings** — euphemisms that route around "carried-forward": "Phase II/N scope," "future iteration," "out of MVP/v1," "post-launch," "stretch goal," "nice-to-have," "roadmap item," "P2 priority," "below the cut-line." Each removes the item from the queue without recording user-stated value; each MUST carry an adjacent value-anchor.

**Why:** Deferred items lose their context by definition — the next session reads the notes and journal WITHOUT the conversation that produced them. The technical rationale survives the boundary; the value rationale evaporates unless recorded. Once gone, the item is institutionally dead: the next session sees a technical scope and asks "this or something cheaper?" with no axis to answer.

### 3. Re-Pickup Of Deferred Work MUST Re-Validate The Value-Anchor

At the start of any session that picks up a deferred item, the agent MUST re-validate the value-anchor BEFORE resuming. If recorded, surface it and ask "is this still your value?" If NOT recorded, surface "this deferred item lacks a value-anchor — what is its current value to you?" rather than picking it up on faith. Silent inheritance across `/clear` boundaries is BLOCKED. Items deferred ≥2 sessions ago without re-pickup MUST surface a "still wanted?" gate at the next `/sweep` or `/wrapup`.

```markdown
# DO — re-pickup begins with value-anchor check

Picking up the governance-coverage deferral. Recorded anchor: "completes
cross-domain coverage per brief.md." Re-validation: brief still active? User's
most recent feedback referenced cross-domain reach as in-flight — anchor holds.

# DO NOT — re-pickup begins with technical context only

Resuming the governance-coverage work. Last session left off at the template step.
```

**BLOCKED rationalizations:** "Revalidation is overhead for short deferrals" / "Value can't have decayed in N days" / "User already approved this once" / "Auto-resume from notes is the documented path" / "If value had decayed, user would have said so."

**Why:** Claims about session-boundary state are unfalsifiable after `/clear`. The agent has no audit trail proving the user still wants the item; absent that, the disposition under uncertainty is to ask, not assume. The 2-session threshold is the structural defense against silent decay.

### 4. Closing Value-Bearing Work As "Not Planned" Requires A User Gate

A todo, journal DEFER entry, or tracked item carrying a value-anchor MUST NOT be closed as "not planned," "wontfix," "deferred indefinitely," or "out of scope" without explicit user approval IN THE SAME SESSION. The agent MAY recommend closure with a value-decay rationale ("the brief moved on" / "work landed elsewhere"); the user MUST accept. Auto-closure by age ("stale ≥30 days") rather than by value-decay is BLOCKED. Reframing as "downstream responsibility" or "out-of-scope" without a user gate is closure under another name and is BLOCKED. OR-escape recommendations ("implement X **OR** note X is out of scope") delegate the closure decision to the next session, which always picks the cheaper proxy — recommendations MUST commit to ONE disposition: (1) implement with value-anchored parts, (2) record a user-gated value-decay note, or (3) close with a user gate.

```markdown
# DO — closure with value-decay rationale + user gate

Governance-coverage deferral (anchor: "cross-domain reach per brief.md"):
Recommend closing as **superseded** — coverage was met by last cycle's
spec-rewrite; value delivered by another path. Approve close? (y/N)

# DO NOT — auto-close by age / reframe-as-out-of-scope / OR-escape

Open 35 days, no activity. Closing as not-planned per stale policy.
[OR pattern] Add coverage tasks OR a note that coverage is out of scope.
```

**BLOCKED rationalizations:** "Open 30+ days, time to close" / "Value rationale is stale anyway" / "Cleaning up the backlog" / "User can re-open if they care" / "Reframing isn't closure" / "Both OR options resolve the finding."

**Why:** The user's value rationale is the load-bearing claim that the work matters. Closing without re-validating is the terminal step in deferral-as-forgetting: the item leaves the queue, the rationale leaves the audit trail, and the next time the user asks "did we ever address X?" the answer is "we closed it months ago." The user gate is the only mechanism that catches value-still-applies before closure becomes fact.

### 5. The Brief Is The Primary Anchor; Process-Health Is Secondary

Value-ranking MUST cite a primary source from the closed allowlist. Process-health axes (cross-reference integrity, spec-coverage gaps, technical debt, audit findings, "cleaner structure") are SECONDARY — they belong as cons under a primary-ranked option, not as primary-rank justification. Ranking by process-health alone with no user-anchored citation is BLOCKED. Citing a prior feedback memory or rule as standalone authority to drop work is BLOCKED — those codify HOW the agent works, not WHICH workstreams the user wants delivered.

```markdown
# DO — primary anchor user-anchored, process-health secondary

1. Cross-domain coverage (HIGH). Primary: brief.md "must hold for governance
   and education." Secondary: also closes two open spec-coverage gaps.
2. Cross-reference cleanup (LOW). Primary: none — internal hygiene.

# DO NOT — process-health as primary / memory as authority to defer

1. Cross-reference cleanup (HIGH). Removes dangling links, lowest risk.
2. Cross-domain coverage (MED). Bigger scope, harder to verify.
```

**BLOCKED rationalizations:** "Process health IS user value" / "User obviously wants the safe path" / "Cross-reference integrity is what the user is paying for" / "Reliability work is always high-value" / "Per the feedback memory we don't do this kind of work."

**`/autonomize` is a HOW, not a WHAT-anchor.** It removes hedging on TECHNICAL choices when a clear pick exists; it does NOT transmute a Rule-5-blocked pick into an authorized one, and is NOT an allowlist source. BLOCKED: "/autonomize covers technical picks within a disposition" / "the WHAT was determined; only HOW remains under /autonomize" / "structural axes plus /autonomize-authority equal a primary anchor." For a selection lacking an allowlist primary anchor, `/autonomize` itself directs the agent to surface the missing evidence and request specific confirmation — which IS the optimal move.

**Why:** Process-health axes are legitimately important — but they are the agent's professional concerns, not the user's. The user comes with a brief; process health is the agent's responsibility to maintain in the BACKGROUND while delivering it, not the brief's substitute. When process health becomes the primary rank, the agent has re-briefed itself. The `/autonomize`-as-authority pattern is the same conflation one level deeper: a HOW-directive cited as if it were a WHAT-anchor.

## MUST NOT Rules

### 1. No "No Deadline" As A Downgrade Signal

- **DO:** "No deadline, but brief.md ranks it HIGH — value, not urgency, sets the rank."
- **DO NOT:** "No deadline on this one, so it can wait behind the time-boxed work."

**Why:** The absence of an artificial deadline does NOT indicate low value. Items without deadlines never advance if every session prioritizes the clocked work, even when the clocked work has lower user-stated value.

### 2. No Treating Decomposition Pressure As A Deferral Signal

- **DO:** "This high-value candidate exceeds one session — decompose it into value-anchored parts."
- **DO NOT:** "This is too big for one pass, so defer it and pick the smaller item."

**Why:** When a high-value candidate exceeds capacity, the disposition is to DECOMPOSE (with value-anchored parts per Rule 2), not to DEFER and pick a smaller fittable item. Decomposition keeps value moving; deferral lets it decay.

### 3. No Framing The Fit-Pick As The Only Candidate

- **DO:** "Two candidates: A (higher value), B (more fittable). Recommend B because [reason]; A is the alternative."
- **DO NOT:** "I'll start with B." (presented as if B were the only option)

**Why:** Hiding the candidate set inverts the user's structural ability to override (Rule 1's named-trade-off requirement). Silent presentation of the small pick AS IF it were the only option is the streetlight pattern at its most invisible.

## Cross-References

**Extends** `rules/execution-discipline.md` (which governs HOW to execute a chosen item — this rule governs WHICH item is chosen and on what axis). **Pairs with** `rules/communication.md` — value-ranked candidates MUST be framed as outcomes, not technical scope.
