# The Enforcement Ladder — From Probabilistic to Deterministic

How to systematically promote a quality property from documentation (lowest enforcement) to impossible-to-violate design (highest enforcement). Every quality property starts somewhere on this ladder and should be pushed upward over time.

**Origin**: loom journal/0052-DISCOVERY-session-productivity-patterns.md, generalized for cross-domain methodology application.

## The Ladder

```
Rung 6: IMPOSSIBLE DESIGN         ← Can't express the wrong thing
Rung 5: AUTOMATED GATE            ← Tooling rejects it before it lands
Rung 4: COMMAND GATE              ← Phase command refuses to proceed
Rung 3: AUDIT SCRIPT              ← Caught by periodic audit
Rung 2: RULE (Loud/Linguistic)    ← Agent follows; probabilistic but tested
Rung 1: DOCUMENTATION             ← Ignored under pressure
Rung 0: ORAL TRADITION            ← Not written down at all
```

Each rung is strictly stronger than the one below it. A quality property enforced at Rung 4 is strictly safer than one at Rung 2, because Rung 4 fires even when the rule isn't loaded.

But Rung 2 (rules) is NOT disposable once Rung 4+ exists. The rule carries the WHY — the institutional memory of what failure mode the mechanism prevents. Remove the rule and the mechanism gets "refactored away" by someone who doesn't know why it's there.

## Case Studies: Climbing the Ladder

### Case 1: Placeholder Content in Canonical Artifacts

**Problem**: `[TODO]` markers and empty sections propagate from workspace drafts into `.claude/` canonical artifacts, then sync to every downstream repo.

| Rung | What exists                                                                                                           | Status                        |
| ---- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 0    | Nothing — placeholders slip through on every codify                                                                   | Before no-stubs rule          |
| 1    | CLAUDE.md mentions "no placeholders"                                                                                  | Weak — ignored under pressure |
| 2    | `rules/no-stubs.md` with MUST clauses, DO/DON'T examples, and specific markers blocked ([TODO], [TBD], [INSERT HERE]) | Current                       |
| 3    | `/cc-audit` script greps for placeholder markers across all artifacts                                                 | Current                       |
| 4    | `/vet` command refuses to converge if any artifact in the promotion set contains a placeholder marker                 | Current                       |
| 5    | `/codify` command rejects promotion of any file containing blocked markers                                            | Current                       |

**Climb history**: 0 → 1 → 2 (rule written) → 3 (/cc-audit detects) → 4+5 (/vet and /codify enforce). The rule at Rung 2 remains as institutional memory of WHY placeholders are dangerous (they cause Claude to interpret incomplete instructions probabilistically).

### Case 2: Review Gates Skipped Under Pressure

**Problem**: Gate reviews phrased as "recommended" were skipped 6/6 times in observed sessions.

| Rung | What exists                                                                                            | Status              |
| ---- | ------------------------------------------------------------------------------------------------------ | ------------------- |
| 1    | Gate table says "recommended"                                                                          | Before 0052 finding |
| 2    | `rules/execution-discipline.md` upgrades specific gates to MUST, with BLOCKED phrases for skip-excuses | Current             |
| 3    | Not yet — no audit script checks review execution history                                              | Not yet built       |
| 4    | Phase commands auto-spawn reviewer as background agent; commit gate checks result                      | Not yet built       |

**Climb plan**: 1 → 2 (upgrade to MUST) → 3 (audit script) → 4 (auto-spawn + gate). The rule at Rung 2 is the key current protection. The jump to Rung 4 (auto-spawn) would make reviews unavoidable.

### Case 3: `globs:` Silent Failure in Rule Frontmatter

**Problem**: Using `globs:` instead of `paths:` as the YAML frontmatter key causes CC to silently ignore the scoping and load the rule globally. Discovered across 8 files in the atelier ecosystem.

| Rung | What exists                                                                                             | Status                     |
| ---- | ------------------------------------------------------------------------------------------------------- | -------------------------- |
| 0    | Nothing — `globs:` silently treated as unrecognized frontmatter                                         | Before 0007/0008 discovery |
| 1    | Journal entries 0007 (DISCOVERY) and 0008 (DECISION) document the loading model                         | Current                    |
| 2    | `rules/cc-artifacts.md` MUST §7: "Domain-specific rules MUST use `paths:` (not `globs:`)" with DO/DON'T | Current                    |
| 3    | `/cc-audit` flags any top-level frontmatter key in opening blocks that is not in the `paths:` allowlist | Current                    |
| 4    | Hook validates frontmatter keys on rule file save                                                       | Not yet built              |

**Climb history**: 0 → 1 (discovery documented) → 2 (rule written with explicit `globs:` prohibition) → 3 (audit detection proposed). The silent nature of the failure makes Rung 3+ critical — without auditing, the same mistake recurs.

### Case 4: Dangling Cross-References

**Problem**: Rules, guides, and agents reference files that don't exist. Claude fabricates plausible interpretations, corrupting downstream behavior.

