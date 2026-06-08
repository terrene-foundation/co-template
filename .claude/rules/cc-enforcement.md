---
paths:
  - ".claude/agents/**"
  - ".claude/skills/**"
  - ".claude/rules/**"
  - ".claude/commands/**"
  - ".claude/hooks/**"
---

# CC Artifact Enforcement & Audit Rules

Origin: atelier 1.0.0 baseline (commit 16c4f69) — split from `rules/cc-artifacts.md` (390 lines, over the 200-line cap) so each half stays under cap. This file carries the clauses governing HOW CC artifact quality is enforced (gate deployment, hook discipline, audit tooling, mechanical sweeps); `cc-artifacts.md` carries the authoring limits the artifacts themselves MUST meet.

## Scope

These rules apply to the enforcement and audit machinery for CC artifacts — the `/codify` validation gate, lifecycle hooks under `.claude/hooks/**`, mechanical audit sweeps (in `/cc-audit`, `/sweep`, or a hook), and the cross-reference integrity sweep at extraction time. They bind the tooling that checks artifacts, not the artifacts' own authoring shape (that is `rules/cc-artifacts.md`).

## MUST Rules

### 1. /codify Deploys claude-code-architect

Every `/codify` execution MUST include `claude-code-architect` in its validation team. All new or modified artifacts MUST be validated against cc-artifacts rules before completion.

**Why**: Without artifact validation, `/codify` creates agents with 800-line knowledge dumps, unscoped rules, and commands that exceed 150 lines — compounding token waste across every future session.

### 2. Hooks Include Timeout Handling

Every hook MUST include a setTimeout fallback that returns `{ continue: true }` and exits.

```javascript
// DO:
const TIMEOUT_MS = 5000;
const timeout = setTimeout(() => {
  console.log(JSON.stringify({ continue: true }));
  process.exit(1);
}, TIMEOUT_MS);

// DO NOT:
// (no timeout — hook hangs indefinitely if processing stalls)
```

**Why**: A hanging hook blocks the entire Claude Code session indefinitely.

### 3. New Rules MUST Follow the Rule-Authoring Meta-Rule

Every new rule MUST pass the Loud/Linguistic/Layered test defined in `rules/rule-authoring.md`.

```markdown
# DO:

MUST/MUST NOT modals, BLOCKED phrases for common rationalizations, DO/DO NOT examples, Why: lines, and paths: frontmatter scoping it.

# DO NOT:

"should"/"try to" as primary modal, no blocked phrases, no examples, no rationale, loads globally despite being domain-specific.
```

**Why**: Rules without the Loud/Linguistic/Layered properties are ignored under pressure. Evidence: subprocess A/B test showed rule quality improved from 2/6 to 6/6 when the meta-rule was loaded (loom 0052-DISCOVERY §6).

### 4. Audit Tools Ship With Committed Test Fixtures

Every mechanical audit tool (lint, grep-based check, sweep) added to `/cc-audit`, `/sweep`, or a hook MUST ship with at least one committed test fixture per scope-restriction predicate the tool relies on. Fixtures live under `.claude/audit-fixtures/<tool-name>/` with a per-fixture expected-output file.

```text
# DO — fixtures committed alongside the lint, one per scope-restriction predicate
.claude/audit-fixtures/frontmatter-lint/
  fixture-01-real-rule.md / .expected     ← valid shape, expects empty output
  fixture-02-invalid-key.md / .expected   ← invalid opening-frontmatter key, expects flag
  fixture-03-body-example.md / .expected  ← invalid key in body fence, expects empty (block-scoping)

# DO NOT — only prose description in spec, no committed fixture
specs/lint-mechanism.md says "test with a stub file containing X..." (nothing on disk)
```

**BLOCKED responses:**

- "Synthetic fixtures are temp files; committing them is overhead"
- "The validation gate is described in the spec; fixtures duplicate that"
- "I'll add fixtures later when someone modifies the audit tool"
- "The audit tool is too simple to need fixtures"

**Why**: Mechanical audit tools have non-obvious scope-restriction predicates (block-scoping, glob anchoring, word boundaries) that future edits can silently weaken. Committed fixtures make those regressions mechanically detectable before the audit produces false positives at scale and gets disabled, restoring the original bug class.

Origin: workspace `cc-audit-lint-generalize` 2026-05-03; journal/0002-DISCOVERY (load-bearing `i==1` invariant), journal/0007-RISK (block-scoping erosion), /vet adversarial round M3.

### 5. Mechanical Sweeps Use Positive Allowlists Where Vocabulary Is Enumerable

When a mechanical audit sweep (in `/cc-audit`, `/sweep`, or a hook) checks for membership in an enumerable vocabulary, the sweep MUST be implemented as a positive allowlist (flag everything not in the allowlist) rather than an enumerated denylist (flag only specific known-bad entries).

```text
# DO — positive allowlist (catches unknown bad entries)
awk '... /^[A-Za-z][A-Za-z0-9-]*:/ && !/^paths:/' .claude/rules/*.md
# Flags any YAML-style key in opening frontmatter except paths:.
# Catches any future typo (pathRegex:, applies_to:, match:, etc.)
# without enumerating each one.

# DO NOT — enumerated denylist (catches only specifically known bad entries)
awk '... /^(globs|applies_to|pathRegex|match|scope):/ ...' .claude/rules/*.md
# Catches exactly the keys someone has thought of. Misses every novel
# typo until it appears, gets diagnosed, gets added to the list, and
# the list is re-shipped.
```

**BLOCKED responses:**

