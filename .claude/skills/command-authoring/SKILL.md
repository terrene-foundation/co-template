---
name: command-authoring
description: Authoring or auditing slash commands. Frontmatter discipline, the 150-line body cap, command-vs-skill-vs-agent placement, neutral phrasing, full audit checklist.
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Command Authoring

Meta-authoring reference for slash commands — the procedure-invoked-by-name artifact in the CC artifact family. A command is distinct from an agent (specialist judgment plus tools), a skill (reference looked up on demand), and a rule (always-on guardrail). Commands inject as user-message prompts at invocation, so every line in the body competes with the actual user intent for context budget.

This skill is the "how to write one" companion to `skills/cc-artifact-patterns/` (the "what makes any CC artifact work") and the enforced limits in `rules/cc-artifacts.md`.

## When To Use

- Authoring a new slash command from scratch.
- Auditing an existing command for the line cap, description quality, or neutral phrasing.
- Deciding whether work belongs in a command (a procedure invoked by name), an agent (specialist judgment with tools and delegation), a skill (reference looked up on demand), or a rule (always-on boundary).

## Quick Reference

| Concern          | Standard                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| On-disk path     | `.claude/commands/<name>.md`                                                                            |
| Invocation       | `/<name>` (plus optional arguments)                                                                     |
| Frontmatter      | YAML: `name:` + `description:`, optional `argument-hint:` and `allowed-tools:`                          |
| `name:`          | Lowercase, hyphen-separated; matches the filename stem.                                                 |
| `description:`   | One short line, failure-mode language. Under 120 chars per `rules/cc-artifacts.md` Rule 1.              |
| Body length      | **150 lines maximum** per `rules/cc-artifacts.md` Rule 5. Push reference to skills, judgment to agents. |
| Neutral phrasing | No literal delegation-call syntax in prescriptive prose; write the instruction in natural language.     |
| `argument-hint:` | Single line; rendered after the command name during typeahead.                                          |

## Frontmatter Discipline

Keep frontmatter minimal and action-oriented. Only `name:` and `description:` are required.

```yaml
# DO — minimal, action-oriented
---
name: vet
description: Load phase 04 (vet) for the active workspace. Spec coverage plus adversarial review.
---
```

The `description:` is what appears in the command listing surface (`/help` and typeahead). Failure-mode language — naming the situation the command addresses — wins over generic noun phrases:

```markdown
# DO — names the situation

description: Package the finalized work and name downstream sync targets.

# DO NOT — generic noun phrase, no signal

description: Delivery utility command.
```

Per `rules/cc-artifacts.md` Rule 1, the description shares a listing budget with every other command and agent description; long ones get truncated out of the listing. Terseness is correctness, not style.

### Argument Hint

```yaml
---
name: execute
description: Load phase 03 (execute) for the active workspace.
argument-hint: "[task-id]"
---
```

`argument-hint:` renders inline after the command name during typeahead. Use bracketed placeholders for optional arguments, angle brackets for required ones. If you set `argument-hint:`, the body MUST actually resolve `$ARGUMENTS` — otherwise typeahead promises a feature the command does not deliver.

### Allowed Tools (Rare)

`allowed-tools:` restricts which tools may be invoked during the command body. The default is unrestricted; most commands omit this. Use it only when the command genuinely should not reach for, say, `Bash` or `Write`.

## Body Discipline — 150 Lines Maximum

Per `rules/cc-artifacts.md` Rule 5: commands inject as user messages and compete with the actual user prompt. A long command crowds out user intent.

### What Belongs IN The Body

- Numbered workflow steps the agent executes ("1. Resolve the active workspace. 2. Read the brief. 3. Emit findings to ...").
- Exit conditions and phase gates ("Do not proceed to the next phase without explicit human approval").
- Output target paths (`workspaces/<project>/01-analyze/summary.md`).

### What Belongs ELSEWHERE

- Reference tables, taxonomies, exhaustive option lists → **skills** (loaded on demand via a SKILL.md cross-reference).
- Review rubrics, scoring matrices, judgment criteria → **agents** (the specialist owns the criteria).
- Boundary enforcement and always-on checks → **rules** (frontmatter-scoped, loaded automatically).

When a command exceeds 150 lines, the fix is almost always extraction: move the reference block into a skill the command references by name.

