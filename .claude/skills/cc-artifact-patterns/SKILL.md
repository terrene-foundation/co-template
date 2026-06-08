---
name: cc-artifact-patterns
description: CC artifact quality patterns. Use when authoring or auditing agents, skills, rules, commands, or hooks. Distilled from forge research reports and the loom journal corpus.
allowed-tools:
  - Read
  - Glob
  - Grep
---

# CC Artifact Quality Patterns

This skill is the canonical reference for what makes a Claude Code artifact work — and what makes it fail. Distilled from forge Report 06 (CC artifact authoring craft), the loom journal corpus (~50 DISCOVERY/RISK entries), and atelier's own `rules/cc-artifacts.md`.

Use this skill when:

- Authoring a new agent, skill, rule, command, or hook
- Auditing existing CC artifacts during `/vet` or `/cc-audit`
- Codifying patterns into atelier's canonical artifacts during `/codify`

## The Four Quality Dimensions

Every CC artifact is judged on four dimensions. Failure on any dimension produces a recognizable symptom.

| Dimension            | Concrete measure                                                                            | Healthy signal                                                                       | Failure mode                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **Competency**       | Instructions precise enough that the artifact completes its job without clarification turns | Numbered "Critical Rules" + quantified targets ("not 'fast' but '<100ms'")           | Artifact "knows about" a domain but cannot finish a task — re-asks the user every session                                   |
| **Completeness**     | Edge cases enumerated; handoffs to other artifacts named; cross-refs resolve                | "Related Agents" + "Skill References" sections; "Common Gotchas" list                | Dead handoffs ("see X" where X was deleted); silent gaps that surface as hallucination                                      |
| **Effectiveness**    | Output format specified verbatim; behavior reliably reproducible across sessions            | Explicit `## Output Format` block with template                                      | Each session formats output differently, breaking downstream parsers and review workflows                                   |
| **Token Efficiency** | Path-scoped, no CLAUDE.md duplication, descriptions short, ≤ line caps                      | Frontmatter `paths:` present on domain rules; ≤ 400 line agents; ≤ 150 line commands | Unscoped rules loading every turn, embedded reference material in agents (~1,300 lines/turn waste measured in journal/0003) |

## The 12 Hard Limits

These are NOT suggestions. Each limit exists because a measurable failure mode in the journal corpus traces directly to its absence.

| #   | Limit                                                                                 | Failure mode prevented                                                                                                                        | Source                                            |
| --- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | Agent description ≤ 120 chars, with "Use when/for…" trigger                           | Description loads on every selection decision; long ones tax every turn (worst found: 432 chars)                                              | `rules/cc-artifacts.md` MUST §1; loom 0003 C1     |
| 2   | Agent file ≤ 400 lines                                                                | Whole agent loads on delegation; 600-line agents crowd out the actual task                                                                    | `rules/cc-artifacts.md` MUST NOT §1; loom 0003 C2 |
| 3   | Command file ≤ 150 lines                                                              | Commands inject as user messages and compete with the actual user intent for token budget                                                     | `rules/cc-artifacts.md` MUST §5                   |
| 4   | CLAUDE.md ≤ 200 lines, 3-5 directives, navigation only                                | CLAUDE.md loads on every turn; restating rules doubles cost (worst: 679 lines with embedded docs)                                             | `rules/cc-artifacts.md` MUST §6; loom 0003 C5     |
| 5   | Every MUST/MUST NOT rule has a `**Why:**` line                                        | Without rationale, Claude obeys the letter and breaks the spirit in edge cases                                                                | `rules/cc-artifacts.md` MUST §4                   |
| 6   | Every MUST rule has DO / DO NOT examples                                              | Without examples Claude reinterprets the rule each session; examples anchor consistent behavior                                               | `rules/cc-artifacts.md` MUST §3                   |
| 7   | Domain rules use YAML frontmatter key `paths:` (the only recognized rule-scoping key) | Any other top-level key (e.g., `globs:`, `applies_to:`) is silently ignored by CC — the rule then loads on every turn instead of being scoped | `rules/cc-artifacts.md` MUST §7; loom 0003 H2     |
| 8   | SKILL.md answers 80% of routine questions without sub-file reads                      | Otherwise basic answers cost 5 unnecessary tool calls                                                                                         | `rules/cc-artifacts.md` MUST §2                   |
| 9   | Skills/rules MUST NOT duplicate CLAUDE.md content                                     | CLAUDE.md is always loaded — duplication doubles tokens for zero benefit                                                                      | `rules/cc-artifacts.md` MUST NOT §2               |
| 10  | Hooks include `setTimeout` fallback returning `{continue: true}`                      | A hanging hook blocks the entire CC session indefinitely                                                                                      | `rules/cc-enforcement.md` MUST §2                 |
| 11  | Hooks check structure only — no semantic regex                                        | Regex semantic analysis is slow + brittle, produces spurious blocks                                                                           | `rules/cc-enforcement.md` MUST NOT §1             |
| 12  | No dangling cross-references after extraction (grep before delete)                    | Dangling refs cause file-not-found errors and force Claude to fabricate replacements                                                          | `rules/cc-enforcement.md` MUST NOT §3             |

## The 12 Micro-Patterns That Make Artifacts Work

Recurring moves observed across high-quality CC artifacts. These are the "what to write when authoring" patterns.

