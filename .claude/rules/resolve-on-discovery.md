---
paths:
  - ".claude/**"
  - "**/workspaces/**"
  - "**/*.md"
---

# Resolve on Discovery Rules

Origin: inbound sync from loom 2026-06-05 - lifts the "if you found it you own it" family from loom rules/zero-tolerance.md, adapted for atelier (vendor/codegen specifics stripped, phase names remapped to CO v1.2). Codegen-only clauses (stubs, silent fallbacks, version-sync, deprecation cycles) dropped — stubs are already covered by `rules/no-stubs.md`.

## Scope

These rules apply to ALL phases of any CO workflow, ALL agents, ALL artifacts. A pre-existing defect discovered mid-task — a broken cross-reference, a stale citation, a dangling file path, a finding from a verification pass — is in scope the moment you see it, regardless of who introduced it.

## MUST Rules

### 1. Fix What You Discover, This Run

If you found it, you own it. By default, a pre-existing failure, broken cross-reference, or stale citation discovered mid-task MUST be fixed in THIS run — not deferred, not logged, not acknowledged-only. This default has exactly ONE bounded carve-out — the named **Exception** at the end of this clause (user says skip, OR the fix needs an out-of-authority decision); absent that carve-out, the fix is unconditional. The default and the Exception are not in tension: the default governs every discovery, and the Exception is the only path that converts "fix it now" into "surface the choice + track a todo" — never into silent dismissal.

```markdown
# DO:

While drafting a rule, you notice an existing rule cites `rules/old-name.md`
which no longer exists. You fix the dead reference in this run, then continue
your task.

# DO NOT:

"Noting that rules/old-name.md is a dead reference — out of scope for this task,
flagging for later." (acknowledgement without a fix)
```

**BLOCKED responses:**

- "Pre-existing issue, not introduced in this session"
- "Outside the scope of this change"
- "Known issue for future resolution"
- "Flagging for a follow-up pass"
- ANY acknowledgement, note, or log entry without an actual fix

**Why:** Deferring creates a ratchet — every session inherits more unresolved defects, and "pre-existing" becomes the institutional excuse that defers every fix forever. The marginal cost of fixing a dead cross-reference the moment you see it is near zero; the cost of letting it propagate to every downstream domain on next sync is not.

**Exception (the one bounded carve-out to the default above):** The fix-it-now default holds UNLESS one of exactly two conditions applies — (1) the user explicitly says "skip this," OR (2) the fix requires a decision outside your authority (e.g., deleting a referenced artifact rather than repairing the reference). When a carve-out condition applies, you do NOT defer silently: you surface the specific choice with a recommendation AND open a tracked todo, which is itself an action taken in THIS run. The carve-out narrows WHAT you do (surface + track instead of repair); it never licenses doing nothing. Silent dismissal — naming or logging the defect with no surfaced choice and no tracked todo — is the BLOCKED behavior above and is NOT covered by this carve-out.

### 2. "Pre-Existing" Is Unprovable After a Context Boundary

Any disposition resting on "pre-existing," "not introduced this session," or "outside this task's blast radius" MUST cite a **versioned anchor** — a commit, tag, or other timestamped marker that provably pre-dates the session's first action. Absent such an anchor, the claim is structurally unfalsifiable and BLOCKED. The disposition under that uncertainty is: fix it.

```markdown
# DO:

"This citation was already stale as of the tagged release that pre-dates this
session — versioned anchor confirms it is pre-existing. Fixing it now anyway
since I'm in the file."

# DO NOT:

"I didn't introduce this — it was already broken." (no anchor; after /clear or
a sub-agent handoff there is no audit trail to support the claim)
```

**BLOCKED responses:**

- "I didn't write this, so it isn't mine to fix" (no versioned anchor cited)
- "It was already like that" (unprovable after the context boundary)
- "A sub-agent must have left it" (handoff erased the edit log)

**Why:** After `/clear`, auto-compaction, session resume, or a sub-agent handoff, the agent has no reliable record of what it touched. A versioned anchor is the only evidence that survives the boundary; without one, "I didn't introduce this" is a guess dressed as a fact. Treating unprovable provenance as license to skip the fix is exactly how stale defects accumulate across sessions.

## MUST NOT Rules

### 1. No Acknowledge-and-Move-On

MUST NOT close out a task with a note that names a defect but leaves it unfixed. Naming a problem is not resolving it.

```markdown
# DO:

Fix the defect, then record it in the deliverable's notes as resolved.

# DO NOT:

"Known issues: the cross-reference in section 3 is dead." (left as final content)
```

**Why:** An acknowledged-but-unfixed defect reads as resolved to the next reader, who then trusts a deliverable that is silently broken. The note creates the appearance of diligence while the ratchet keeps turning.

## Cross-References

- `rules/no-stubs.md` — placeholder, stub, and incomplete-content prohibitions (the discovery-time analogue for content you author rather than inherit)
- `rules/execution-discipline.md` — draft/integrate split and cross-reference integrity at phase boundaries

Enforcement is review-layer: `/vet` Step 5 (cross-reference integrity sweep) catches inherited dead references that this rule requires fixing on discovery.
