---
name: skill-authoring
description: Authoring or auditing skills. Description-as-activation mechanism, the 200-char/no-keyword-dump cap, progressive-disclosure 80/20, tools-list discipline, full audit checklist.
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Skill Authoring

Meta-authoring reference for skills — the reference-looked-up-on-demand artifact in the CC artifact family. A skill is distinct from an agent (specialist judgment plus tools and delegation), a rule (always-on guardrail), a command (a procedure invoked by name), and a hook (deterministic firing on a tool or session event). A skill carries no judgment of its own: it is lookup content the model loads when its `description:` semantically matches the work at hand.

This skill is the "how to write one" companion to `skills/cc-artifact-patterns/` (the "what makes any CC artifact work") and the enforced limits in `rules/cc-artifacts.md`.

## When To Use

- Authoring a new skill from scratch.
- Auditing an existing skill for description length, progressive-disclosure coverage, or tools-list accuracy.
- Deciding whether a body of knowledge belongs in a skill (reference content, activated semantically) versus an agent (judgment plus procedure), a rule (boundary enforcement), or a command (a named procedure).

## Quick Reference

| Field            | Constraint                                                                             |
| ---------------- | -------------------------------------------------------------------------------------- |
| `name:`          | Lowercase, hyphen-separated. Matches the directory name.                               |
| `description:`   | **≤ 200 chars.** Failure-mode language. No keyword-dump (`'X', 'Y', 'Z', ...`).        |
| `allowed-tools:` | Minimal, accurate set — only what the SKILL.md body and its sub-files actually invoke. |
| SKILL.md body    | ~150–250 lines. MUST answer 80% of routine questions without a sub-file read.          |
| Sub-files        | `<skill-dir>/<topic>.md`. Loaded on demand via an explicit SKILL.md cross-reference.   |

## Directory Layout

```
.claude/skills/<skill-name>/
├── SKILL.md          ← primary entry, frontmatter-bearing
├── <topic-1>.md      ← progressive-disclosure depth
├── <topic-2>.md      ← specialist deep-dive
└── fixtures/         ← optional: example inputs the skill references
```

The directory name MUST match `name:` in SKILL.md frontmatter. Numbered prefixes (`01-`, `02-`) are conventional for ordering but not load-bearing — semantic activation reads `description:` only, never the directory name.

## The `description:` Field IS The Activation Mechanism

Skill selection is semantic, not keyword. The model reads every installed skill's `description:` in the listing and selects the one whose _failure-mode language_ matches the user's intent. The description is the LLM's semantic-match input, not a search index — so terseness is correctness, and keyword-dump descriptions (`"Use when asking about 'X', 'Y', 'Z', 'X with Y'"` with four or more quoted alternates) are BLOCKED per `rules/cc-artifacts.md` Rule 1b. They inflate the listing budget without improving activation.

### DO — Failure-Mode Language

```yaml
description: "Authoring or auditing skills. Description-as-activation, the 200-char cap, progressive-disclosure 80/20, tools-list discipline, full audit checklist."
description: "CO methodology reference. Use for the 8 principles, 5 layers, 6 phases, or domain applications (COC, COR, COE, COG)."
```

Each names the situation the skill addresses plus the conventions it carries. Selection precision is high because the listing entry tells the model what failure mode the skill prevents.

### DO NOT — Keyword Dump

```yaml
description: "Reference for the methodology covering principles, layers, phases, and review. Use when asking about 'methodology', 'principles', 'layers', 'phases', 'analyze', 'plan', 'execute', 'vet', 'codify', 'deliver', 'review', 'audit', 'domain applications', or 'workflow'."
```

**Why this fails:** The total listing budget divides across every installed skill — roughly 200 chars per entry. When any single description exceeds the per-entry cap, OR the cumulative listing exceeds the budget fraction, the listing drops descriptions — and those skills become invisible to semantic activation. Recorded evidence: a listing of 47 skills had all 47 descriptions dropped because cumulative description bytes exceeded the budget fraction (≈10 KB across 47 entries → ~213 chars/entry average; 18 skills exceeded that average and pushed the total over). Trimming the worst offenders to ≤ 200 chars freed the budget and restored full visibility. A long description does not just hurt its own skill — it can evict every other skill from the listing.

### `MANDATORY` Framing For Strong Preconditions

When a skill must fire whenever a domain is touched — not merely as a tiebreaker — open the description with `MANDATORY`. The framing signals to the model that the skill is the authoritative entry point for that domain, not one candidate among several. Use it sparingly: if every skill claims `MANDATORY`, the signal degrades to noise.

## Tools Field — Minimal And Accurate

The skill frontmatter is the contract: list every tool the SKILL.md body or its sub-files actually invoke, and nothing more.

```yaml
# DO — minimal, accurate list
allowed-tools:
  - Read
  - Glob
  - Grep

# DO NOT — list every tool the skill might conceivably want
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
```

Over-listing dilutes the contract and grants permissions the skill does not need. Skills are reference plus lookup — `Read`, `Glob`, and `Grep` cover almost all of them. If a skill genuinely needs `Bash` or `Write`, that is a signal the skill is doing implementation work the architecture says belongs in an agent (see the decision table below).

## Progressive Disclosure — The 80/20 Rule

SKILL.md MUST answer ~80% of routine questions in the domain without requiring a sub-file read, per `rules/cc-artifacts.md` Rule 2. Sub-files exist for depth on the long tail.

### Layering Pattern

