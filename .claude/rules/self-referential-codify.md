---
paths:
  - ".claude/**"
---

# Self-Referential Codify Rules

Origin: inbound sync from atelier (item-7 hook-cluster propagation, GH #15) — the self-referential-codify
gate, roster-genericized for a downstream domain repo (atelier's concrete `/vet` roster and self-ref
allowlist paths substituted for the local repo's; see § Roster substitution and § The allowlist).

## Scope

These rules apply during the **codify** phase of any CO workflow. A `/codify` is **self-referential** when
its proposal touches the artifacts that GOVERN codification itself — the phase commands, the rules
constraining artifact quality and trust posture, the skills backing them, and the hooks enforcing them. On
those surfaces the agent authors constraints on its own next behavior, so a single-pass shipment can
silently propagate a defect into every future session that loads the artifact. Rule 4 additionally governs
the landing gate of any workspace whose human-scoped deliverables are canonical `.claude/` artifacts.

## Roster substitution (read first — this is a synced rule)

The reviewer names below are atelier's concrete roster. THIS repo substitutes its own: map each named
agent to a local agent with the matching capability, and where no local equivalent exists, the team
degrades to the confirmed-present reviewers, naming the reduced team explicitly. The **floor** in every
repo is `claude-code-architect` + `gold-standards-validator` (the two present in every CO repo). A bare
unresolved agent name is BLOCKED — resolve it to a local agent or to an explicit degradation line.

## MUST Rules

### 1. Self-Referential /codify MUST Run the Full Multi-Agent /vet Regardless of Posture

When a `/codify` proposal touches ANY file matching the Rule 2 allowlist, the orchestrator MUST run the
full multi-agent `/vet` team before landing — EVEN at `L5` posture, where the posture-default review depth
would otherwise be a mechanical light pass. The team is the full local self-referential roster (atelier:
`claude-code-architect`, `gold-standards-validator`, `intermediate-reviewer`, `co-expert`; THIS repo
substitutes per § Roster substitution — at minimum the two-reviewer floor, plus any local equivalents of
`intermediate-reviewer` / `co-expert` it ships). The agents run in parallel and each reports
independently; sequential single-agent review does NOT satisfy the requirement.

Each team member MUST receive the proposal AND its receipt-journal entry AND the originating evidence.
Cross-agent disagreement on a CRIT/HIGH finding MUST be resolved by construction against the contract,
never by averaging severities.

```markdown
# DO — self-ref surface touched → full local vet team in parallel before land

Surface: .claude/rules/trust-posture.md (allowlist match)
Team (parallel): the local self-referential roster (floor + any local equivalents)
Each receives: proposal + receipt journal + originating evidence
Land proceeds only when 0 genuine CRIT/HIGH across all reviewers

# DO NOT — surface touched, posture L5, ship with the mechanical light pass

Surface: an allowlisted rule, posture L5 → skip the team, land with the light review
```

**BLOCKED responses:**

- "Posture is L5, the light pass is the default — the self-ref surface needs no deeper review"
- "The codify is small (one line), the full vet is overkill"
- "I am the orchestrator, I reviewed it as I drafted it"
- "Sequential review by one specialist after another is equivalent"
- "A local equivalent is missing, so I'll skip that reviewer" (degrade to the named floor, do not skip silently)

**Why:** A defect in a self-referential artifact is load-bearing for every session that loads it — one slip
costs N future sessions. The full local `/vet` team is the structural defense; a light pass or single-agent
review re-introduces the blind spot the gate closes.

### 2. The Self-Referential Surface Is a Positive Allowlist

The surface MUST be a positive allowlist (flag everything not in it), NOT a denylist. New files added under
a category the allowlist enumerates MUST be added to the allowlist in the SAME `/codify` that lands them —
an undeclared new self-referential file is BLOCKED.

THIS repo enumerates its own load-bearing paths under each category (atelier's specific paths do not
transplant — populate locally at landing):

- **Commands** governing codify-class behavior (e.g. `codify`, `sync`, `cc-audit`, `sweep`).
- **Rules** constraining artifact quality + trust posture (e.g. `cc-artifacts`, `cc-enforcement`,
  `rule-authoring`, `no-stubs`, `self-referential-codify`, `trust-posture`, `hook-output-discipline`,
  `probe-driven-verification`).
- **Skills** backing them (e.g. `cc-artifact-patterns`, `command-authoring`, `hook-authoring`,
  `skill-authoring`, `trust-posture`).
- **Hooks** — `.claude/hooks/**`, the enforcement substrate; a regression silently weakens or hard-blocks
  enforcement.
- **Gate contracts** — `.claude/audit-fixtures/violation-patterns/probes.md` and the runner/fixture sets
  (present only where step-15 adjudication is wired); an edit silently changes which lexical hits a gate
  retires versus confirms.

```markdown
# DO — new codify-governing rule added to the allowlist in the codify that lands it

/codify lands a new rule governing codify-class behavior → same proposal adds it to the Rules line

# DO NOT — defer the allowlist entry to a later codify (undeclared self-ref file ships ungated)
```

**Why:** A positive allowlist closes the class on day one and surfaces drift loudly — every new
self-referential file is either declared (gate covers it) or undeclared (this rule fires on the codify
trying to ship it). One extra `/vet` round is bounded; a silently-ungated self-referential edit is not.

### 3. Bootstrap-Circularity Carve-Out Is One-Time-Per-Rule

The `/codify` that AUTHORS this rule (or any future meta-rule about codify discipline) IS itself
self-referential under Rule 1. Running the gate on the codify that authors the gate is circular. The
carve-out: the FIRST codify that lands such a meta-rule MAY ship under the prevailing posture default, and
MUST declare this in its receipt journal under a "Bootstrap-circularity disposition" section. One-time-
per-rule; full-gate enforcement starts at the NEXT self-referential codify, NOT the next session.

```markdown
# DO — first codify of this rule ships as observer, declared in the receipt
# DO NOT — every future self-referential codify cites bootstrap-circularity to skip (BLOCKED)
```

**Why:** Without the one-time constraint, "bootstrap circularity" becomes a rubber stamp every
self-referential codify cites to skip the gate.

### 4. Canonical-Deliverable Workspaces Land at /vet Convergence + the Delivery PR

When a workspace's deliverables ARE canonical `.claude/` artifacts — a HUMAN-AUTHORIZED written scope (the
approved `/plan` task list, the brief, or an operator-scoped issue the plan adopts by reference) identifies
the canonical work product, and `/execute` drafts those artifacts in place — those deliverables land at
`/vet` convergence (the full local team on any Rule 2 match, per Rule 1) plus the delivery PR. The gate
record MUST quote the adopted items verbatim at adoption time and record the item→file mapping. A post-hoc,
agent-authored file list never surfaced to the human does NOT qualify. A separate per-proposal `/codify`
cycle for the SAME deliverables is NOT required — the vetted artifact already IS the canonical artifact.
The workspace's `05-codify/` MUST record the disposition explicitly ("N/A for deliverable promotion —
landing gate = /vet convergence + PR <n>; trail swept for liftable patterns: <N | none>"); a silent skip
is BLOCKED. The carve-out waives deliverable promotion ONLY: the trail-extraction walk still runs.

The carve-out does NOT cover: **(a)** knowledge-lifting workspaces (per-item selection → normal
per-proposal path); **(b)** patterns discovered OUTSIDE the human-authorized deliverable set (each needs
its own proposal); **(c)** grace-window registration for a landed rule (runs regardless).

```markdown
# DO — engine-build workspace: the deliverables ARE the canonical hooks/rules; PR + /vet convergence land them
# DO NOT — knowledge-lifting workspace lands 6 journal patterns citing "the PR is the gate" (each needs approval)
```

**Why:** Re-running per-proposal promotion on deliverables the full team already converged on is
double-processing with no added gate value. The human-authorization and recorded-disposition guards keep
the carve-out from swallowing the gate it sits inside.

## MUST NOT Rules

### 1. No Narrowing the `paths:` Glob to the Allowlist

The `paths: .claude/**` glob LOADS this rule on any `.claude/` edit; the Rule 2 allowlist is what the gate
FIRES on. MUST NOT narrow the glob to the allowlist — that drops the rule's load on a new sibling surface
and re-opens the load-order gap.

```markdown
# DO — keep the broad load glob; let the allowlist scope the firing
# DO NOT — tighten the glob to the allowlisted paths (rule never loads on a new sibling file)
```

**Why:** Over-broad loading is fail-safe — an in-context rule that does not fire costs only its token load.
Narrowing trades that cheap safety for a silent gap.

## Trust Posture Wiring

- **Severity:** `halt-and-report` at the `/codify` gate — the CC-architecture reviewer surfaces the
  violation at proposal validation. Advisory at the hook layer if a self-referential detector later lands.
- **Posture state:** read from `.claude/learning/posture.json` (default `L3`). The gate is
  posture-INVARIANT: it fires the full local `/vet` team at every level, including `L5`.
- **Regression record:** a self-referential `/codify` that lands without the full `/vet` is recorded to
  `.claude/learning/violations.jsonl`. `session-start.js` surfaces it in the banner. **In a repo that has
  wired `/cc-audit` step-15 adjudication (full enforcement), a probe-CONFIRMED verdict additionally counts
  toward the cumulative downgrade thresholds, and a regression inside a rule's grace window fires
  `regression_within_grace` → instant one-level drop. A hooks-only/advisory repo runs recording +
  surfacing + deny-protection only — no auto-downgrade — until step 15 is wired (see `LANDING.md` § upgrade
  path).** The agent cannot hand-edit either state file (Edit/Write/MultiEdit blocked by `permissions.deny`;
  Bash-path writes denied by `validate-bash-command.js`).
- **Detection:** MANUAL — the `/codify` orchestrator reads the Rule 2 allowlist, checks the proposal's file
  list, and dispatches the full local `/vet` team on any match.

## Cross-References

- **Extends** `rules/cc-enforcement.md` MUST §1 (every `/codify` deploys the CC-architecture reviewer) —
  this rule adds the rest of the local team on the self-referential subset.
- **Pairs with** `rules/trust-posture.md` — that rule defines posture-downgrade math; this rule's
  regression record feeds its trigger list.
