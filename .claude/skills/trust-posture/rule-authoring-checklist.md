# Rule Authoring Checklist — the "Trust Posture Wiring" Section

> **Implementation status (read first).** The engine each field configures is LIVE (GH #16, landed — `rules/trust-posture.md` § Enforcement Status): violation recording, the grace lifecycle with teeth (`regression_within_grace` → instant one-level drop), probe-confirmed cumulative downgrade, the `session-start.js` posture/grace banner, the deny + exit-2 path for the destructive/journal/bash guards (`validate-bash-command.js`, `destructive-op-guard.js`, `journal-write-guard.js`), and the hard Bash-write block on the posture-state files. ONE field remains an authoring decision with no mechanical enforcer: the `[ack: <rule_id>]` receipt token (and the `stop.js`-class `post-mortem` scan it pairs with) was deliberately excluded from the GH #16 engine build (issue re-scope trail, 2026-06-10); wiring it mechanically requires a new `/codify` proposal.

Every rule authored by `/codify` after the trust system is live MUST end with a `## Trust Posture Wiring` section in the canonical format below. The section is what connects a prose rule to the machine-tracked trust loop; a rule without it ships as un-instrumented prose. The `claude-code-architect` validation pass at `/codify` rejects any proposal whose new rule lacks the section or omits a field.

## Canonical Format

```markdown
## Trust Posture Wiring

- **Severity:** halt-and-report
- **Grace period:** 7 days
- **Cumulative threshold:** 3× same-rule violations in 30d → 1 level downgrade
- **Regression-within-grace policy:** emergency downgrade (1 level)
- **Receipt requirement:** No (rule is behavioral, detected at runtime)
- **Detection mechanism:** structural — `detect-violations.js` checks for a "complete"/"delivered" claim with no walk receipt recorded in the same turn
- **Originating violation:** vio_1717592400_a3f
- **Evidence date:** 2026-06-05
```

## Field Reference

### Severity (one of)

- `block` — pre-tool only; the action is physically prevented before it runs. Reserved for destructive + irreversible operations (`validate-bash-command.js` catches the command before execution). LIVE for the destructive/journal/bash guards AND the posture-state files: `rm`/redirect/`tee`/`sed -i`-class commands naming `posture.json`/`violations.jsonl` are denied at PreToolUse (`detectProtectedStateWrite`), and Edit/Write/MultiEdit are blocked by `settings.json` `permissions.deny`. (The deny emits `severity: "halt-and-report"`, never the `block` label, because the detection is lexical — `rules/hook-output-discipline.md` MUST §2.)
- `halt-and-report` — the action already executed and a policy was violated; the agent must surface it and wait. The default for most policy rules.
- `advisory` — a soft warning; the agent acknowledges and may proceed.
- `post-mortem` — a detection only possible in the agent's final message; forensic only. NO mechanical detector exists (`stop.js` writes session notes, it does not scan — excluded from the GH #16 engine scope); this severity currently rests on gate review.

### Grace period (integer days)

- `0` — teeth-from-day-one; reserved for foundational, broad-consensus rules (e.g. the rule protecting the posture state files).
- `7` — standard for a newly codified rule.
- `30` — a rule whose compliance needs a large surface migration before it can be honored.

### Cumulative threshold

Default `3× same-rule in 30d → 1 level downgrade`. Override only if a single occurrence is severe enough to warrant an emergency downgrade (e.g. a secret leak, an unconfirmed destructive op).

### Regression-within-grace policy

- `emergency downgrade (1 level)` — the default; a loud signal that the agent violated a rule it just authored.
- `emergency downgrade to L1` — for a rule guarding a critical failure mode (secret leak, irreversible destructive op).
- `cumulative only` — explicitly disables the within-grace fast-path; rare, requires justification.

### Receipt requirement

- `Yes` — the rule asks for `[ack: <rule_id>]` in the agent's first response while the rule is in grace. Reserve for high-stakes rules where evidence shows the agent ignores the grace banner. NOTE: no mechanical enforcer exists (excluded from the GH #16 engine scope) — `Yes` is a behavioral obligation checked at gate review until a `/codify` proposal wires it.
- `No` — the rule is detected at runtime; a receipt would add friction without benefit.

### Detection mechanism

A concrete predicate naming WHICH atelier detector fires and HOW. Classify it:

- **structural** — a non-semantic shape check (a required section present, a token present, a count matching) run by `detect-violations.js`.
- **behavioral** — a cross-reference of state (an edit to a denied path, a publish without a prior approval turn) caught by the relevant hook (`validate-bash-command.js` for commands, `journal-write-guard.js` for protected writes, `detect-violations.js` for post-tool shape checks).
- **lexical** — a regex over text. Lexical alone may back only `advisory` or `post-mortem` severity. An automatic downgrade MUST rest on a structural or behavioral signal, never a lexical guess — `detect-violations.js` runs agnostic structural/behavioral detectors only (per `rules/cc-enforcement.md` MUST NOT §1), never semantic regex that tries to infer meaning.
- **human-only** — no automated detection exists; the rule relies on review. Severity caps at `advisory`.

### Originating violation

The `vio_` id (or the `ts`-keyed line) in `violations.jsonl` that motivated the rule, or `null` if the rule is preventive (authored before any violation occurred).

### Evidence date

The ISO date of the session or incident that motivated the rule. Required so `git log --grep` and the journal can trace the rule back to its cause.

## Worked Example (domain-neutral)

A governance workflow logs a violation: the agent closed a tracked, value-bearing item as "out of scope" without the required user gate. `/codify` authors a rule and wires it:

```markdown
## Trust Posture Wiring

- **Severity:** halt-and-report
- **Grace period:** 7 days
- **Cumulative threshold:** 3× same-rule violations in 30d → 1 level downgrade
- **Regression-within-grace policy:** emergency downgrade (1 level)
- **Receipt requirement:** Yes — `[ack: closure-gate/MUST-1]`
- **Detection mechanism:** behavioral — `detect-violations.js` flags a tracked-item state change to "closed/not-planned" with no user-approval turn in the same session
- **Originating violation:** vio_1717592400_a3f
- **Evidence date:** 2026-06-05
```

## Worked Example (a foundational, teeth-from-day-one rule)

The rule protecting the posture state files themselves — preventive, so no originating violation:

```markdown
## Trust Posture Wiring

- **Severity:** block
- **Grace period:** 0 (foundational; teeth-from-day-one)
- **Cumulative threshold:** 1× attempt = 1 level downgrade
- **Regression-within-grace policy:** N/A (no grace)
- **Receipt requirement:** Yes — `[ack: trust-posture/MUST-1]`
- **Detection mechanism:** behavioral — `validate-bash-command.js` + the edit/write guard block any mutation targeting `.claude/learning/(posture.json|violations.jsonl)`
- **Originating violation:** null (preventive)
- **Evidence date:** 2026-06-05
```
