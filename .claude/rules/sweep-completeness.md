---
paths:
  - ".claude/commands/sweep.md"
  - ".claude/commands/vet.md"
  - ".claude/commands/codify.md"
  - ".claude/commands/cc-audit.md"
  - ".claude/commands/wrapup.md"
  - ".claude/skills/co-reference/**"
  - "**/04-vet/**"
  - "**/sweep-*.md"
---

# Sweep / Multi-Step Protocol Completeness Rules

Origin: inbound sync from loom 2026-06-05 — lifts the substitution-gate pattern from loom rules/sweep-completeness.md, adapted for atelier (vendor/codegen specifics stripped, phase names remapped to CO v1.2).

## Scope

These rules apply whenever a skill, command, or rule prescribes a multi-step protocol — `/sweep`, `/vet`, `/codify`, `/cc-audit`, or any workspace audit — and the agent judges one step too expensive to run inline. They apply to ALL domains: a research audit, a governance compliance pass, an education review, or a methodology sweep all face the same temptation to swap an expensive mandated step for a cheap proxy.

The substitution decision is the trigger. The human is the gate.

## MUST Rules

### 1. Substitution Decision Triggers a Human Gate

When the agent identifies a mandated step as too expensive to run inline AND the skill/command/rule does not explicitly authorize the substitution, the agent MUST stop and surface to the human: WHICH step is being skipped, WHY (cost / time / "needs a separate trigger"), WHAT proxy is being considered, WHAT coverage is lost, and ASK: skip / substitute / run-full-step / different-approach.

```markdown
# DO — surface the substitution decision

The `/vet` spec-coverage step says "verify each deliverable fulfills its
brief point-by-point." That is a full adversarial read (~15 min). I'm
considering substituting a cross-reference check (~1s) that confirms every
cited section resolves — it does NOT verify the deliverable actually
covers what the brief specified. Skip / substitute / run full step /
different approach?

# DO NOT — silent substitution

[runs the cheap cross-reference check, reports it as the spec-coverage
result, declares the workspace clean]
```

**BLOCKED responses:**

- "Yesterday's sweep substituted this step too, so today's can"
- "The cheap check came back green, that's evidence enough"
- "The expensive step needs a trigger we don't have right now"
- "Asking the human is bureaucracy; I'll just proceed"

**Why:** Substitution feels efficient and stays invisible until someone asks "what did you actually check?" By then the report has shipped, the next session inherits its framing as truth, and the coverage gap silently widens. Appeal to precedent does not authorize today's substitution — yesterday's skip was its own failure.

### 2. Proxy Output MUST Be Labeled, Never Relabeled

If the agent substitutes a cheap proxy after human-gated approval, the proxy's output MUST be labeled with the proxy's own name in the report — never as the mandated step's result.

```markdown
# DO — proxy labeled by its own name

Spec coverage: cross-reference check passed (substituted for the full
point-by-point read, per user approval). Full coverage NOT verified.

# DO NOT — proxy relabeled as the mandated result

Spec coverage: clean.
```

**Why:** A reader of the audit report cannot tell, from the second form, that the mandated step never ran. The agent's substitution becomes invisible institutional knowledge that the next session and every downstream consumer inherit as a verified result.

### 3. Skill / Command Text Tightening Is the Long-Term Fix

When a skill or command repeatedly produces substitution decisions, the skill text itself is the leverage point. The agent MUST propose a `/codify` change that either (a) tightens the prose step into a single executable check — a verifier, a coverage checker, a schema-validator the agent can run in one call — or (b) explicitly authorizes the substitution with named bounds. This rule is run-time defense; an executable, mechanically-backed step is design-time defense. Both layers are needed.

```markdown
# DO — propose the design-time fix

The `/sweep` "sync currency" step keeps getting substituted because the
prose says "manually confirm each downstream target is current." Propose a
/codify that replaces it with one executable currency check, or that
explicitly scopes which targets a light sweep may skip.

# DO NOT — re-litigate the same gate every cycle

[surfaces the same substitution decision on every sweep, never proposes
tightening the underlying skill text]
```

**Why:** A rule that fires every cycle signals that the structural defense is wrong. Recurring substitutions need design-time tooling so the gate stops firing — otherwise the run-time gate erodes through sheer repetition until the agent stops surfacing it.

## MUST NOT Rules

### 1. No Silent Substitution

MUST NOT substitute a cheaper check for a mandated multi-step protocol step without surfacing the decision to the human first.

```markdown
# DO — surface the substitution before swapping

"The point-by-point coverage read is expensive; I'm considering a cheap
cross-reference proxy that loses coverage. Skip / substitute / run full / other?"

# DO NOT — swap silently

[runs the cheap proxy, reports it as the coverage result, declares clean]
```

**Why:** This is the originating failure mode — invisible to readers, propagating as institutional drift across sessions and downstream domains.

### 2. No Precedent-Based Authorization

MUST NOT cite "an earlier sweep did the same" as authorization for today's substitution.

```markdown
# DO — re-surface the decision each time

"This step is expensive again; surfacing the substitution for a fresh human call."

# DO NOT — lean on precedent

"Yesterday's sweep substituted this step, so today's can too."
```

**Why:** The earlier substitution was its own undetected failure; treating it as precedent compounds the gap instead of closing it.

### 3. No Relabeling the Proxy as the Mandated Result

MUST NOT report a proxy's output under the name of the mandated step it replaced.

```markdown
# DO — label the proxy by its own name

"Spec coverage: cross-reference proxy passed (full read NOT run). Coverage unverified."

# DO NOT — relabel the proxy as the mandated result

"Spec coverage: clean."
```

**Why:** Relabeling removes the audit trail that lets the next reader know the mandated step did not run, converting a known shortcut into hidden, unrecoverable institutional knowledge.

## Distinct Trigger

This rule blocks procedure drops triggered by the **agent's own cost calculus** ("the expensive step needs a trigger we don't have"). That is a different trigger from a procedure drop driven by **user pressure framing** ("speed up", "the deadline is looming"), which `rules/time-pressure-discipline.md` guards. The two overlap in defense but fire on different inputs — the agent can rationalize a substitution from either direction, so both must be guarded. This rule is `rules/time-pressure-discipline.md`'s sister, not its duplicate.
