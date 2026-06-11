---
name: cc-audit
description: "Audit this repository's CC+CO artifacts for quality, compliance, and cross-reference integrity."
---

# CC Artifact Audit

Reviews this repository's CC and CO artifacts for quality AND internal integrity — commands, agents, skills, rules, and CLAUDE.md.

## Your Role

Specify scope: `all`, `fidelity`, `phase-commands`, or a specific file/type.

## Phase 1: Fidelity Audit

1. **Inventory**: List all artifacts with file paths and line counts. Cover: the phase commands, the cross-cutting commands, all agents (including `agents/domain/` and `agents/management/`), all skills, all rules, and CLAUDE.md.

2. **Four-dimension audit** per artifact (load `skills/cc-artifact-patterns/` for the canonical reference):
   - **Competency**, **Completeness**, **Effectiveness**, **Token Efficiency**

3. **12 Hard Limits** (per `skills/cc-artifact-patterns/` and `rules/cc-artifacts.md`):
   - Agent descriptions ≤ 120 chars with trigger phrases
   - Agents ≤ 400 lines, commands ≤ 150 lines, CLAUDE.md ≤ 200 lines
   - Rules have DO/DO NOT examples and `**Why:**` rationale
   - Path-scoped rules use `paths:` (not `globs:`) frontmatter
   - No knowledge dumps in agents (extract to skills)
   - No CLAUDE.md restatement in rules/skills
   - Hooks include setTimeout fallback
   - SKILL.md answers 80% of routine questions

4. **12 Anti-Pattern hunt** (per `skills/cc-artifact-patterns/`): scope leak, wrong frontmatter key, dead cross-reference, hanging hook, knowledge dump, CLAUDE.md restatement, prose-only constraint, why-less rule, etc.

5. **Mechanical sweeps** (grep-proven, each hit is CRITICAL):
   - **Cross-reference integrity**: every referenced artifact exists on disk. Scan target list MUST include `.claude/rules/*.md`, `.claude/agents/**/*.md`, `.claude/skills/**/*.md`, `.claude/commands/*.md`, and `.claude/guides/**/*.md` — including `commands/cc-audit.md` itself. Earlier scopes that excluded the commands and guides directories produced a meta-blind-spot: a dangling reference inside `cc-audit.md` (e.g., `learning/learning-codified.json` from 2026-05-03) survived multiple audit runs because the audit couldn't audit itself. Origin: GH atelier#9 (2026-05-03 cc-audit-lint-generalize /vet round HIGH finding).
   - **Rule frontmatter lint** (positive allowlist): run `awk 'FNR==1{i=0} /^---$/{i++; next} i==1 && /^[A-Za-z_][A-Za-z0-9_-]*:/ && !/^paths:/{print FILENAME":"FNR":"$0}' .claude/rules/*.md` — zero hits expected. The lint flags any top-level frontmatter key in opening blocks that is not in the `paths:` allowlist. The block-scoping predicate `i==1` (load-bearing — `/^---$/{i++; next}` increments on each `---`, so `i==1` is true only inside the opening frontmatter block) restricts matching to the opening `---`/`---` block; YAML inside DO/DO NOT example blocks in the body (e.g. `globs:` examples in `rules/cc-artifacts.md`) is correctly ignored because those lines have `i>=2`. Empty frontmatter (no opening `---` block at all) is also valid — global rules like `communication.md` rely on this. `globs:` is the historical silent-failure instance; the broader class is any unrecognized key, which CC silently treats as no-frontmatter and loads the rule globally. Output format is `path:line:offending-line` so the violating key is visible in the audit report. Origin: 8 `globs:` bugs found during the 2026-04-07 ecosystem-wide path-scoping sweep; generalized from `globs:`-specific to allowlist-based 2026-05-02. To extend the allowlist (e.g., for a new CC-recognized key), update `rules/cc-artifacts.md` MUST §7 and the regex `!/^paths:/` in the same commit.
   - **Agent frontmatter lint** (positive allowlist): run `awk 'FNR==1{i=0} /^---$/{i++; next} i==1 && /^[A-Za-z_][A-Za-z0-9_-]*:/ && !/^(name|description|tools|disallowedTools|model|permissionMode|maxTurns|skills|mcpServers|hooks|memory|background|effort|isolation|color|initialPrompt):/{print FILENAME":"FNR":"$0}' .claude/agents/*.md .claude/agents/**/*.md` — zero hits expected. Allowlist is the 16 documented frontmatter fields for subagents per https://code.claude.com/docs/en/sub-agents §"Supported frontmatter fields". Common slip: `allowed-tools:` (skill key) used in agents — the documented field for tool restriction in agents is `tools:`. Block-scoping invariant (`i==1`) and output format identical to the rule lint. Origin: GH atelier#8; generalized from rules-only 2026-05-06.
   - **Skill frontmatter lint** (positive allowlist): run `awk 'FNR==1{i=0} /^---$/{i++; next} i==1 && /^[A-Za-z_][A-Za-z0-9_-]*:/ && !/^(name|description|when_to_use|argument-hint|arguments|disable-model-invocation|user-invocable|allowed-tools|model|effort|context|agent|hooks|paths|shell):/{print FILENAME":"FNR":"$0}' .claude/skills/*/SKILL.md` — zero hits expected. Allowlist is the 15 documented frontmatter fields for skills per https://code.claude.com/docs/en/skills §"Frontmatter reference". Common slip: `triggers:` (undocumented) used as a trigger-phrase array — the documented field is `when_to_use:`. Origin: GH atelier#8.
   - **Command frontmatter lint** (positive allowlist): run `awk 'FNR==1{i=0} /^---$/{i++; next} i==1 && /^[A-Za-z_][A-Za-z0-9_-]*:/ && !/^(name|description|when_to_use|argument-hint|arguments|disable-model-invocation|user-invocable|allowed-tools|model|effort|context|agent|hooks|paths|shell):/{print FILENAME":"FNR":"$0}' .claude/commands/*.md` — zero hits expected. Allowlist matches the skill set per the docs note that `.claude/commands/*.md` files "still work and support the same frontmatter" as skills (skills page §"Custom commands have been merged into skills"). Origin: GH atelier#8.
   - **Empty frontmatter fields**: no `description: ""`, `paths: []`, or `null` values in canonical artifacts (per `rules/no-stubs.md` MUST NOT §2).

