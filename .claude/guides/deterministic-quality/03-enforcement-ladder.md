# The Enforcement Ladder — From Probabilistic to Deterministic

How to systematically promote a quality property from documentation (lowest enforcement) to impossible-to-violate design (highest enforcement). Every quality property starts somewhere on this ladder and should be pushed upward over time.

**Origin**: loom journal/0052-DISCOVERY-session-productivity-patterns.md, generalized for cross-domain methodology application.

## The Ladder

```
Rung 6: IMPOSSIBLE DESIGN         <- Can't express the wrong thing
Rung 5: AUTOMATED GATE            <- Tooling rejects it before it lands
Rung 4: COMMAND GATE              <- Phase command refuses to proceed
Rung 3: AUDIT SCRIPT              <- Caught by periodic audit
Rung 2: RULE (Loud/Linguistic)    <- Agent follows; probabilistic but tested
Rung 1: DOCUMENTATION             <- Ignored under pressure
Rung 0: ORAL TRADITION            <- Not written down at all
```

Each rung is strictly stronger than the one below it. A quality property enforced at Rung 4 is strictly safer than one at Rung 2, because Rung 4 fires even when the rule isn't loaded.

But Rung 2 (rules) is NOT disposable once Rung 4+ exists. The rule carries the WHY — the institutional memory of what failure mode the mechanism prevents. Remove the rule and the mechanism gets "refactored away" by someone who doesn't know why it's there.

## Case Studies: Climbing the Ladder

### Case 1: Placeholder Content in Canonical Artifacts

**Problem**: `[TODO]` markers and empty sections propagate from workspace drafts into `.claude/` canonical artifacts, then persist in future sessions.

| Rung | What exists | Status |
| --- | --- | --- |
| 0 | Nothing — placeholders slip through | Before no-stubs rule |
| 1 | CLAUDE.md mentions "no placeholders" | Weak — ignored under pressure |
| 2 | `rules/no-stubs.md` with MUST clauses, DO/DON'T examples, and specific markers blocked | Current |
| 3 | `/cc-audit` script greps for placeholder markers across all artifacts | Available |
| 4 | `/vet` command refuses to converge if any artifact contains a placeholder marker | Available |

**Climb history**: 0 → 1 → 2 (rule written) → 3 (/cc-audit detects) → 4 (/vet enforces). The rule at Rung 2 remains as institutional memory of WHY placeholders are dangerous.

### Case 2: Review Gates Skipped Under Pressure

**Problem**: Gate reviews phrased as "recommended" were skipped 6/6 times in observed sessions.

| Rung | What exists | Status |
| --- | --- | --- |
| 1 | Gate table says "recommended" | Before finding |
| 2 | `rules/execution-discipline.md` upgrades specific gates to MUST, with BLOCKED phrases | Current |
| 3 | Not yet — no audit script checks review execution history | Not yet built |
| 4 | Phase commands auto-spawn reviewer as background agent; commit gate checks result | Not yet built |

**Climb plan**: 1 → 2 (upgrade to MUST) → 3 (audit script) → 4 (auto-spawn + gate).

### Case 3: Dangling Cross-References

**Problem**: Rules, guides, and agents reference files that don't exist. Claude fabricates plausible interpretations, corrupting downstream behavior.

| Rung | What exists | Status |
| --- | --- | --- |
| 0 | Nothing — dangling refs accumulate silently | Before rules |
| 2 | `rules/cc-artifacts.md` MUST NOT §6 and `rules/no-stubs.md` MUST NOT §1 | Current |
| 3 | `/vet` Step 5 cross-reference integrity sweep (grep every internal reference) | Available |
| 4 | `/vet` refuses to converge if any cross-reference fails to resolve | Available |

### Case 4: Rule Quality Regression

**Problem**: New rules authored without MUST modals, BLOCKED phrases, examples, or rationale. They get ignored under pressure and give the entire rule system a reputation for being noise.

| Rung | What exists | Status |
| --- | --- | --- |
| 0 | Nothing — rules written ad hoc | Before meta-rule |
| 2 | `rules/rule-authoring.md` defines the Loud/Linguistic/Layered test | Current |
| 2 | `rules/cc-artifacts.md` Clause 10 mandates the meta-rule | Current |
| 3 | `/cc-audit` checks L/L/L compliance of all rule files | Proposed |

## How to Decide Which Rung to Target

| Factor | Push higher | Stay lower |
| --- | --- | --- |
| **Failure cost** | Data loss, silent corruption, ecosystem contamination | Cosmetic, recoverable, single-session |
| **Failure frequency** | Fires in 50%+ of sessions | Rare edge case |
| **Enforcement cost** | Cheap (add a grep, add a gate check) | Expensive (redesign architecture) |
| **False positive risk** | Low (the check is precise) | High (would block valid work) |

**Rule of thumb**: If the same rule fires in 3+ sessions on the same pattern, it's time to promote the pattern to a deterministic mechanism (Rung 4+).

## The Rule <-> Mechanism Lifecycle

```
1. DISCOVERY: Session hits a failure; journal entry created
   |
2. RULE: Rule authored with MUST + BLOCKED + DO/DON'T + Why (Rung 2)
   Rule fires in sessions; agent behavior improves
   |
3. PATTERN RECOGNITION: Same rule fires 3+ times on same pattern
   |
4. MECHANISM: Audit script, command gate, or hook enforces it (Rung 3-6)
   |
5. BACKSTOP: Rule stays as institutional memory of WHY
   Mechanism handles enforcement; rule explains the failure mode
```

**The rule is never deleted.** It transitions from "primary enforcement" to "backstop + institutional memory."

## Cross-References

- `01-rule-authoring-principles.md` — how to author rules at Rung 2
- `02-session-architecture.md` — the 4-layer loading model that makes rules scale
- `rules/rule-authoring.md` — the meta-rule for Rung 2 authoring
- `rules/cc-artifacts.md` — artifact quality rules
- `rules/no-stubs.md` — zero-tolerance for placeholders
- `rules/execution-discipline.md` — gate-level review enforcement