- "Denylist is more conservative; allowlist might false-positive"
- "We don't know all the valid keys yet; can't write an allowlist"
- "The denylist works fine; just add new entries when bugs appear"
- "Allowlist requires more thought; denylist is faster to ship"

**Why**: A denylist scales linearly with brainstormed typos and never closes the bug class — audit sweeps exist to catch silent failures, which by definition are "things that should be flagged but currently aren't." An allowlist closes the class on day one by documenting valid vocabulary upfront, which is small and one-time for enumerable vocabularies (frontmatter keys, hook events, license names).

**Scope clarification**: Applies only when the vocabulary IS enumerable; for non-enumerable vocabularies (free-form prose, user content) a denylist or pattern match may be the only option — guidance, not a separate MUST.

Origin: workspace `cc-audit-lint-generalize` 2026-05-03; journal/0006-TRADE-OFF (allowlist vs denylist trade-off); journal/0003-CONNECTION (enforcement-ladder level-3 strengthening).

### 6. Workspace-Walking Hooks Filter Leading-Underscore Meta-Dirs

Hooks that enumerate `workspaces/<name>/` MUST filter out directories whose name starts with an underscore (`_archive`, `_template`, `_draft`, and any future meta-dir). The same filter MUST apply in every `for ... of entries` loop that walks the workspaces directory, not just the active-workspace detector.

```javascript
// DO — skip leading-underscore meta-dirs
const projects = entries.filter(
  (e) => e.isDirectory() && !e.name.startsWith("_"),
);

// DO NOT — walk unfiltered (lets `_archive`, `_template` surface as active)
const projects = entries.filter((e) => e.isDirectory());
```

**BLOCKED responses:**

- "`_archive` is rarely the most-recent dir, so the bug is theoretical"
- "We'll add the filter when someone actually hits the failure mode"
- "The hook only runs at session start, so the blast radius is small"
- "Operators can just rename `_archive` to something without an underscore"

**Why**: An archival move (`mv workspaces/<project> workspaces/_archive/<project>`) bumps `_archive/`'s mtime to most-recent, so a most-recently-modified scan surfaces `_archive` as active and routes session-end stubs into `workspaces/_archive/...` — silent drift. Leading-underscore is atelier's documented meta-dir convention (CLAUDE.md: phase commands skip `_archive/` and `_template/`); filtering by prefix keeps the contract durable as new conventions emerge.

Origin: inbound from loom workspace-walking-hook fix (2026-05-02) — an archival move of several workspaces into `_archive/` caused session-end stubs to land in `workspaces/_archive/`; codified here because atelier owns the `_archive/`/`_template/` convention CLAUDE.md documents.

## MUST NOT Rules

### 1. No Semantic Analysis in Hooks

Hooks MUST NOT attempt to understand code meaning via regex. Hooks check structure; agents check semantics.

```javascript
// DO — hook checks structure (a path, a count, a file's existence)
if (filePath.endsWith(".claude/learning/posture.json")) return flag();

// DO NOT — hook tries to judge code meaning via regex
if (/insecure|unsafe|bad practice/.test(fileContents)) return flag();
```

**Why**: Regex-based semantic analysis is brittle and produces false positives.

**Permitted exception**: `pre-compact.js` may use regex for STRUCTURAL tagging of checkpoint data (e.g., shapes of recently-modified files) to preserve context across a compaction — never for agent decision-making. The hook never routes, classifies intent, or changes behavior on what the regex matches; it only records structural markers so the post-compaction session can re-anchor. This is permitted because structural tagging is the same class of operation the rule allows hooks generally (checking a path, a count, a file shape) — it observes structure, it does not judge meaning.

### 2. No Distribution-Only Artifacts in Source Repos (and vice versa)

Distribution-target artifacts MUST NOT carry source-/authoring-repo-only artifacts, and source repos MUST NOT carry consumer-only artifacts; each wastes context in the other.

```markdown
# DO — each tier carries only the artifacts its own consumers reference

distribution target → only artifacts its consumers invoke; source repo → only its authoring-only process artifacts.

# DO NOT — cross-tier leakage in either direction

distribution target carries an authoring-only process rule (wasted downstream); source repo carries a consumer-only deployment artifact (wasted upstream).
```

**Why**: A source-/authoring-only artifact wastes context in a distribution target where it has no referent, and a consumer-only artifact wastes context in the source repo where it is never invoked — each tier should carry only the artifacts its own consumers reference.

Codegen-specific BUILD/USE specifics live in `co-codegen/.claude/rules/build-vs-use.md`.

### 3. No Dangling Cross-References After Extraction

When extracting reference material from agents/commands to skills, MUST verify all cross-references in the trimmed file still point to existing files. When removing skills/agents from a repo, MUST grep for references in remaining files and update them.

```
# DO: After removing skills/10-governance/ from a consumer repo
grep -r "10-governance" <repo>/.claude/agents/  # Find references
# Update each reference to point to existing alternative

# DO NOT: Remove a skill directory without checking for references
rm -rf skills/10-governance/  # Leaves dangling refs in agent files
```

**Why**: Dangling references cause file-not-found errors when agents try to load referenced skills, degrading agent performance.

## Cross-References

- `.claude/rules/cc-artifacts.md` — the companion authoring-limits rule (size caps, DO/DO NOT examples, rationale, `paths:` frontmatter); this file carries the enforcement/audit half of the original ruleset.
- `.claude/rules/rule-authoring.md` — the Loud/Linguistic/Layered meta-rule MUST §3 enforces.
- `.claude/skills/cc-artifact-patterns/` and `.claude/agents/claude-code-architect.md` — the CC architecture patterns and the specialist MUST §1 deploys at `/codify`.