6. **Phase command compliance**: Verify each of the 7 phase commands (`/analyze /plan /execute /vet /codify /deliver /start`):
   - References the correct workspace dirs (`01-analyze` through `06-deliver`, plus `journal/`, `todos/active|completed`)
   - Names the correct rules (cc-artifacts, execution-discipline, journal, communication, domain-independence, **specs-authority**)
   - Deploys agents from this repository's shipped roster (claude-code-architect, gold-standards-validator, domain/domain-expert, domain/quality-reviewer, management/todo-manager, management/gh-manager)
   - Loads the right skills (co-reference, cc-artifact-patterns)
   - HARD GATES present where required (`/plan`, `/codify` per-proposal, `/deliver`)
   - **Specs-authority integration probe**: `/analyze` creates `specs/`; `/plan` Step 1 has the specs read-gate (HARD STOP if missing); `/execute` includes specs in context anchoring with deviation handling; `/vet` treats specs as PRIMARY audit source with field-level assertion extraction; `/codify` adds `specs/` to workspace trail extraction; `/wrapup` lists `specs/` in persistence list.

## Phase 2: Workspace + Settings Integrity

7. Every hook registered in `settings.json` has a script on disk.
8. Workspace template dirs are aligned with CO v1.2 (`01-analyze` through `06-deliver`, plus `journal/`, `todos/active|completed`).
9. **Learning files** (if present): `.claude/learning/learning-digest.json` is well-formed JSON matching the expected schema (version, period, corrections, error_patterns, accomplishments, decisions, workflow_patterns); `.claude/learning/learning-codified.json` has matching `digest_hash` for the most recent /codify run.

## Report + Convergence

Report as CRITICAL/HIGH/NOTE. Run iteratively until zero CRITICAL and zero HIGH. Use `claude-code-architect` for the audit work.

## Composition Precedence

The mechanical sweeps (Phase 1 Step 5), the four-dimension judgment (Phase 1 Step 2), and any adversarial effectiveness A/B probe (per `rules/probe-driven-verification.md`) are NOT a flat list of equal findings — they **compose** into one verdict with a fixed precedence. Two signal classes are **load-bearing**; LLM judgment **corroborates**.

- **Structural signal (load-bearing)**: any mechanical-sweep RED — a cross-reference that does not resolve, a frontmatter-lint hit, an over-limit line/char count, an empty frontmatter field. Each is CRITICAL **regardless of LLM-dimension judgment**.
- **Adversarial signal (load-bearing)**: a failed effectiveness A/B — the same task run once with the artifact in context and once with it stripped, showing the artifact does NOT change behavior — is CRITICAL on an in-scope artifact **regardless of LLM-dimension judgment**.
- **LLM judgment (corroborating)**: surfaced at reviewer-judged NOTE/HIGH. Additive on top of the load-bearing signals — it catches what they miss, but it is NEVER auto-cleared and NEVER used to override them.

```markdown
# DO — structural signal wins:

The cross-reference integrity sweep flags a dangling reference in agent X.
LLM read of X: "reads clean, well-scoped, no issues."
→ Verdict: CRITICAL (the dangling ref). The LLM read is recorded as
corroboration, not as a clearance.

# DO NOT — LLM judgment overriding a structural red:

A frontmatter-lint hit on rule Y is downgraded to NOTE because
"the rule is obviously fine on reading and the key is harmless."
→ A structural RED is CRITICAL. An LLM "looks fine" can NEVER clear it.
```

**Why**: Mechanical sweeps exist to catch silent failures — the class of defect an LLM read misses by construction (a key CC parses as no-frontmatter still "reads fine"). If a confident LLM judgment could downgrade a structural RED, the audit's deterministic backbone becomes advisory and the silent-failure class reopens. Precedence is one-directional: structure and adversarial proof gate the verdict; judgment enriches it.
