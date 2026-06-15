# /codify Integration — Wiring a Rule into the Trust Loop

> **Implementation status (read first).** Every step below is LIVE (GH #16, landed — `rules/trust-posture.md` § Enforcement Status): violation recording, the grace registration in Step 4 (via the engine CLI, announced by the session-start banner), the `regression_within_grace` emergency drop, and probe-confirmed cumulative downgrade are all mechanical, pinned by `.claude/audit-fixtures/posture-engine/run-fixtures.js`. The `## Trust Posture Wiring` authoring step (Steps 1–3, 5) remains a `/codify` authoring + gate-validation obligation as before.

`/codify` MUST consult this file whenever it authors or amends a rule. Without the integration step, a rule ships as prose with no enforcement and the trust system degrades to un-instrumented documentation.

## Mandatory step at /codify

After pattern extraction and before emitting the proposal, `/codify` performs this step for each candidate rule in the cycle.

### Step: Trust Posture Wiring (MUST)

1. **Read** `.claude/learning/violations.jsonl` for the trailing 30 days (via `lib/posture.js`). Find logged violations whose root cause matches the candidate rule and that no existing rule already addresses.

2. **Link** the addressed violations to the new rule. The link is recorded in the rule's `## Trust Posture Wiring` section under "Originating violation" (the `vio_` id, or the `ts`-keyed line). `violations.jsonl` is append-only and is never rewritten — the linkage lives in the rule's frontmatter/wiring, not by mutating the log line.

3. **Author** the rule's `## Trust Posture Wiring` section using the canonical format in `rule-authoring-checklist.md`. The section MUST carry all eight fields: severity, grace period, cumulative threshold, regression-within-grace policy, receipt requirement, detection mechanism (naming which atelier hook/detector fires), originating violation, and evidence date.

4. **Register** the grace window via the engine CLI (never by hand-editing the denied file):

   ```bash
   node .claude/hooks/lib/posture.js grace --rule <rule-file> --type <detector-type> [--days 7]
   ```

   This appends a `grace[]` entry `{rule, type, until, set_at}` to `posture.json`. The window starts now; the `session-start.js` posture banner lists the rule until it graduates, and a matching detector hit inside the window fires `regression_within_grace` → instant one-level drop (see `grace-period-mechanics.md`).

5. **Emit** the proposal to the `/codify` proposal surface per `rules/artifact-flow.md`. The proposal entry for the rule MUST include the `## Trust Posture Wiring` section **verbatim** — the validation pass greps the proposal for it. A proposal whose new rule lacks the section is rejected at the gate.

## Detection-mechanism binding

When authoring the "Detection mechanism" field, name the specific atelier hook that will fire, so the wiring is verifiable rather than aspirational:

- a pre-execution block on a command → `validate-bash-command.js`
- a guarded write to a protected path → the edit/write guard (`journal-write-guard.js` for journal/state surfaces)
- a post-tool structural or behavioral shape check → `detect-violations.js`
- an end-of-message self-confession scan → NO hook implements this (`stop.js` writes session notes only; excluded from the GH #16 engine scope) — a rule needing it must say so and rely on gate review until a `/codify` proposal wires one

A rule whose detection mechanism names no real hook, or names "lexical regex" as the basis for an automatic downgrade, fails the wiring contract — automatic downgrades MUST rest on a structural or behavioral signal.

## What is grandfathered

Rules that pre-date the trust system do NOT require retroactive wiring. New `/codify` cycles wire only NEW rules. The single legitimate exception to "every new rule is wired" is the bootstrap rule — the first rule authored under the system itself, which could not follow a step that did not yet exist when it shipped. Every subsequent cycle MUST wire.

## How /codify discovers existing pending verifications

`/codify` reads the current grace list through the engine before authoring, so it does not re-author a rule that is already in grace and does not double-count a violation already linked to an in-grace rule:

```bash
node .claude/hooks/lib/posture.js status   # prints level, grace[], and 30-day counts
```

## Integration with the validation pass

`claude-code-architect` is the validation pass at `/codify`. For every new rule in the proposal it MUST confirm the literal string `## Trust Posture Wiring` is present and that all eight fields are filled. A missing section or an empty field is an audit failure that halts `/codify` until the wiring is added — the same gate that the consumer-walk discipline applies to every other prose deliverable (the rule's wiring is part of what makes the rule followable).
