# Parallel-Merge Workflow

Procedural depth for SKILL.md Pattern 5. When multiple parallel agents each modify the SAME artifact in isolation and each passes its own checks alone, their changes MUST be merged deterministically — never by sequential rebasing, cherry-picking, or a hand-rolled three-way merge. This file carries the merge protocol, the stale-base and numeric-invariant gates, and the anti-pattern corpus the orchestrator needs available when it is about to integrate a same-file fan-out.

It is domain-agnostic: the "artifact" is a shared rule file, a consolidated spec, a combined report section, a control matrix, or a lesson manifest — anything ≥3 agents touched concurrently. The protocol is structural; domain content conflicts still need a domain specialist.

## When to Use

- ≥3 agents each apply ONE independent change to the same central artifact (e.g. a shared index, a combined matrix, a single consolidated document).
- Each agent's isolated copy passes its own checks alone.
- The integration target has moved since the agents branched (an unrelated fix landed mid-session), so a naive overwrite would silently revert it.

If only one agent touched the artifact, there is nothing to merge — apply its change directly. The protocol earns its cost only at fan-in of two or more concurrent same-file changes.

## The Merge Protocol

### 1. Identify unique variants

Each isolated copy carries ONE feature. Filter the copies by a per-feature marker (a unique symbol, header, field, or clause the feature introduced) so that one copy maps to exactly one feature. This disentangles which copy owns which change before any diff is taken.

### 2. Generate per-feature diffs vs. the committed base

For each feature, diff its copy against the COMMITTED base of the shared artifact — not against another agent's copy. Each diff then isolates exactly one feature's additions, with no entanglement from a sibling's concurrent edit. Read the base from committed state on disk, never from a sibling copy mid-edit.

### 3. Delegate the merge to a specialist with explicit injection-point documentation

Do NOT apply the diffs mechanically — line offsets drift the moment the first feature lands, and a positional patch silently corrupts every later one. Instead hand the specialist, for each feature, an explicit injection-point map:

- which imports / references / preamble entries to add,
- which parameters or fields to introduce (and their ordering),
- which new sections or methods to add,
- which EXISTING sections to modify, and exactly where.

The specialist reads the current integration target and applies each change section by section, re-reading after each application so it works against live line positions, not stale ones.

### 4. Handle interaction points explicitly

When two features touch the SAME section, the order is load-bearing and MUST be documented. Example (domain-neutral): two features both amend a shared "approval" routine — Feature A inserts a validation step BEFORE the decision is recorded; Feature B appends an audit note AFTER it. Both must be present, in that order. Leaving the order implicit lets the specialist pick one arbitrarily and silently drop the other's effect.

### 5. Verify with checks — specialist's own, THEN the full suite

Run the merged artifact through the specialist feature's own checks first (does this one change still work?), THEN the project-wide check suite. Interaction points are rarely tested in isolation, so the full suite is what catches a regression that only appears when two features coexist. An "each passed alone" claim is necessary but NOT sufficient — always re-run the whole suite after the merge.

### 6. Stale-base detection (pre-merge gate)

Before merging a copy, compare it against the integration target on the shared artifact. If the two differ by a LARGE margin on the same artifact (one side is far larger or far smaller than the other on the dimension the change governs — line count, entry count, section count), STOP and require human disambiguation.

The failure this gate catches: a copy branched from a PRE-consolidation base merges into a POST-consolidation target and silently re-inlines the content the consolidation just extracted. The large size delta is the visible signal of that stale base; without the gate, the regression lands looking like a normal merge.

### 7. Numeric invariants (same-change rule)

Any change that shrinks, extracts, or consolidates an artifact MUST land a programmatic size-invariant check in the SAME change — an assertion that the artifact stays under a budget set to roughly 120% of its post-change size. The check MUST live in the default verification path so it runs on every pass, not in an optional one a reviewer must remember to invoke.

The failure this prevents: a consolidation that was planned-but-never-checked leaves no tripwire, so a later merge re-inflates the artifact and the regression is invisible until someone manually counts.

### 8. Post-merge invariant re-check

Re-run the numeric invariants after EACH merge, not once at the end. A violation is a STOP signal — do not proceed to the next merge until it is resolved. Without per-merge checks, a regression introduced by merge 2 compounds silently through merges 3–5 and surfaces only at the end, when the cause is hardest to localize.

## Anti-Patterns

- **Sequential rebasing** — each rebase fights the previous merge's line shifts; offsets compound.
- **Cherry-picking across copies** — loses the per-feature check verification that step 5 depends on.
- **Manual three-way merge** — error-prone past ~5 concurrent features; the interaction matrix outgrows attention.
- **Trusting the "individually passing" claim** — interaction points are rarely tested alone; always re-run the full suite after merge (step 5).
- **Merging without a stale-base check** — a copy on a pre-consolidation base silently reverses the consolidation on merge (step 6).
- **Landing a consolidation without a numeric invariant** — the regression is invisible until someone manually counts (steps 7–8).

## Cross-References

- `SKILL.md` Pattern 5 — the orchestration-decision framing this file is the depth behind.
- `rules/delegation-orchestration.md` MUST §4 — the merge specialist needs a modify-and-verify tool inventory (edit + command tools); a read-only agent halts at the first write boundary.
- `rules/subagent-delegation-verification.md` MUST §1 — verify the merged artifact exists and is non-empty on disk after the specialist exits, before declaring the merge landed.
- `closure-parity-specialist-discipline.md` — the same tool-inventory discipline applied to verification rounds rather than merge rounds.
