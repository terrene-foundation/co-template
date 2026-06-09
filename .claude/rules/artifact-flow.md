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
atelier  → CC + CO authority (methodology, Claude Code patterns)
loom     → COC authority (codegen: agents, SDK skills, framework specialists)
```

CC and CO artifacts originate at atelier and flow outward. COC artifacts originate at loom BUILD repos and flow through loom. (Atelier was historically the `co/` repo and loom the `Loom/` repo; the canonical self-names are now atelier/loom, per CLAUDE.md.)

## MUST Rules

### 1. Atelier Is the Source for CC and CO

All CC (Claude Code) and CO (Cognitive Orchestration) artifacts originate from atelier.

```
# DO:
atelier edits CC/CO artifacts → /sync → co-template/ → domain repos
atelier edits CC/CO artifacts → /sync-to-coc → loom → COC templates

# DO NOT:
loom edits CC/CO artifacts independently (they'd drift from atelier)
```

**Why**: CC and CO are domain-agnostic. If loom modified them independently, they'd drift from the methodology used by co-research, co-finance, etc.

### 2. Loom Is the Source for COC

All COC-specific artifacts (codegen agents, SDK skills, testing rules, framework specialists) originate from loom BUILD repos.

```
# DO:
loom BUILD repo /codify → proposal → loom → /sync → COC templates

# DO NOT:
atelier creates COC-specific content (SDK patterns, framework agents)
```

**Why**: COC requires SDK-specific knowledge that atelier doesn't have.

### 3. Template Repos Are Distribution Targets

co-template/ and Loom's USE templates are rebuilt by `/sync` (or `/sync-to-coc` for the Loom-managed set). Never edit them directly.

**Why**: Direct edits are overwritten on next sync.

Loom's USE-template fleet (loom 2.21.0+) has two branches:

- **Stack-pinned variants** — pinned to a specific downstream stack; receive CC+CO from atelier and COC from loom's BUILD repos. Loom owns the stack-specific naming and the BUILD-repo topology (atelier knows only its immediate neighbor, loom).
- **Base variants** — `coc-claude-base` (CC-only) and `coc-base` (multi-CLI: claude+codex+gemini), under `terrene-foundation/` org. Language-agnostic for arbitrary stacks (Go, TypeScript, Rust, Java, polyglot, etc.); receive CC+CO from atelier and onboarding artifacts (`STACK.md` schema, generic specialists) from loom. **No BUILD source** (`build:null` in loom's sync-manifest); /codify proposals from base-variant consumers route to loom directly, not through atelier.

Atelier ships CC+CO once via `/sync-to-coc`; loom adapts and emits to both branches.

### 4. Domain Repos Create Knowledge Upstream

Domain repos (co-research, co-finance) that discover methodology improvements propose them upstream to atelier. Same pattern as loom BUILD repos proposing to loom.

**Why**: Knowledge compounds (CO Principle 7). Domain discoveries that are methodology-level should benefit all domains.

## Proposal Lifecycle

Proposals track artifact changes through a three-state lifecycle. Each direction (domain→atelier, loom→atelier) follows the same lifecycle independently. See `guides/co-setup/09-proposal-protocol.md` for the full protocol.

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

```
# DO:
status == pending_review → append the new change to changes:[...], preserving prior entries

# DO NOT:
status == pending_review → overwrite latest.yaml, dropping the prior entry (silent data loss)
```

**Why:** Overwriting a `pending_review` proposal destroys unreviewed changes from earlier `/codify` sessions. This is silent data loss — the earlier session's knowledge extraction is permanently gone with no trace.

**BLOCKED:**

- "Creating fresh proposal" when status is `pending_review`
- "Replacing existing proposal" when status is `reviewed`
- ANY write to `latest.yaml` that does not preserve prior `changes:` entries

### MUST: Reset Status on Append

When appending to a `reviewed` proposal, `/codify` MUST reset the status to `pending_review`. The new entries have not been classified.

```
# DO:
appended to a reviewed proposal → set status: pending_review

# DO NOT:
append and leave status: reviewed (the reviewer skips the new entries)
```

**Why:** Without the reset, the reviewer sees `reviewed` and may skip classification of the newly appended changes.

### MUST: Archive Before Fresh

When creating a fresh proposal (status was `distributed` or file was missing), `/codify` MUST archive the old file to `.claude/.proposals/archive/{codify_date}-{source_repo}.yaml` before writing the new one.

```
# DO:
status == distributed → mv the old file to .proposals/archive/{date}-{repo}.yaml, then write fresh

# DO NOT:
overwrite the distributed proposal in place (no audit trail of the prior cycle)
```

**Why:** Archived proposals are the audit trail of what knowledge was extracted and when. Without the archive, there is no history of prior codification cycles.

## MUST NOT Rules

### 1. No Domain Content in Atelier

Atelier must remain domain-agnostic. No research-specific, finance-specific, or codegen-specific content.

```
# DO:
atelier rule — "the human makes the key decisions" (works for any domain)

# DO NOT:
atelier rule — "the human reviews the generated code" (assumes codegen)
```

**Why**: Domain-specific content in the hub couples the methodology to one domain and propagates that coupling to every other domain on next sync — the failure `rules/domain-independence.md` exists to prevent.

### 2. No COC Content in Atelier

Atelier does not manage codegen agents, SDK skills, or framework specialists. Those are loom's authority.

```
# DO:
SDK/framework specialist agents live in loom BUILD repos.

# DO NOT:
atelier ships a framework-specific codegen specialist (belongs at loom)
```

**Why**: COC requires SDK-specific knowledge atelier does not hold; an SDK artifact in atelier is dead weight that every non-codegen domain inherits and never uses.

### 3. No Direct Domain-to-Domain Sync

Domain repos never sync to each other. All shared improvements flow through atelier (the hub).

```
# DO:
co-research discovers a methodology improvement → proposes upstream to atelier → atelier re-distributes.

# DO NOT:
co-research → /sync → co-finance (bypasses the hub; the two repos drift)
```

**Why**: A direct domain-to-domain sync bypasses the hub's classification and re-distribution, so a domain-specific assumption rides into a sibling domain unvetted and the two repos drift out of methodology alignment.