```
SKILL.md         ← Quick-reference table + key conventions + DO / DO NOT examples
sub-topic-1.md   ← Full reference: every constraint, every edge case
sub-topic-2.md   ← Specialist deep-dive (e.g., an error taxonomy, a fixture catalog)
fixtures/        ← Optional: example payloads the skill references
```

The body should be enough that a session resolves common questions without expanding sub-files into context. Sub-files load on demand via an explicit cross-reference (`See [<topic>.md](<topic>.md) for the full taxonomy`).

Progressive disclosure is also an **output-quality** discipline, not only a token-budget one. Per the over-density principle in `rules/rule-authoring.md` (and the curation dimension audited by `agents/claude-code-architect.md`), an artifact whose load-bearing content is drowned in non-load-bearing prose degrades the OUTPUT of the agent that loads it — extract depth to sub-files and keep the body curated. At audit time, surfacing over-density is an advisory FINDING (recommend extraction), never a structural FAIL.

### DO — Index With Cross-References

```markdown
## Sub-File Index

- **[error-taxonomy.md](error-taxonomy.md)** — Full error taxonomy: every failure class, cause, and recovery path.
- **[fixture-catalog.md](fixture-catalog.md)** — Example inputs the skill references, with expected outputs.
```

### DO NOT — Bury Sub-Files Without Surfacing Them

If SKILL.md never mentions `topic-X.md`, the model has no signal to load it. Sub-files without an entry in the SKILL.md index are dead weight — they cost storage and review attention and contribute nothing to activation.

## Decision: Skill vs Agent vs Rule vs Command vs Hook

| Symptom                                                   | Belongs in |
| --------------------------------------------------------- | ---------- |
| Reference content looked up on demand                     | Skill      |
| Specialist judgment with tools and delegation             | Agent      |
| Always-on boundary enforcement                            | Rule       |
| A procedure a user invokes by typing `/foo`               | Command    |
| Deterministic firing on a tool event or session lifecycle | Hook       |

A skill is reference content; an agent is judgment plus procedure. If a "skill" prescribes a workflow with conditional branches and recovery paths, it is really an agent in disguise — move the workflow content into `.claude/agents/<name>.md` and leave the skill as the lookup table the agent reads. This is the single most common misclassification.

## Common Mistakes

### 1. Over-Long Description

The most frequent failure. The description exceeds 200 chars, the cumulative listing budget is exceeded, and the skill becomes invisible to semantic activation. Fix: rewrite using failure-mode language, drop the quoted-keyword alternates, target 80–180 chars.

### 2. SKILL.md As Index-Only

A SKILL.md that is just a sub-file index forces the model to expand three to five sub-files for any routine question. Fix: pull the 80%-coverage content INTO SKILL.md; reserve sub-files for the long tail.

### 3. Tools-List Mismatch

The SKILL.md body or a sub-file references `Bash` or `Write`, but the frontmatter only lists `Read`. The runtime grants permissions from the frontmatter, so the body triggers permission prompts the author did not expect. Fix: scan the SKILL.md body and every sub-file for tool invocations; mirror the union in the frontmatter.

### 4. Skill Replaces Agent Knowledge

A skill prescribes a multi-step procedure with conditional branches — that is an agent, not reference content. Fix: move the procedure into an agent file; leave the skill as the lookup table the agent reads.

### 5. Delegation Syntax In Prescriptive Prose

A skill body bakes in literal call syntax (`Agent(subagent_type="...")`, `Task(...)`) as a prescriptive token. Literal call syntax in a prompt body is brittle and reads as something to execute verbatim rather than understood. Fix: use neutral natural-language phrasing — "delegate to the reviewer specialist", "dispatch the reviewer and the standards validator in parallel".

### 6. CLAUDE.md As Prescriptive Authority

A skill cites "per CLAUDE.md" as if CLAUDE.md were the rule source. CLAUDE.md is navigation, not a rulebook. Fix: cite the actual rule by path (`rules/cc-artifacts.md` Rule 2) or refer to "the baseline rules".

## Audit Checklist

When auditing an existing skill:

- [ ] `description:` ≤ 200 chars, failure-mode language, no keyword-dump
- [ ] `name:` matches the directory name
- [ ] `allowed-tools:` lists only what the SKILL.md body and its sub-files invoke
- [ ] SKILL.md body ~150–250 lines; answers 80% of routine questions without a sub-file read
- [ ] Every sub-file is surfaced via the index in SKILL.md (no buried sub-files)
- [ ] No literal delegation-call syntax in prescriptive prose
- [ ] No CLAUDE.md cited as prescriptive authority (cite a rule by path, or "the baseline rules")
- [ ] No internal-mechanism event names presented as prescriptive tokens
- [ ] No placeholder markers (`[TODO]`, `[TBD]`) left as final content
- [ ] The content is genuinely reference, not a disguised agent workflow

## Related

- `skills/cc-artifact-patterns/` — what makes any CC artifact work; the 12 hard limits and 12 anti-patterns (Hard Limit 8 = the 80/20 rule; anti-pattern "Long agent description" is this skill's description-cap sibling)
- `skills/command-authoring/` — the command companion (frontmatter, the 150-line cap, command-vs-skill-vs-agent placement)
- `rules/cc-artifacts.md` Rule 1b — description ≤ 200 chars enforcement and the listing-budget evidence
- `rules/cc-artifacts.md` Rule 2 — progressive disclosure 80/20
- `rules/rule-authoring.md` — the over-density principle behind the output-quality framing of progressive disclosure
- `agents/claude-code-architect.md` — the agent that audits skills against these standards