| Rung | What exists                                                                            | Status                            |
| ---- | -------------------------------------------------------------------------------------- | --------------------------------- |
| 0    | Nothing — dangling refs accumulate silently                                            | Before cc-enforcement MUST NOT §3 |
| 2    | `rules/cc-enforcement.md` MUST NOT §3: "No dangling cross-references after extraction" | Current                           |
| 2    | `rules/no-stubs.md` MUST NOT §1: "No dangling cross-references"                        | Current                           |
| 3    | `/vet` Step 5 cross-reference integrity sweep (grep every internal reference)          | Current                           |
| 4    | `/vet` refuses to converge if any cross-reference fails to resolve                     | Current                           |

**Climb history**: 0 → 2 (rules written) → 3+4 (/vet enforces). The double-rule coverage (cc-artifacts + no-stubs) reflects the severity — dangling refs are one of the most damaging silent failures.

### Case 5: Domain-Specific Content in Methodology Artifacts

**Problem**: Codegen-specific examples, SDK names, or infrastructure references leak into domain-agnostic CC/CO artifacts, contaminating every downstream domain on next sync.

| Rung | What exists                                                            | Status  |
| ---- | ---------------------------------------------------------------------- | ------- |
| 1    | CLAUDE.md Directive 1: "Domain Independence"                           | Current |
| 2    | `rules/domain-independence.md` with MUST clauses and DO/DON'T examples | Current |
| 2    | `rules/independence.md` no commercial coupling                         | Current |
| 3    | `/cc-audit` checks for domain-specific language in canonical artifacts | Partial |
| 4    | `/vet` Step 4 deploys gold-standards-validator for every draft         | Current |

**Climb plan**: Current coverage is 1+2+3+4, but Rung 3 is incomplete (/cc-audit doesn't yet grep for all domain-specific terms). The current `/sync loom` inbound review process (this process) is an additional Rung 4 gate.

## How to Decide Which Rung to Target

Not every quality property needs Rung 6. The decision depends on:

| Factor                  | Push higher                                                | Stay lower                                |
| ----------------------- | ---------------------------------------------------------- | ----------------------------------------- |
| **Failure cost**        | Data loss, silent corruption, ecosystem-wide contamination | Cosmetic, recoverable, single-repo        |
| **Failure frequency**   | Fires in 50%+ of sessions                                  | Rare edge case                            |
| **Enforcement cost**    | Cheap (add a grep, add a gate check)                       | Expensive (redesign command architecture) |
| **False positive risk** | Low (the check is precise)                                 | High (would block valid work)             |

**Rule of thumb**: If the same rule fires in 3+ sessions on the same pattern, it's time to promote the pattern to a deterministic mechanism (Rung 4+). The rule has proven its value; now make it automatic.

## The Rule ↔ Mechanism Lifecycle

```
1. DISCOVERY: Session hits a failure; journal entry created
   ↓
2. RULE: Rule authored with MUST + BLOCKED + DO/DON'T + Why (Rung 2)
   Rule fires in sessions; agent behavior improves
   ↓
3. PATTERN RECOGNITION: Same rule fires 3+ times on same pattern
   ↓
4. MECHANISM: Audit script, command gate, or hook enforces it (Rung 3-6)
   ↓
5. BACKSTOP: Rule stays as institutional memory of WHY
   Mechanism handles enforcement; rule explains the failure mode
   If mechanism is ever removed, rule catches the regression
```

**The rule is never deleted.** It transitions from "primary enforcement" to "backstop + institutional memory." This is why rules carry `Why:` lines — the Why is the only artifact that survives if the mechanism is removed.

## Inventory: Current Rung for Key Methodology Properties

| Property                                   | Current rung              | Target rung             | Gap                 |
| ------------------------------------------ | ------------------------- | ----------------------- | ------------------- |
| Placeholder content in canonical artifacts | 4-5 (/vet + /codify gate) | 5 (sufficient)          | —                   |
| Dangling cross-references                  | 3-4 (/vet sweep + gate)   | 4 (sufficient)          | —                   |
| Gate-level review enforcement              | 2 (MUST rule)             | 4 (auto-spawn + gate)   | Needs hook          |
| globs: silent failure                      | 2 (rule)                  | 3 (/cc-audit grep)      | Audit script needed |
| Domain contamination in methodology        | 2+4 (rule + /vet)         | 3 (comprehensive audit) | /cc-audit expansion |
| Rule quality (L/L/L compliance)            | 2 (meta-rule)             | 3 (/cc-audit checks)    | Audit script needed |
| Path-scoping on domain rules               | 2 (meta-rule §5)          | 3 (/cc-audit checks)    | Already proposed    |
| Terrene naming compliance                  | 2+4 (rule + /vet)         | 4 (sufficient)          | —                   |

## Cross-References

- `01-rule-authoring-principles.md` — how to author rules at Rung 2
- `02-session-architecture.md` — the 4-layer loading model that makes rules scale
- `rules/rule-authoring.md` — the meta-rule for Rung 2 authoring
- `rules/cc-artifacts.md` — artifact quality rules (multiple rungs)
- `rules/no-stubs.md` — zero-tolerance for placeholders
- `rules/execution-discipline.md` — gate-level review enforcement
