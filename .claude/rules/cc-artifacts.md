---
paths:
  - ".claude/agents/**"
  - ".claude/skills/**"
  - ".claude/rules/**"
  - ".claude/commands/**"
  - ".claude/hooks/**"
---

# CC Artifact Quality Rules

Origin: atelier 1.0.0 baseline (commit 16c4f69) — codifies CC artifact quality standards distilled from forge research reports and loom journal corpus.

## Scope

These rules apply when creating or modifying CC artifacts (agents, skills, rules, commands, hooks).

## MUST Rules

### 1. Agent Descriptions Under 120 Characters

Agent description fields MUST be under 120 characters and include trigger phrases ("Use when...", "Use for...").

```yaml
# DO:
description: "CC artifact architect. Use for auditing, designing, or improving agents, skills, rules, commands, hooks."

# DO NOT:
description: "A comprehensive specialist for Claude Code architecture who can audit and improve all types of CC artifacts including agents, skills, rules, commands, and hooks across the entire ecosystem."
```

**Why**: Descriptions are loaded into every agent selection decision. Long descriptions waste tokens on every turn.

### 1b. Skill Descriptions Under 200 Characters

The `description:` field in `skills/*/SKILL.md` MUST be ≤200 characters. Failure-mode language only — keyword-dump patterns (`Use when asking about 'X', 'Y', 'Z', 'X with Y', ...` with ≥4 quoted alternates) are BLOCKED. CC uses LLM semantic matching, not keyword lookup; long quoted-alternate lists do NOT improve activation, they inflate the listing budget and risk dropping ALL skills out of the activation listing.

```yaml
# DO — ≤200 chars, failure-mode framing
description: "CO methodology reference. Use for the 8 principles, 5 layers, 6 phases, or domain applications (COC, COR, COE, COG)."

# DO NOT — keyword dump pattern (defeats semantic activation, inflates listing)
description: "CO methodology reference covering principles, layers, phases. Use when asking about 'CO', 'cognitive orchestration', 'methodology', '8 principles', '5 layers', '6 phases', 'analyze', 'plan', 'execute', 'vet', 'codify', 'deliver', 'COC', 'COR', 'COE', 'COG', 'COL', or 'domain applications'."
```

**BLOCKED rationalizations:**

- "More keywords help discovery" (no — semantic matching, not keyword lookup)
- "200 chars is too short for a complex skill" (use the SKILL.md body for depth)
- "Other skills have long descriptions, mine should match" (those are the ones being trimmed)
- "The cap is arbitrary" (the listing budget divides across all skills; long descriptions get TRUNCATED out of the listing entirely)

**Why**: When any skill exceeds the per-entry cap OR the cumulative listing exceeds the budget fraction, CC drops descriptions from the listing and those skills become invisible to semantic activation (loom 2026-05-06: 47/47 descriptions dropped; trimming the worst offenders to ≤200 chars restored full visibility). The description is the LLM's semantic-match input, not a search index — terseness is correctness.

Origin: inbound from loom 2.21.0 base-variant Phase 1 (loom commit 933bed5, 2026-05-06) — codifies the 47-truncation evidence into a CC-universal rule.

### 2. Skills Follow Progressive Disclosure

SKILL.md MUST answer 80% of routine questions without requiring sub-file reads. Deep reference goes in separate files.

```markdown
# DO: SKILL.md has quick reference tables + key patterns

## Quick Reference

| Pattern | Usage |
| ------- | ----- |
| ...     | ...   |

# DO NOT: SKILL.md just says "see subdirectory files"

See the files in this directory for details.
```

**Why**: Claude reads SKILL.md first. If it must read 5 additional files for basic answers, that's 5 unnecessary tool calls.

### 3. Rules Include DO/DO NOT Examples

Every MUST rule MUST include a concrete example showing both the correct and incorrect pattern.

