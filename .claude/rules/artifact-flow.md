---
paths:
  - ".claude/**"
  - "co-template/**"
  - "co-codegen/**"
  - "co-research/**"
  - "co-education/**"
  - "co-governance/**"
---

# CO Artifact Flow Rules

Origin: atelier 1.0.0 baseline (commit 16c4f69) — establishes the CC+CO authority chain at atelier creation. Predates the rule-authoring meta-rule.

## Scope

These rules apply to ALL artifact creation, modification, and distribution in the CO ecosystem.

## Authority Model

```
co/        → CC + CO authority (methodology, Claude Code patterns)
Loom/      → COC authority (codegen: agents, SDK skills, framework specialists)
```

CC and CO artifacts originate at co/ and flow outward. COC artifacts originate at Loom/ BUILD repos and flow through Loom/.

## MUST Rules

### 1. co/ Is the Source for CC and CO

All CC (Claude Code) and CO (Cognitive Orchestration) artifacts originate from co/.

```
# DO:
co/ edits CC/CO artifacts → /sync → co-template/ → domain repos
co/ edits CC/CO artifacts → /sync-to-coc → Loom/ → COC templates

# DO NOT:
Loom/ edits CC/CO artifacts independently (they'd drift from co/)
```

**Why**: CC and CO are domain-agnostic. If Loom/ modified them independently, they'd drift from the methodology used by co-research, co-finance, etc.

### 2. Loom/ Is the Source for COC

All COC-specific artifacts (codegen agents, SDK skills, testing rules, framework specialists) originate from Loom/ BUILD repos.

```
# DO:
kailash-py /codify → proposal → Loom/ → /sync → COC templates

# DO NOT:
co/ creates COC-specific content (SDK patterns, framework agents)
```

**Why**: COC requires SDK-specific knowledge that co/ doesn't have.

### 3. Template Repos Are Distribution Targets

co-template/ and kailash-coc-claude-{py,rs}/ are rebuilt by `/sync`. Never edit them directly.

**Why**: Direct edits are overwritten on next sync.

### 4. Domain Repos Create Knowledge Upstream

Domain repos (co-research, co-finance) that discover methodology improvements propose them upstream to co/. Same pattern as BUILD repos proposing to Loom/.

**Why**: Knowledge compounds (CO Principle 7). Domain discoveries that are methodology-level should benefit all domains.

## Proposal Lifecycle

Proposals track artifact changes through a three-state lifecycle. Each direction (domain→atelier, Loom→atelier) follows the same lifecycle independently. See `guides/co-setup/09-proposal-protocol.md` for the full protocol.

```
/codify creates proposal          maintainer classifies            maintainer distributes
        │                                  │                                │
  pending_review ──────────────→ reviewed ──────────────────────→ distributed
        │                          ↑ │                                │
        │  /codify appends         │ │ /codify appends (resets       │ /codify archives
        └──────────────────────────┘ │ status to pending_review)     │ and creates fresh
                                     └───────────────────────────────┘
```

| Status           | Meaning                                      | `/codify` behavior             | Review behavior          |
| ---------------- | -------------------------------------------- | ------------------------------ | ------------------------ |
| `pending_review` | New changes, not yet classified at atelier   | **Append** new changes         | Classify and review      |
| `reviewed`       | Classified but not yet distributed           | **Append** (resets to pending) | Distribute to targets    |
| `distributed`    | Fully processed — classified AND distributed | **Archive** and create fresh   | Skip (already processed) |

### MUST: Append, Never Overwrite Unprocessed Proposals

When `/codify` creates new artifact changes and a proposal already exists with `status: pending_review` or `status: reviewed`, `/codify` MUST append new entries to the existing `changes:` array, not replace the file.

**Why:** Overwriting a `pending_review` proposal destroys unreviewed changes from earlier `/codify` sessions. This is silent data loss — the earlier session's knowledge extraction is permanently gone with no trace.

**BLOCKED:**

- "Creating fresh proposal" when status is `pending_review`
- "Replacing existing proposal" when status is `reviewed`
- ANY write to `latest.yaml` that does not preserve prior `changes:` entries

### MUST: Reset Status on Append

When appending to a `reviewed` proposal, `/codify` MUST reset the status to `pending_review`. The new entries have not been classified.

**Why:** Without the reset, the reviewer sees `reviewed` and may skip classification of the newly appended changes.

### MUST: Archive Before Fresh

When creating a fresh proposal (status was `distributed` or file was missing), `/codify` MUST archive the old file to `.claude/.proposals/archive/{codify_date}-{source_repo}.yaml` before writing the new one.

**Why:** Archived proposals are the audit trail of what knowledge was extracted and when. Without the archive, there is no history of prior codification cycles.

## MUST NOT Rules

### 1. No Domain Content in co/

co/ must remain domain-agnostic. No research-specific, finance-specific, or codegen-specific content.

### 2. No COC Content in co/

co/ does not manage codegen agents, SDK skills, or framework specialists. Those are Loom/'s authority.

### 3. No Direct Domain-to-Domain Sync

Domain repos never sync to each other. All shared improvements flow through co/ (the hub).
