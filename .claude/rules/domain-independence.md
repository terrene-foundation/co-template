---
paths:
  - ".claude/**"
  - "co-template/**"
  - "co-codegen/**"
---

# Domain Independence Rules

Origin: atelier 1.0.0 baseline (commit 16c4f69) — load-bearing for atelier's role as cross-domain methodology source.

## Scope

These rules apply to ALL artifacts at co/ (the root repo). Domain repos have their own domain-specific rules.

## MUST Rules

### 1. No Domain-Specific Assumptions

CC and CO artifacts must work for ANY domain: research, finance, compliance, education, governance, codegen, and future domains not yet created.

```markdown
# DO:

"The human makes the key decisions" (works for any domain)

# DO NOT:

"The human writes the code" (assumes codegen)
"The human reviews the citations" (assumes research)
```

**Why**: co/ is the methodology hub. Domain-specific language belongs in domain repos.

### 2. Template Placeholders

When creating artifacts that will flow to co-template/, use placeholder markers for domain-specific sections:

```markdown
# DO:

[Your Domain], [Domain], [key quality], [key risk]

# DO NOT:

"research", "codegen", "financial accuracy"
```

**Why**: co-template/ is configurable. Domain repos replace placeholders with their specifics.

### 3. Six-Phase Naming (CO v1.2)

CO defines a standard six-phase workflow with canonical commands. The phase **name** is the methodology concept; the canonical **command** is the slash command operators invoke.

| Phase | Phase Name | Canonical Command | Workspace Dir             | NOT (domain flavors)                     |
| ----- | ---------- | ----------------- | ------------------------- | ---------------------------------------- |
| 01    | Analyze    | `/analyze`        | `01-analyze/`             | literature-review, requirements-analysis |
| 02    | Plan       | `/plan`           | `02-plan/`                | todos, research-plan                     |
| 03    | Execute    | `/execute`        | `03-execute/`             | implement, write, build                  |
| 04    | Review     | `/vet`            | `04-vet/` → `06-deliver/` | redteam, peer-review, critique           |
| 05    | Codify     | `/codify`         | `05-codify/` + `.claude/` | learn (pre-v1.2 name), evolve            |
| 06    | Deliver    | `/deliver`        | `06-deliver/` → recipient | publish, release, deploy, submit         |

**Phase 04**: name is "Review" but canonical command is `/vet` because Claude Code reserves `/review` and the collision causes contention. Phase 04 produces finalized output, promoted from `04-vet/` to `06-deliver/` on convergence.

**Phase 05**: renamed from "Learn" to "Codify" in CO v1.2 because the verb describes what the phase actually does — modify validated patterns into canonical practice. Phase 05 has TWO output targets: `05-codify/` for the codification log and intermediate proposals (audit trail), and `.claude/` for the canonical codified artifacts. Per-proposal human approval is REQUIRED.

**Phase 06**: packages the finalized output from `06-deliver/` and hands it off to the recipient.

Domain repos rename commands for their context (loom/COC uses `/todos`, `/implement`, `/redteam`, `/codify`, `/release`+`/deploy`). Atelier uses the canonical names.

**Why**: Neutral canonical names prevent methodology lock-in to any single domain's vocabulary. Phase names are the cross-domain reference; command renames are operational flavor.
