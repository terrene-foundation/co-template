---
paths:
  - "workspaces/**/journal/**"
  - "workspaces/**"
---

# Journal Rules

Origin: atelier 1.0.0 baseline (commit 16c4f69) — codifies the journal as the cross-session knowledge trail underpinning CO Principle 7 (knowledge compounds).

## Scope

These rules apply to ALL workspace operations. The journal is the primary knowledge trail for every project.

## MUST Rules

### 1. Journal Every Insight

Every CO command that produces insights, decisions, or discoveries MUST create corresponding journal entries in the workspace's `journal/` directory. No insight should be lost between sessions.

**Why:** The journal is the only durable trail between sessions; an insight not journalled is rediscovered (or contradicted) by the next session. CO Principle 7 (knowledge compounds) breaks the moment session-local insights stay session-local.

### 2. Sequential Naming

Journal entries MUST use sequential naming: `NNNN-TYPE-topic.md` (e.g., `0001-DECISION-chose-event-driven.md`, `0002-DISCOVERY-connection-pool-bottleneck.md`). Before creating a new entry, MUST check the highest existing number in the journal directory.

**Why:** Sequential numbers preserve creation order under filesystem sorts and prevent collisions when multiple agents write entries in the same turn. Without the order signal, tracing a decision chain back to its origin requires reading every entry.

### 3. Frontmatter Required

Journal entries MUST include YAML frontmatter with these fields:

```yaml
---
type: DECISION | DISCOVERY | TRADE-OFF | RISK | CONNECTION | GAP
date: YYYY-MM-DD
created_at: [ISO-8601 timestamp]
author: human | agent | co-authored
session_id: [session ID if available]
session_turn: [conversation turn number]
project: [project name]
topic: [brief description]
phase: analyze | plan | execute | vet | codify | deliver
tags: [list of relevant tags]
---
```

- `created_at`: precise creation timestamp for temporal analysis
- `author`: who drove the insight, determined by decision tree:
  - `human` — user stated the conclusion before the AI elaborated. Test: would this insight exist without the AI?
  - `agent` — AI surfaced this unprompted. Test: did the user know this before the AI said it?
  - `co-authored` — insight evolved through exchange; neither party alone reached it. When uncertain, prefer `co-authored` over `human`.
- `session_id`: links the entry to the session that produced it
- `session_turn`: approximate conversation turn number; creates temporal fingerprint (entries within a session should show increasing turns)

**Why:** Frontmatter is what makes the journal queryable; entries without it are unsearchable noise that future agents must read in full. The `author` field in particular protects against attributing AI-surfaced insights to the human, which contaminates pattern analysis.

### 4. Use Correct Entry Types

Six entry types exist. Use the right one:

| Type           | Purpose                                                                   | When Created                                                                      |
| -------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **DECISION**   | Record a choice with rationale, alternatives considered, and consequences | When making architectural, design, strategic, or scope decisions                  |
| **DISCOVERY**  | Capture something learned — a concept, pattern, insight, or finding       | When research, analysis, or exploration reveals new understanding                 |
| **TRADE-OFF**  | Document a trade-off evaluation — what was gained and what was sacrificed | When balancing competing concerns                                                 |
| **RISK**       | Record an identified risk, vulnerability, or concern                      | When stress-testing, reviewing, or validating reveals potential problems          |
| **CONNECTION** | Note a relationship between concepts, components, or findings             | When cross-referencing reveals links that matter                                  |
| **GAP**        | Flag something missing that needs attention                               | When analysis reveals missing data, untested assumptions, or unresolved questions |

**Why:** A DECISION recorded as a DISCOVERY loses the alternatives-considered field; a RISK recorded as a GAP loses the severity context. Type discipline turns the journal from a diary into a structured corpus that downstream queries (`/codify`, audits) can rely on.

### 5. For Discussion Section

Every journal entry MUST include a `## For Discussion` section with 2-3 questions that probe the reasoning behind the entry. Requirements:

- At least one question must reference specific data, sources, or constraints from the entry
- At least one must be a counterfactual ("If X had been different...")
- Question structures must vary across entries (compare, challenge assumption, extend, invert, ask for evidence)
- Questions must be answerable only by someone who genuinely engaged with the decision

**Why:** Without For-Discussion questions, journal entries calcify into uncontested record; the questions force the next reader to re-engage with the reasoning rather than ratify it. Counterfactual questions in particular surface hidden assumptions that pure summary cannot.

### 6. Self-Contained Entries

Each journal entry MUST be self-contained — readable without requiring other context. Include enough background that a future session (or a different person) can understand the entry on its own.

**Why:** Cross-session readers (and `/codify`) sample entries non-sequentially. An entry that depends on adjacent entries to make sense becomes unreadable as soon as the corpus grows past a few dozen entries.

## SHOULD Rules

### 1. Decision Rationale

DECISION entries SHOULD include alternatives considered and the rationale for the choice, not just the decision itself.

**Why:** A DECISION without alternatives reads as inevitability and prevents the next session from revisiting it when constraints change. Recording rejected options is the cheapest way to preserve optionality.

### 2. Consequences and Follow-Up

Entries SHOULD include consequences, follow-up actions, or next steps where applicable.

**Why:** Decisions and discoveries usually imply follow-up work; capturing the implication in the same entry prevents it from falling between todo lists, especially across session boundaries.

## MUST NOT Rules

### 1. No Overwriting

MUST NOT overwrite existing journal entries. Each entry is immutable once created. If a decision changes, create a new entry that references the original.

**Why:** An overwritten entry destroys the audit trail of how thinking evolved; the new entry passes itself off as the original decision. CO Principle 5 (auditability) requires the corpus to be append-only.

### 2. No Entries Without Frontmatter

MUST NOT create journal entries without proper YAML frontmatter. The frontmatter enables searching, filtering, and cross-referencing.

**Why:** Frontmatter-less entries are invisible to every downstream tool that reads the journal (`/codify`, audits, cross-session search). They sit in the directory but contribute nothing to compounding knowledge.