The 150-line cap is an **output-quality** discipline, not only a budget one. Per the over-density principle in `rules/rule-authoring.md` (and the curation dimension in `agents/claude-code-architect.md`), a body whose load-bearing steps are buried in non-load-bearing prose degrades the output of the agent that loads it. At audit time, surfacing over-density is an advisory FINDING (recommend extraction), never a structural FAIL.

## Neutral Phrasing

A command body is a set of instructions, not executable code. Write delegation and tool use as natural-language instruction, never as literal call syntax baked into prescriptive prose.

```markdown
# DO — neutral, natural-language delegation

Delegate to the reviewer specialist for a parallel scan; dispatch the
reviewer and the standards validator in the same wave.

# DO NOT — literal call syntax in prescriptive prose

Agent(subagent_type="intermediate-reviewer", run_in_background=true, prompt=...)
Task(subagent_type="intermediate-reviewer", ...)
```

The same restraint applies to internal mechanism names. Write "the session-start hook" rather than a PascalCase event identifier presented as a prescriptive token. Natural-language instruction survives rephrasing and re-reading; literal call syntax embedded in a prompt body is brittle and reads as something to be executed verbatim rather than understood.

## Decision: Command vs Skill vs Agent vs Rule

| Symptom                                                   | Belongs in |
| --------------------------------------------------------- | ---------- |
| User types `/foo` to start a procedure                    | Command    |
| Reference content looked up on demand                     | Skill      |
| Specialist judgment with tools and delegation             | Agent      |
| Always-on boundary enforcement                            | Rule       |
| Deterministic firing on a tool event or session lifecycle | Hook       |

If a "command" file grows judgment rubrics, scoring criteria, or conditional branching with recovery paths, it is an agent in disguise. Move the body into `.claude/agents/<name>.md` and shrink the command to a short dispatch ("Delegate to the `<name>` specialist with the user's input as the prompt").

## Common Mistakes

### 1. Body Over 150 Lines

The most frequent failure. Reference tables, exhaustive option lists, and multi-page rubrics inflate the body until command injection floods the user's prompt context. Fix: extract the reference content into a skill or move the judgment into an agent.

### 2. Literal Delegation Syntax In The Body

Call-syntax tokens (`Agent(...)`, `Task(...)`, `TodoWrite(...)`) presented as prescriptive prose read as code to execute rather than instruction to follow. Fix: rewrite as a neutral instruction ("delegate to the reviewer", "dispatch the reviewer and the standards validator in parallel").

### 3. Description As A Sentence Paragraph

Multi-sentence descriptions waste listing budget and dilute the failure-mode signal. Fix: one short clause naming the situation the command addresses, not a paragraph.

### 4. `argument-hint:` Without Body Handling

Frontmatter hints at arguments, but the body never references `$ARGUMENTS`. Result: typeahead promises a feature the command does not deliver. Fix: either remove the hint or wire `$ARGUMENTS` resolution into the body.

### 5. Reference Content Inlined Instead Of Linked

A taxonomy or option matrix lives in the command body instead of a skill. Every invocation re-injects the whole table. Fix: move it to a skill and reference the skill by name.

## Audit Checklist

When auditing an existing command:

- [ ] `name:` matches the filename stem
- [ ] `description:` is one short line in failure-mode language, under 120 chars
- [ ] Body is 150 lines or fewer (count after stripping frontmatter)
- [ ] No literal delegation-call syntax in prescriptive prose
- [ ] No internal-mechanism event names presented as prescriptive tokens
- [ ] Reference content (tables, taxonomies) lives in skills, not the body
- [ ] Judgment criteria (rubrics, scoring) live in agents, not the body
- [ ] If `argument-hint:` is set, the body resolves `$ARGUMENTS`
- [ ] No placeholder markers (`[TODO]`, `[TBD]`) left as final content

## Related

- `skills/cc-artifact-patterns/` — what makes any CC artifact work; the 12 hard limits and 12 anti-patterns
- `rules/cc-artifacts.md` Rule 5 — the 150-line cap on commands
- `rules/cc-artifacts.md` Rule 1 — description char cap and listing-budget pressure
- `rules/rule-authoring.md` — the over-density principle behind the output-quality framing of the line cap
- `agents/claude-code-architect.md` — the agent that audits commands against these standards
