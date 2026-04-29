---
name: cc-audit
description: "Audit atelier's CC+CO artifacts for quality, compliance, and downstream sync integrity."
---

# CC Artifact Audit (atelier source)

Reviews atelier's CC and CO artifacts for quality AND sync correctness. Audits atelier's own artifacts, co-template distribution, downstream domain repos, and CC+CO alignment with Loom (COC).

## Your Role

Specify scope: `all`, `fidelity`, `sync`, `phase-commands`, or a specific file/type.

## Phase 1: Fidelity Audit

1. **Inventory**: List all artifacts with file paths and line counts. Cover: 7 phase commands + 8 cross-cutting commands + 7 agents + 3 skills + 9 rules + 7 hooks + CLAUDE.md.

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
   - **Cross-reference integrity**: every referenced artifact exists on disk.
   - **Frontmatter lint**: run `awk 'FNR==1{i=0} /^---$/{i++; next} i==1 && /^globs:/{print FILENAME":"FNR}' .claude/rules/*.md co-template/.claude/rules/*.md co-*/.claude/rules/*.md` — zero hits expected. This extracts only the opening frontmatter block of each rule file, so `globs:` inside DO NOT examples (e.g. `rules/cc-artifacts.md`) is correctly ignored. `globs:` is a silent-failure key — Claude Code only recognizes `paths:` for rule scoping, so any `globs:` rule loads globally or not at all. Origin: journal 0008 (ecosystem-wide path-scoping) — 8 `globs:` bugs found across co-\* repos during the scoping sweep.
   - **Empty frontmatter fields**: no `description: ""`, `paths: []`, or `null` values in canonical artifacts (per `rules/no-stubs.md` MUST NOT §2).

6. **Phase command compliance**: Verify each of the 7 phase commands (`/analyze /plan /execute /vet /codify /deliver /start`):
   - References the correct workspace dirs (`01-analyze` through `06-deliver`, plus `journal/`, `todos/active|completed`)
   - Names the correct rules (cc-artifacts, execution-discipline, journal, communication, domain-independence, **specs-authority**)
   - Deploys agents from atelier's roster (co-expert, claude-code-architect, gold-standards-validator, analyst, intermediate-reviewer, management/todo-manager, management/gh-manager)
   - Loads the right skills (co-reference, cc-artifact-patterns, atelier-broker-model)
   - HARD GATES present where required (`/plan`, `/codify` per-proposal, `/deliver`)
   - **Specs-authority integration probe** (per atelier 1.2.0): `/analyze` Step 5 creates `specs/`; `/plan` Step 1 has the specs read-gate (HARD STOP if missing); `/execute` includes specs in context anchoring with deviation handling; `/vet` treats specs as PRIMARY audit source with field-level assertion extraction; `/codify` adds `specs/` to workspace trail extraction; `/wrapup` lists `specs/` in persistence list.

## Phase 2: Sync Integrity — co-template

7. **co-template alignment**: Compare atelier/.claude/ against co-template/.claude/:
   - Are shared commands current? (After CO v1.2: `/codify` not `/learn`, `/vet` not `/review`)
   - Are shared rules current? (cc-artifacts, communication, journal, terrene-naming, independence, no-stubs, domain-independence, execution-discipline, artifact-flow)
   - Are shared agents current?
   - Does co-template have hooks + settings.json?
   - Are atelier-only artifacts (sync, sync-to-coc, the broker work) excluded from template?
   - Are co-template's workspace template dirs aligned with v1.2 (`01-analyze` through `06-deliver`)?

8. **Domain repo alignment** — for each downstream domain repo (co-research, co-education, co-governance, co-codegen when created):
   - Are shared commands current with co-template?
   - Are shared rules current?
   - Are shared hooks current?
   - Do domain-specific hooks exist alongside shared hooks (not replacing them)?
   - Are domain agents/skills domain-neutral-compliant?

## Phase 3: Sync Integrity — Loom (COC)

9. **CC+CO alignment with Loom**: Compare atelier/.claude/ CC+CO files against Loom/.claude/:
   - guides/claude-code/\* — does Loom version match atelier?
   - guides/co-setup/\* — does Loom version match atelier?
   - rules/cc-artifacts.md, communication.md, journal.md, terrene-naming.md, independence.md — in sync?
   - co-expert agent, co-reference skill, cc-artifact-patterns skill — in sync?

10. **Authority chain**: Read atelier/artifact-flow.md and Loom/artifact-flow.md:
    - Atelier says it owns CC+CO; Loom acknowledges this?
    - No contradictory "source of truth" claims?
    - Loom uses `/codify` (Phase 05) per CO v1.2?

## Phase 4: Spec Cascade — terrene/foundation

11. **CO v1.2 spec cascade**: Verify the spec at `terrene/foundation/docs/02-standards/co/03-process-model.md`:
    - Phase 05 name = "Codify"
    - Workspace dirs aligned (`01-analyze` through `06-deliver`)
    - `/vet` documented as canonical Phase 04 command
    - Version line says v1.2
    - Atelier `CLAUDE.md` Absolute Directive #3 pins v1.2

## Phase 5: Hook + L5 Integrity

12. Every hook in `settings.json` has a script on disk.
13. atelier and co-template hook sets are consistent.
14. **L5 learning files** (if present): `.claude/learning/learning-digest.json` is well-formed JSON matching the expected schema (version, period, corrections, error_patterns, accomplishments, decisions, workflow_patterns); `.claude/learning/learning-codified.json` has matching `digest_hash` for the most recent /codify run.

## Report + Convergence

Report as CRITICAL/HIGH/NOTE. Run iteratively until zero CRITICAL and zero HIGH. Use `claude-code-architect` for the audit work.
