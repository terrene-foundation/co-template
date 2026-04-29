---
paths:
  - ".claude/**"
---

# No Placeholders or Incomplete Content

Origin: atelier commit 6b1b157 — placeholder-propagation risk specific to atelier's role as canonical reference for downstream domains.

## Scope

These rules apply to ALL canonical artifacts in atelier — agents, skills, rules, commands, hooks, CLAUDE.md, README.md, and any artifact destined for `.claude/`.

**Exception**: Working drafts in `workspaces/` are excluded. Workspaces are explicitly in-progress; placeholder content is normal there until the work converges.

## MUST Rules

### 1. No Placeholder Markers in Canonical Artifacts

Canonical artifacts (anything in `.claude/`) MUST NOT contain:

```markdown
# DO:

"Phase 04 (Vet) produces a spec-coverage report at `04-vet/.spec-coverage`."

# DO NOT:

"Phase 04 produces [TODO: describe the report format]."
"This section will be completed later."
"[INSERT EXAMPLE HERE]"
```

- `[TODO]`, `[TBD]`, `[INSERT HERE]`, `[FIXME]` markers left as final content
- Empty sections with only headers and no substance
- "This section will be completed later" without a tracking reference
- Lorem ipsum or generic placeholder text

**Why**: Canonical artifacts are loaded by Claude on every relevant turn. Placeholder content forces Claude to interpret incomplete instructions probabilistically, which produces inconsistent behavior. Atelier is the canonical reference for downstream domains — placeholders propagate to every domain on next sync.

**Note**: `TODO` markers ARE acceptable in `workspaces/` directories during active drafting. They MUST be tracked and resolved before the artifact is promoted from a workspace into `.claude/` (this happens at `/vet` convergence and `/codify` approval).

### 2. No Vague Assertions

Canonical artifacts MUST NOT contain:

```markdown
# DO:

"This rule prevents the failure mode documented in journal entry NNNN where rule X loaded globally and consumed ~1,300 tokens per turn unnecessarily."

# DO NOT:

"This is best practice."
"As per the standard process."
"Better than existing solutions."
```

- Claims without supporting rationale or citation
- References to undefined processes ("As per the standard process")
- Unsubstantiated comparisons ("Better than existing solutions")
- Vague invocations of "best practice" or "industry standard"

**Why**: Vague assertions are unverifiable and uneducational. Claude cannot apply the spirit of a rule when the rule is "do the right thing" — it needs the specific failure mode being prevented. The `**Why:**` line in cc-artifacts.md exists for exactly this reason.

### 3. Complete What You Start

When creating a canonical artifact section:

- If a clause is referenced, it MUST exist
- If a process is described, it MUST be complete enough to follow
- If a comparison is made, it MUST cite specifics
- If an example is shown, it MUST be runnable or directly applicable

```markdown
# DO:

"See `rules/cc-artifacts.md` MUST §8 — every /codify execution MUST include claude-code-architect."

# DO NOT:

"See the relevant rule in cc-artifacts." (unspecific)
"As described in the cc-artifacts standards." (which standards? where?)
```

**Why**: Dangling references are a known failure mode (forge Report 06 anti-pattern: "Dead cross-reference"). When Claude encounters a reference it cannot resolve, it fabricates a plausible interpretation, which propagates errors.

## MUST NOT Rules

### 1. No Dangling Cross-References

MUST NOT reference an artifact, rule, skill, agent, or file path that does not exist on disk.

**Why**: Dangling cross-references force Claude to fabricate replacements, which corrupts downstream behavior. `/vet` Step 5 (cross-reference integrity sweep) catches these — but they should not exist in the first place.

### 2. No Empty Frontmatter Fields

MUST NOT leave frontmatter fields with empty values or `null` placeholders in canonical artifacts:

```yaml
# DO NOT:
---
description: ""
paths: []
---
```

If a field has no value, omit the field entirely. Empty fields signal "I started but didn't finish."

**Why**: Empty fields confuse Claude's frontmatter parsing and indicate unfinished work that may or may not be intentional.

## How `/vet` Enforces This

`/vet` Step 5 (cross-reference integrity sweep) and `/vet` Step 2 (CC artifact compliance audit via `claude-code-architect`) catch most violations of this rule. `/vet` MUST refuse to converge if any canonical artifact in the promotion set contains a placeholder marker, dangling reference, or empty frontmatter field.