| Pattern                              | What it looks like                                        | Where it works             |
| ------------------------------------ | --------------------------------------------------------- | -------------------------- |
| **Trigger-phrase description**       | `description: "X specialist. Use for A, B, C."`           | All specialist agents      |
| **Path-scoping frontmatter**         | `paths: ["**/db/**", "migrations/**"]` at top of rule     | Domain rules               |
| **DO / DO NOT pair**                 | Two adjacent code blocks, never just one                  | Every MUST rule            |
| **`**Why:**` one-liner**             | Single italicized line under each rule                    | Every rule                 |
| **Skills Quick Reference table**     | Agent points "question → file" before any narrative       | Specialist agents          |
| **Output Format block**              | Verbatim markdown skeleton at agent's end                 | Quality + analysis agents  |
| **Related Agents handoff list**      | Bulleted "X — escalate Y" near the end                    | Every agent                |
| **Critical Rules — numbered, terse** | 5-7 numbered imperatives at the top, no prose             | Analysis/specialist agents |
| **Quick-Reference matrix table**     | Layer/Need/API matrix near top of artifact                | Skills + specialists       |
| **Progressive disclosure index**     | SKILL.md = quick ref + matrix; sub-files linked by topic  | Numbered skill dirs        |
| **MUST / MUST NOT split**            | Two h2 sections, both populated, both with examples + Why | All quality rules          |
| **Risk/Issue priority table**        | Critical / Major / Minor with criteria + action columns   | Analysis + reviewer agents |

## The 12 Anti-Patterns (named so they can be hunted)

These are the things `/vet` and `/cc-audit` MUST detect and reject.

| Anti-pattern                   | Symptom                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | How to fix                                                                                                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scope leak**                 | Domain rule with no `paths:` frontmatter — loads every turn                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Add `paths:` glob to frontmatter                                                                                                                                        |
| **Knowledge dump in agent**    | Agent file embeds reference material instead of linking a skill (>400 lines)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Extract reference into a skill; link from agent                                                                                                                         |
| **CLAUDE.md restatement**      | CLAUDE.md repeats rule content already in `.claude/rules/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Remove duplication from CLAUDE.md                                                                                                                                       |
| **Wrong frontmatter key**      | Typo'd or unrecognized key in opening frontmatter — CC silently ignores → key's intent is lost. Per-type valid-key allowlists at `commands/cc-audit.md` Phase 1 Step 5; canonical CC docs at https://code.claude.com/docs/en/sub-agents and https://code.claude.com/docs/en/skills. Common slips per type:<br>• rules: anything except `paths:` (silent global load)<br>• agents: `allowed-tools:` instead of `tools:` (skills key applied to agent)<br>• skills: `triggers:` instead of `when_to_use:` (undocumented)<br>• commands: same allowlist as skills post-merger | Run the type-specific frontmatter lint at `cc-audit.md` Phase 1 Step 5; rename the offending key per the per-type allowlist (or remove if intentionally using defaults) |
| **Prose-only constraint**      | MUST rule with no DO/DO NOT example — Claude reinterprets each session                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Add adjacent DO/DO NOT code blocks                                                                                                                                      |
| **Why-less rule**              | MUST/MUST NOT without `**Why:**` line — letter obeyed, spirit broken                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Add `**Why:**` italicized line under each rule                                                                                                                          |
| **Dead cross-reference**       | Agent points to a skill/file that has been deleted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | grep before delete; update or remove the link                                                                                                                           |
| **Hanging hook**               | Hook with no `setTimeout` fallback — can block whole session                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Add timeout with `{continue: true}` fallback                                                                                                                            |
| **Semantic-regex hook**        | Hook attempting meaning analysis via regex — false positives block work                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Hook checks structure only; agent checks meaning                                                                                                                        |
| **BUILD-in-USE contamination** | Repo-specific artifact shipped where it has no referent (e.g., codegen agents in non-codegen repo)                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Move artifact to its correct repo tier                                                                                                                                  |
| **Long agent description**     | Description > 120 chars steals tokens on every selection                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Shorten to ≤120 chars with trigger phrase                                                                                                                               |
| **Orphaned-skill panic**       | Treating numbered skill dirs as "orphans" because nothing imports them — they are discovered by SKILL.md trigger descriptions, not by name                                                                                                                                                                                                                                                                                                                                                                                                                                 | Verify trigger discovery before declaring orphan                                                                                                                        |

## How This Skill Is Used

| Phase / Command                               | Use                                                                                                                              |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `/execute` (drafting CC artifacts)            | Apply hard limits at draft time; use micro-patterns as authoring templates                                                       |
| `/vet` (compliance audit)                     | Audit drafts against the 12 hard limits and 12 anti-patterns; deploy claude-code-architect                                       |
| `/codify` (institutional knowledge promotion) | MANDATORY per `rules/cc-enforcement.md` MUST §1 — every codified artifact passes the compliance bar before landing in `.claude/` |
| `/cc-audit`                                   | Full inventory + audit against all 12 limits + anti-pattern hunt                                                                 |

## Cross-References

- `rules/cc-artifacts.md` — the enforced authoring-limit rules (this skill is the reference behind those rules)
- `rules/cc-enforcement.md` — the enforcement/audit rules (`/codify` gate, hook discipline, audit fixtures, mechanical sweeps) split out of cc-artifacts
- `agents/claude-code-architect.md` — the agent that operationalizes this skill
- forge Report 06: `/Users/esperie/repos/lyceum/programs/forge/.claude/workspaces/forge-curriculum/01-analysis/01-research/06-cc-artifact-authoring-craft.md` — the original distillation source

## Honest Limits

This skill captures what is observable in the journal corpus and the cc-audit guides. It does NOT cover:

- Skill-to-skill cross-loading patterns (under-studied; see if a pattern emerges over the next 5 atelier projects)
- Hook composition for cross-repo enforcement (hooks are per-repo; cross-repo enforcement is via the broker)
- Agent team orchestration patterns at scale (loom has 12+ agents per command; atelier's roster is smaller)

When evidence accumulates via `.claude/learning/learning-digest.json` (loom's L5 system) or via the project workspace trail, this skill is a target for `/codify` updates.
