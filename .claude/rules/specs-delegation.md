---
paths:
  - "**/specs/**"
  - "**/specs/_index.md"
  - "**/workspaces/**"
  - "**/briefs/**"
  - "**/02-plan/**"
  - "**/todos/**"
---

# Specs Delegation Rules

These rules govern how `specs/` (the single source of domain truth — see `rules/specs-authority.md`) flows into DELEGATION and orchestration: shipping spec content into a specialist's prompt, re-deriving sibling specs when one changes, and reconciling a stale todo against current spec state before launch. They are the delegation-coupled half of the specs ruleset; `rules/specs-authority.md` carries the spec lifecycle (what specs are, when they update, how they split).

Origin: split out of `rules/specs-authority.md` (287 lines, over the 200-line cap) so each half stays under cap — the three delegation-coupled clauses (formerly specs-authority MUST §7, §10, §11) are cohesive together and reference `rules/delegation-orchestration.md`; renumbered §1–§3 here. Provenance for each clause is preserved on its own line below.

## Scope

These rules apply whenever an orchestrator delegates planned work to a specialist or edits a spec that siblings or todos depend on — during `/execute`, `/vet`, and any phase that dispatches specialists or amends spec truth. They sit beside `rules/delegation-orchestration.md` (how work is decomposed and delegated) and `rules/specs-authority.md` (the spec lifecycle the delegation consumes).

## MUST Rules

### 1. Agent Delegation Includes Relevant Spec Files

When delegating to a specialist, the orchestrator MUST read `_index.md`, select relevant spec files, and include their content in the delegation prompt. For specs over 200 lines, include only the relevant section with a note pointing to the full file.

```
# DO — include spec content in delegation prompt
Agent(prompt: "Build user schema.\n\nFrom specs/data-model.md:\n[content]\n\nFrom specs/tenant-isolation.md:\n[content]")

# DO NOT — delegate without specs context
Agent(prompt: "Build user schema.")
```

**Why:** Specialists without spec context produce intent-misaligned output — e.g., schemas without constraints because requirements weren't communicated (FM-4).

### 2. Every Spec Edit Triggers a Sibling Re-Derivation Sweep

When an edit changes a contract, field shape, term, or assertion in one spec, the editor MUST `grep` ALL sibling specs in the domain set (every file listed in `_index.md`) for references to the changed element and re-derive each dependent assertion in the same action. Reviewing only the edited file and shipping an APPROVE verdict while a sibling still cites the old truth is BLOCKED.

```markdown
# DO — edit one spec, sweep every sibling that cites the changed element

Edit: `specs/eligibility.md` renames the criterion field `tenure_months` → `tenure_years`.
Sweep: grep `_index.md` siblings for `tenure_months` →

- `specs/scoring.md` cites it in the weighting formula → re-derive to `tenure_years`
- `specs/appeals.md` references the old threshold → re-derive
  Both updated in the SAME action as the eligibility edit.

# DO NOT — narrow-scope edit, silent cross-spec drift survives

Edit: rename `tenure_months` → `tenure_years` in `specs/eligibility.md` only.
Review reads `eligibility.md`, finds it internally consistent → APPROVE.
(`scoring.md` and `appeals.md` still say `tenure_months`; downstream consumers
of those siblings now compute against a field that no longer exists.)
```

**BLOCKED responses:**

- "The edited spec is internally consistent, so review passes"
- "The sibling specs are out of scope for this change"
- "Cross-spec references will be reconciled in a later pass"
- "Only the file I touched needs re-derivation"

**Why:** Field-shape divergence, downstream-consumer drift, and terminology drift are invisible to a review scoped to the edited file alone — the sibling that still cites the old truth reads as correct in isolation and is the one downstream consumers build against. The sweep is mechanical (`_index.md` enumerates the full domain set; the changed element is a literal `grep` target), so the cost of closing the drift class is one search per edit, not a re-read of every spec.

### 3. The Orchestrator Amends Stale Todo Text at Launch

Before delegating a planned todo, the orchestrator MUST re-read the spec the todo targets and, if the spec or project state moved since `/plan` wrote the todo, amend the todo text to the current truth at launch — not hand the delegated agent wording that predates the move. Launching a delegation against a todo the orchestrator knows is stale is BLOCKED.

```markdown
# DO — reconcile the todo against current spec state at launch

/plan wrote: "Draft the reviewer-assignment section per `specs/peer-review.md` §3
(single blind, one reviewer)."
At launch the orchestrator re-reads §3 → it now says double-blind, two reviewers.
Orchestrator amends the todo to "double-blind, two reviewers" BEFORE delegating,
and delegates against the amended text.

# DO NOT — delegate the pre-move wording and let the agent hit the conflict

Orchestrator delegates the original todo verbatim. The agent reads
`specs/peer-review.md` §3, finds it contradicts the todo, stalls mid-execution
to ask which is authoritative — or worse, drafts against the stale todo.
```

**BLOCKED responses:**

- "The agent can reconcile the todo against the spec itself"
- "The todo was approved at /plan, so its wording is fixed"
- "Re-checking every todo at launch is overhead"
- "The agent will flag the conflict if it matters"

**Why:** A delegated agent that discovers a todo-vs-spec conflict mid-execution either stalls for a clarification round-trip or silently drafts against the stale wording — both cost more than the orchestrator's one-time re-read at launch, when the spec is the established authority (`rules/specs-authority.md` MUST §5 keeps it current) and the todo is the artifact that lagged. This is the launch-time reconciliation step that MUST §1 above and `rules/specs-authority.md` MUST §5 do not cover: §5 keeps the spec current and MUST §1 ships spec content into the delegation prompt, but neither updates the todo's own instruction text, which the agent reads as its primary directive.

Origin: MUST §1 from the original specs-authority FM-4 analysis (loom specs-authority system, agent delegation context loss). MUST §2 and §3 from workspace `cc-audit-lint-generalize` 2026-05-03; journal/0011-GAP (test fixtures and spec canonicalization deferred to /codify); /vet adversarial round L1.

## Cross-References

- `rules/specs-authority.md` — the spec lifecycle these delegation clauses consume (every project has `specs/_index.md`, specs are domain-organized + detailed, phases read specs before acting, specs update at first instance, deviations need acknowledgment, large files split). The delegation clauses moved here from that file (formerly its MUST §7, §10, §11).
- `rules/delegation-orchestration.md` — how work is decomposed and delegated across subagents; MUST §1 here is the spec-content half of building a delegation prompt.
