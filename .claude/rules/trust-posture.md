---
paths:
  - "**/.claude/rules/**"
  - "**/.claude/skills/**"
  - "**/.claude/agents/**"
  - "**/.claude/commands/**"
  - "**/.claude/hooks/**"
  - "**/.claude/learning/**"
  - "**/.claude/settings.json"
---

# Trust Posture Rules

Origin: inbound sync from atelier (item-7 hook-cluster propagation, GH #15) — lifts the L1–L5 graduated-autonomy ladder from loom rules/trust-posture.md, adapted for atelier (loom hook/crypto machinery rewired to atelier's substrate — `posture.json` + `detect-violations.js` + `permissions.deny`; phase names remapped to CO v1.2; loom's state-resolver/worktree isolation, named loom-rule triggers, the 8-field wiring template, and per-session receipts dropped). Companion to the `/autonomize` command — `/autonomize` adopts the autonomous posture for a session; THIS rule defines the trust ceiling that posture operates under and how that ceiling moves.

## Scope

These rules apply whenever the agent acts under a self-governing autonomy posture in any CO workflow — every phase, every domain (research, governance, education, finance, codegen). The agent's autonomy is bounded by a per-repo posture recorded in `.claude/learning/posture.json` (level `L1`–`L5`, default `L3`). Grounded in CARE's Evolutionary Trust principle — _"boundaries evolve based on demonstrated performance"_ — and EATP's graduated postures, which upgrade through demonstrated performance and downgrade instantly when conditions change (`skills/co-reference/SKILL.md` § CARE → CO Connection, "Evolutionary Trust → Layer 5"; § CO → EATP Connection, "Trust Postures → approval gates"). Trust is validated against observable execution, not promised behavior.

## Posture Ladder (L1 ← L5)

| Posture                        | Agent CAN do unilaterally                                                                                | Requires human gate                                                                                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **L5_DELEGATED**               | Full execution (`/analyze`, `/execute`, `/vet`); draft + codify-proposal extraction; parallel delegation | Per-proposal `/codify` approval + `/deliver` sign-off (structural gates, posture-invariant); cross-repo writes; destructive ops; multi-target downstream sync |
| **L4_TRUSTED**                 | Same as L5                                                                                               | Everything L5 gates, PLUS: posture upgrade; multi-target `/deliver`; and a journal entry per shard + `/vet` Round 1 are mandatory before `/codify`            |
| **L3_COLLABORATIVE** (default) | Draft artifacts; run `/vet`; one workspace shard at a time                                               | `/plan` approval before `/execute`; promotion to `.claude/`                                                                                                   |
| **L2_SUPERVISED**              | Read; propose drafts; run mechanical sweeps                                                              | Every Edit/Write; every commit; every non-read Bash                                                                                                           |
| **L1_OBSERVED**                | Propose plans + drafts in chat only                                                                      | Everything that touches the working tree                                                                                                                      |

## Enforcement Status (engine live — GH #16 landed)

This rule has two layers: a **behavioral contract** (what the agent MUST/MUST NOT do — live every session) and an **enforcement engine** (the mechanical layer that converts violations into posture changes — live). This section states what the engine mechanically does so the rule neither over- nor under-claims (`rules/no-stubs.md` MUST §2).

- **Recording:** `detect-violations.js` (via `lib/posture.js`) records each detected violation to `violations.jsonl` and mirrors it into `posture.json`. The engine (`lib/posture.js`, invoked by hooks or via its gate CLI) is the **sole** posture-state writer.
- **Lexical hits stay advisory:** every shipped detector emits `severity: "warn"`, which the engine EXCLUDES from downgrade counting — consistent with `rules/probe-driven-verification.md` MUST §4 (a lexical match cannot, by itself, move trust). The probe verdict at the gate is what counts.
- **Cumulative downgrade (live):** `/cc-audit` step 15 records each probe verdict via `node .claude/hooks/lib/posture.js adjudicate --ts <ts> --verdict confirmed|retired --probe <id> --by <gate>`; the engine annotates the entry with the structural `adjudicated:` marker and counts probe-CONFIRMED entries toward MUST §2's cumulative thresholds (one-level drop; entries consumed by a downgrade never count twice).
- **Emergency downgrade (live):** a `regression_within_grace` recording drops one level instantly (MUST §3, wired in `detect-violations.js`); a confirmation carrying `--emergency destructive-op-unconfirmed|secret-leak|cross-repo-write-unauthorized` drops straight to `L1`.
- **Banner + pruning (live):** `session-start.js` injects the posture banner (level, since, 30-day counts, active grace windows) into session context and prunes the `posture.json` mirror to the 30-day window. `violations.jsonl` — the durable audit log — is never pruned.
- **Bash-write block (live):** `validate-bash-command.js` (`detectProtectedStateWrite`) denies write-shaped Bash commands targeting either state file AND interpreter inline-eval commands referencing the state surface, closing the loopholes MUST NOT §1 names; Edit/Write/MultiEdit remain denied by `settings.json` `permissions.deny`. The deny is lexical (see MUST NOT §1 for the honest scope). Engine fixtures: `.claude/audit-fixtures/posture-engine/run-fixtures.js`.

## MUST Rules

### 1. Downgrades Are Automatic; Upgrades Need an Explicit Human Challenge Gate

The asymmetry is load-bearing: the machine MAY lower its own trust ceiling, but ONLY a human may raise it. Downgrades are machine-applied by the engine (`lib/posture.js`, fed by `detect-violations.js` recordings and gate-recorded probe verdicts) with no human in the loop, per EATP "downgrade instantly when conditions change" (see § Enforcement Status — probe-confirmed verdicts, grace regressions, and emergency classes drive the machine-applied paths; raw lexical hits stay advisory). Upgrades require an explicit human challenge gate (a human-issued posture upgrade with a confirmation the agent cannot self-issue). The agent self-promoting its posture is BLOCKED.

```markdown
# DO — detection downgrades; only a human upgrades

`detect-violations.js` records a violation → posture drops one level, no approval.
Upgrade: human reviews the demonstrated correction and issues the challenge gate.

# DO NOT — agent raises its own ceiling

"I've been compliant for a while, promoting myself L3 → L4." (self-promotion)
"No violations this session, so I'll restore L5." (no human challenge gate)
```

**BLOCKED responses:**

- "I've demonstrated performance, I can upgrade myself"
- "The downgrade was overcautious, I'll undo it"
- "No human is around; I'll restore the prior level to keep working"

**Why:** An agent that can self-promote has no upper bound on rationalization — every relaxation looks justified from inside the loop. Making downgrade automatic and upgrade human-only means the system can always tighten itself but can never loosen itself, so a degraded posture is a fact the agent must work back from, not a setting it can reset.

### 2. Downgrade Triggers — Cumulative and Emergency

`detect-violations.js` runs agnostic detectors and records each hit to `.claude/learning/violations.jsonl`. Two downgrade paths:

**Cumulative (graceful):** 3× same-rule violations in a 30-day window → drop one level. 5× total violations in a 30-day window → drop one level.

**Emergency (instant):** a single critical event drops the posture immediately — a `regression_within_grace` hit (violating a rule still inside its grace window, MUST §3) drops one level; a destructive op without confirmation, a secret leak, or a cross-repo write outside scope drops to `L1`.

```markdown
# DO — emergency trigger fires instantly

A rule landed 2 days ago is violated → `regression_within_grace` → drop one level now,
not "1 of 3 cumulative, still fine."

# DO NOT — route an emergency through the cumulative count

"That's only the first occurrence, the cumulative threshold is 3." (a grace regression
is emergency-class — the cumulative path does not apply)
```

**Why:** Cumulative thresholds tolerate noise; emergency triggers reflect events whose single occurrence IS the worst-case failure. Routing an emergency through the cumulative count lets the agent rationalize "still under the threshold" while the exact failure the trigger names has already happened.

### 3. Freshly Codified Rules Get a Grace Period With Teeth

When `/codify` lands a rule that addresses a detected or self-reported violation, that rule enters a grace window (default 7 days) recorded against `posture.json`. During grace, `detect-violations.js` runs the rule's detector in halt-and-report severity (not observer-only), and a violation of it fires `regression_within_grace` → emergency downgrade (MUST §2). The grace window MUST NOT be treated as a soft warmup during which the new rule is advisory.

```markdown
# DO — new rule has immediate teeth

`/codify` lands a cross-reference-integrity rule. Within the grace window the agent
ships a dangling reference → `regression_within_grace` → instant one-level drop.

# DO NOT — treat grace as a grace-from-enforcement

"The rule is new, it's still bedding in, this violation doesn't really count yet."
```

**Why:** A rule the agent just authored to fix itself and then violates within days is the loudest possible signal the rule needs enforcement, not leniency. The grace window inverts the intuitive reading: it is the period of MAXIMUM enforcement for a fresh rule, because a regression there proves the codification did not take.

## MUST NOT Rules

### 1. The Agent MUST NOT Self-Modify Its Own Trust State

The agent MUST NOT edit `.claude/learning/posture.json` or `.claude/learning/violations.jsonl` via Edit, Write, MultiEdit, or Bash. The engine (`lib/posture.js`, invoked by the hooks or via its gate CLI) is their only legitimate writer. Enforcement is split: Edit/Write/MultiEdit are mechanically blocked by `settings.json` `permissions.deny`; Bash-path writes are denied by `validate-bash-command.js`'s `detectProtectedStateWrite` (PreToolUse; fixtures under `audit-fixtures/validate-bash-command/`) for write-SHAPED commands (`rm`, shell redirection, `tee`, `sed -i`, `mv`, `truncate`, `cp`-as-dest, `dd of=`) AND interpreter inline-eval commands referencing the state surface. The deny is lexical, so a sufficiently obfuscated mutation path may evade it — such a write stays prohibited by this rule, is probe-adjudicable (`probe:protected-state-write`), and a confirmed instance is emergency-class. Deleting, truncating, or hand-editing either file to clear a violation or raise the level is BLOCKED regardless of mechanism.

```markdown
# DO — let the hooks own the state

The agent reads `posture.json` to know its ceiling; the hooks write it.

# DO NOT — rewrite the state to escape a downgrade

`Edit posture.json` to set `"level": "L5"` (blocked by `permissions.deny`);
`Write` a fresh empty violations file (blocked by `permissions.deny`);
`rm violations.jsonl` / `echo {} > posture.json` (Bash path — denied at PreToolUse by
`validate-bash-command.js`; the attempt itself is a probe-adjudicable violation).
```

**Why:** State self-modification is the single loophole that defeats the entire system — an agent that can rewrite its own trust record can grant itself any ceiling and erase any evidence. `permissions.deny` makes the Edit/Write/MultiEdit path structurally unreachable; the Bash path is denied by `validate-bash-command.js` (GH #16, landed). The engine being the sole writer means every legitimate state change has a traceable, agent-external cause.

### 2. Posture State MUST NOT Sync Between Repos

The agent MUST NOT carry `posture.json` or `violations.jsonl` across repos via `/sync`, `/sync-to-coc`, or any distribution path. Trust state is per-repo. Rule patterns (the institutional knowledge) sync through `/codify`; the trust ledger stays local.

```markdown
# DO — insight syncs, state stays

A new violation-detector pattern is codified and synced downstream. Each repo's
own `posture.json` records that repo's own trust history.

# DO NOT — propagate a degraded ledger downstream

`/sync` copies atelier's `violations.jsonl` into co-template. (A fresh domain repo
inherits atelier's downgrade history it never earned.)
```

**Why:** A downstream repo inheriting another repo's degraded ledger would start trust-poisoned for violations it never committed — and a USE template carrying a degraded posture corrupts every repo built from it. Per-repo state keeps the ladder a measurement of THIS repo's demonstrated performance, which is the only thing CARE's Evolutionary Trust principle lets it measure.

## Cross-References

- `.claude/commands/autonomize.md` — adopts the autonomous posture for a session; this rule sets the ceiling that posture runs under.
- `.claude/rules/autonomous-execution.md` — the capacity model and structural-vs-execution gate distinction the posture ladder presupposes.
- `.claude/hooks/detect-violations.js` (agnostic detectors + grace escalation), `.claude/hooks/session-start.js` (posture banner + mirror pruning), `.claude/hooks/lib/posture.js` (the engine + gate CLI), `.claude/hooks/validate-bash-command.js` (Bash-path state-write deny), `.claude/audit-fixtures/posture-engine/` (engine fixtures), `.claude/learning/posture.json` + `violations.jsonl` (the state surface), `.claude/settings.json` `permissions.deny` (the no-self-modify enforcement).
