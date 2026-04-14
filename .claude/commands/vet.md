---
name: vet
description: "Phase 04. Spec coverage + adversarial critique. Produces finalized output. Never says 'this is fine.'"
argument-hint: "[what to vet]"
---

# /vet $ARGUMENTS

Vet **$ARGUMENTS** with a critical eye. Find every weakness, gap, error, and improvement opportunity. Phase name is "Review" (per CO v1.2 spec); canonical command is `/vet` to avoid Claude Code `/review` collision.

## Workspace Resolution

1. If `$ARGUMENTS` specifies a project name, use `workspaces/$ARGUMENTS/`
2. Otherwise, use the most recently modified directory (excluding `_template/`)
3. Read the project brief, plan, and all work products

## Protocol

### 1. Spec coverage audit (MUST run first)

Walk `brief.md` → `specs/_index.md` → relevant spec files → `02-plan/` → `03-execute/` and verify that EVERY specified item was actually built — not just exists. **Specs are the PRIMARY source** — they contain the detailed domain truth that the brief only summarizes.

For each spec file, extract assertions at **field level** (not just section level) and verify against the actual artifacts. Artifact diverging from spec without logged deviation = HIGH. **Cross-spec consistency**: grep all specs for shared terms; contradictory values = HIGH. **Brief-to-spec coverage**: for each brief requirement, verify it maps to ≥1 spec section; unmapped = HIGH.

Produce `04-vet/.spec-coverage`:

| Brief Item | Spec File | Plan Task | Draft Artifact | Status | Evidence |
|---|---|---|---|---|---|
| brief §X | specs/foo.md §Y | plan task N | 03-execute/artifact.md | met / partial / missing / substituted | how it fulfills (or doesn't) |

**Existence is NOT fulfillment.** A file existing does not count.

### 2. Apply domain quality standards from the rules

### 3. Find issues at three severity levels

- **Critical** — must fix before the output can be used
- **Major** — should fix to meet quality standards
- **Minor** — worth fixing when time permits

### 4. Never say "this is fine"

Always find at least one improvement. If quality is genuinely high, identify where it could be extended, generalized, or made more robust.

### 5. Iterate

After the human addresses findings, vet again until satisfied. Convergence = 0 critical, 0 major, 2 consecutive clean rounds.

### 6. Promote finalized output

Once vet passes, save the finalized output to `06-deliver/`.

## Output

Save vet findings to `04-vet/vet-[topic-slug].md`:

```markdown
# Vet: $ARGUMENTS

Date: [today]

## Spec Coverage
[Summary of .spec-coverage — % met, gaps]

## Critical Issues (must fix)
[Issues that would cause the output to fail its purpose]

## Major Issues (should fix)
[Issues that weaken the output significantly]

## Minor Issues (worth fixing)
[Issues that could be improved]

## Strengths
[What works well - be specific]

## Recommendations
[Prioritized list of what to fix first]
```

## Journal Entry

Record vet findings in `journal/`. Type: RISK, GAP, CONNECTION.

## Next Steps

After vet produces finalized output, recommend:

- `/codify` — extract knowledge and upgrade CO artifacts
- `/deliver` — package and hand off the output
