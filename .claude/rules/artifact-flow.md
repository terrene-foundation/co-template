---
paths:
  - ".claude/**"
---

# CO Artifact Flow Rules

## Scope

These rules apply to ALL artifact creation, modification, and distribution in the CO ecosystem.

## Authority Model

```
atelier/   → CC + CO authority (methodology, Claude Code patterns)
Loom/      → COC authority (codegen: agents, SDK skills, framework specialists)
```

CC and CO artifacts originate at atelier/ and flow outward. COC artifacts originate at Loom/ BUILD repos and flow through Loom/.

## MUST Rules

### 1. atelier/ Is the Source for CC and CO

All CC (Claude Code) and CO (Cognitive Orchestration) artifacts originate from atelier/.

```
# DO:
atelier/ edits CC/CO artifacts → /sync → co-template/ → domain repos
atelier/ edits CC/CO artifacts → /sync-to-coc → Loom/ → COC templates

# DO NOT:
Loom/ edits CC/CO artifacts independently (they'd drift from atelier/)
```

**Why**: CC and CO are domain-agnostic. If Loom/ modified them independently, they'd drift from the methodology used by co-research, co-education, etc.

### 2. Loom/ Is the Source for COC

All COC-specific artifacts (codegen agents, SDK skills, testing rules, framework specialists) originate from Loom/ BUILD repos.

```
# DO:
kailash-py /codify → proposal → Loom/ → /sync → COC templates

# DO NOT:
atelier/ creates COC-specific content (SDK patterns, framework agents)
```

**Why**: COC requires SDK-specific knowledge that atelier/ doesn't have.

### 3. Template Repos Are Distribution Targets

co-template/ and kailash-coc-claude-{py,rs}/ are rebuilt by `/sync`. Never edit them directly.

**Why**: Direct edits are overwritten on next sync.

### 4. Domain Repos Create Knowledge Upstream

Domain repos (co-research, co-education) that discover methodology improvements propose them upstream to atelier/. Same pattern as BUILD repos proposing to Loom/.

**Why**: Knowledge compounds (CO Principle 7). Domain discoveries that are methodology-level should benefit all domains.

## MUST NOT Rules

### 1. No Domain Content in atelier/

atelier/ must remain domain-agnostic. No research-specific, finance-specific, or codegen-specific content.

### 2. No COC Content in atelier/

atelier/ does not manage codegen agents, SDK skills, or framework specialists. Those are Loom/'s authority. (Exception: `co-codegen/` holds the agnostic distillation of COC methodology — not the codegen artifacts themselves.)

### 3. No Direct Domain-to-Domain Sync

Domain repos never sync to each other. All shared improvements flow through atelier/ (the hub).