```markdown
# DO: a MUST clause carries an adjacent DO + DO NOT code block

### 1. Use Parameterized Queries

(DO: `cursor.execute("... WHERE id = ?", (user_id,))`)
(DO NOT: `cursor.execute(f"... WHERE id = {user_id}")`)

# DO NOT: a MUST clause stated as prose with no example

### 1. Use Parameterized Queries — all queries must be parameterized.
```

**Why**: Without examples, Claude interprets rules differently each session. Examples anchor consistent behavior.

### 4. Rules Include Rationale

Every MUST and MUST NOT rule MUST include a "**Why**:" line.

**Why**: Rationale enables Claude to apply the spirit of the rule in edge cases, not just the letter.

### 5. Commands Under 150 Lines

Command files MUST stay under 150 lines. Move reference material to skills and review criteria to agents.

**Why**: Commands inject as user messages. Long commands compete with actual user intent in the token budget.

### 6. CLAUDE.md Must Be Lean

CLAUDE.md MUST stay under 200 lines. It contains 3-5 repo-specific directives, absolute rules, and navigation tables. It MUST NOT restate rules (they load separately) or embed reference material.

```markdown
# DO: CLAUDE.md = repo identity + navigation + 3-5 directives (~120 lines)

## Absolute Directives → ### 1. [Repo-specific directive]

## Rules Index → | Rule | File | Scope |

## Agents → - **specialist** — Use for X

# DO NOT: CLAUDE.md restating every rule (~600 lines)

## Security Rules → All queries must be parameterized... [repeats security.md]

## Testing Rules → Use 3-tier testing... [repeats testing.md]
```

**Why**: CLAUDE.md loads on every turn. Every line beyond navigation and directives is wasted context. Rules have their own files.

### 7. Path-Scoped Rules Use `paths:` Frontmatter

Domain-specific rules MUST use `paths:` (not `globs:`) as the YAML frontmatter key.

```yaml
# DO:
---
paths:
  - "**/db/**"
  - "**/infrastructure/**"
---
# DO NOT:
---
globs:
  - "**/db/**"
---
```

**Why**: `paths:` is the Claude Code documented key for rule file scoping. `globs:` is not recognized.

## MUST NOT Rules

### 1. No Knowledge Dumps in Agents

Agent files MUST NOT exceed 400 lines. Extract reference material to a skill directory.

```
# DO: Agent (200 lines) references skill
## Full Documentation
- `.claude/skills/cc-artifact-patterns/` — CC architecture reference

# DO NOT: Agent (600 lines) embeds the entire reference
## CC Architecture
[... 400 lines of reference material ...]
```

**Why**: Agent context competes with task context. Embedded reference loads on every invocation.

### 2. No Duplicating CLAUDE.md in Skills or Rules

Skills and rules MUST NOT repeat instructions already present in CLAUDE.md.

**Why**: CLAUDE.md is always loaded. Duplicating it doubles the token cost with zero benefit.

### 3. No Global Rules That Should Be Path-Scoped

Rules about domain-specific patterns MUST use YAML frontmatter `paths:` scoping.

```yaml
# DO: Scoped rule (loads only when editing matching files)
---
paths:
  - "src/db/**"
  - "migrations/**"
---
# DO NOT: Global rule about SQL (loads when editing CSS, README, etc.)
# (no frontmatter — rule loads every turn)
```

**Why**: A 400-token SQL rule loading on every turn when editing CSS is pure waste.

## Cross-References

- `.claude/rules/cc-enforcement.md` — the companion enforcement/audit rule (`/codify` gate, hook timeout + structure-not-semantics, audit fixtures, positive-allowlist sweeps, workspace meta-dir filtering, no-dangling-refs after extraction). The clauses formerly numbered MUST §8–§13 and MUST NOT §4–§6 here now live there, renumbered.
- `.claude/skills/cc-artifact-patterns/` — Full CC architecture patterns
- `.claude/agents/claude-code-architect.md` — CC artifact specialist
- `.claude/guides/co-setup/03-creating-components.md` — Component creation guide
