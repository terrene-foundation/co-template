# Grace Period Mechanics

> **Implementation status (read first).** The grace engine is LIVE (GH #16, landed — `rules/trust-posture.md` § Enforcement Status): grace registration via the posture CLI, the session-start grace banner, detector escalation during the window, `regression_within_grace` → instant one-level drop, and expiry-based graduation are all mechanical, pinned by `.claude/audit-fixtures/posture-engine/run-fixtures.js` (scenarios 11, 13, 17). Two designed refinements were deliberately excluded from the GH #16 engine build (issue re-scope trail, 2026-06-10) and remain UNBUILT: the `[ack: <rule_id>]` receipt token and the stale-record read-time check (the pre-rule "all-clear" skepticism injection). Wiring either requires a new `/codify` proposal.

When `/codify` lands a rule that addresses a logged violation, the rule does NOT take full teeth immediately. It enters a **grace window** — an entry in `posture.json` `grace[]` (default 7 days), registered by `/codify`:

```bash
node .claude/hooks/lib/posture.js grace --rule <rule-file> --type <detector-type> [--days 7]
```

The `--type` is the `detect-violations.js` detector type the rule is wired to (e.g. `repo-scope-drift`). During grace that detector has heightened severity and an emergency-downgrade fast-path. When the clock expires with no further violation, the rule **graduates**: the entry is dropped at the next session-start prune and the standard probe-confirmed cumulative thresholds apply from then on.

## Lifecycle

```
/codify lands rule + registers grace        grace days elapse        rule "graduates"
       │                                          │                         │
   grace[] entry {rule, type, until}  ─────────────────────────────→  entry pruned
       │                                          │                         │
       ↓ the rule's detector type fires           ↓ no hit in window     probe-confirmed cumulative
       │  during the window                                              thresholds apply (3×/5×/30d)
   regression_within_grace  (recorded to violations.jsonl
       │                     at halt-and-report severity)
       ↓
   EMERGENCY DOWNGRADE (instant, one level — no cumulative routing)
```

## Detection escalation during grace

| Phase                              | Detector posture                                              | Severity at a hit                                          |
| ---------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| Outside grace (no window active)   | Advisory — records `severity: "warn"`, surfaces, never blocks | `warn`; trust-moving only via probe-confirmed adjudication |
| In-grace (inside an active window) | Escalated — `detect-violations.js` rewrites the finding       | `halt-and-report` as `regression_within_grace` → −1 level  |
| Post-grace (after graduation)      | Advisory again                                                | `warn`; probe-confirmed cumulative thresholds apply        |

## session-start.js behavior during grace

While any `grace[]` entry is active, the `[TRUST-POSTURE]` banner (injected into `additionalContext` and printed to stderr) lists every window:

```
[TRUST-POSTURE] L3 — 4 violation(s) in last 30d (2 awaiting probe adjudication, 1 confirmed,
1 retired) | grace windows: repo-scope-drift (rule rules/example-fresh.md, until 2026-06-12)
```

A domain example: a newly codified research rule — "every quantitative claim cites a primary source before the section is declared complete" — enters grace for 7 days, keyed to its detector type. For those 7 days the banner announces it, and any matching hit `detect-violations.js` catches drops the posture one level instead of merely being recorded for later adjudication.

## Regression within grace — emergency downgrade

A violation of a rule that is STILL in its grace window is the loudest signal the system has: the agent broke a rule it just codified, against its own freshly recorded evidence. `detect-violations.js` records the event as `type: "regression_within_grace"` (with `grace_rule` naming the rule and the original detector type in the detail) at `halt-and-report` severity, and the engine applies an **emergency downgrade of one level** immediately — not a count toward the cumulative threshold. The hook simultaneously injects a loud `[halt-and-report]` context note: the agent MUST report the regression and the posture drop to the user in that turn. The fast-path exists because a same-cycle regression is qualitatively worse than an unrelated lapse: the rule's cause is on disk and the banner fired this session.

If two grace-window rules regress in the same session, the downgrades stack (two records → two drops). Escalation beyond one level (e.g. straight to L1) is reserved for the emergency CLASSES the engine recognizes at adjudication (`--emergency destructive-op-unconfirmed|secret-leak|cross-repo-write-unauthorized`).

## Graduation (promotion)

After the window elapses with zero hits, the next `session-start.js` prune REMOVES the expired entry (`activeGraceFor()` already returns null the moment `until` passes — expiry is effective immediately, the prune is bookkeeping). The rule is now permanent: probe-confirmed cumulative thresholds apply, no banner line fires, the detector stays active at advisory severity. Graduation is automatic — there is no human gate. The rule earned its place by being honored through its probation.

## Repeal (rule rollback)

If a rule generates repeated false positives during grace, `/codify` MAY author a follow-up rule that scopes down or repeals the original. A repealed rule does NOT graduate — re-register or let the window lapse as appropriate, and record the repeal in the rule's frontmatter (`repealed_at: <ts>` — an authoring convention for the audit trail; no mechanical check reads it) so the record shows the rule existed and why it was withdrawn — `violations.jsonl` is never rewritten.

## Multi-rule coordination

Several `grace[]` entries at once is normal; the banner lists them all. Windows are keyed by detector `type`, so a regression on one window downgrades for that window alone. Two rules sharing one detector type share one escalation (register the entry under the rule that motivated it; the regression detail names the type either way).

## Grace-period selection

The default is 7 days (standard for a newly codified rule). Two overrides (`--days`):

- **0 days** — there is no observer window to grant: a foundational rule that must have teeth from day one should rely on its hard enforcement layer instead (the way the posture state files are protected by `permissions.deny` + the Bash-write deny, not by a grace entry). Registering a 0-day window is a no-op (already expired).
- **30 days** — for a rule whose compliance requires a large surface migration the agent cannot complete in one window.

See `rule-authoring-checklist.md` for how the grace period is recorded in a rule's wiring, and `codify-integration.md` for the `/codify` step that registers the window.
