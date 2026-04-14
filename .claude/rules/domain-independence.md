---
paths:
  - ".claude/**"
---

# Domain Independence Rules

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

CO uses domain-neutral phase names AND canonical command names:

| Phase | Phase Name | Canonical Command | NOT (domain flavors)                     |
| ----- | ---------- | ----------------- | ---------------------------------------- |
| 01    | Analyze    | `/analyze`        | literature-review, requirements-analysis |
| 02    | Plan       | `/plan`           | todos, research-plan                     |
| 03    | Execute    | `/execute`        | implement, write, build                  |
| 04    | Review     | `/vet`            | redteam, peer-review, critique           |
| 05    | Codify     | `/codify`         | learn (pre-v1.2 name), evolve            |
| 06    | Deliver    | `/deliver`        | publish, release, deploy, submit         |

Phase 04: canonical command is `/vet` because Claude Code reserves `/review`. Phase 05: renamed from "Learn" to "Codify" in v1.2 — the verb describes what the phase does (modify validated patterns into canonical practice). Phase 06: packages and ships.

Domain repos rename commands for their context (COC uses `/todos`, `/implement`, `/redteam`, `/codify`, `/release`+`/deploy`). co-template uses the canonical names.

**Why**: Neutral canonical names prevent methodology lock-in to any single domain's vocabulary.
