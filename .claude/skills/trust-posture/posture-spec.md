# Posture State Specifications

Data shapes for the graduated-trust state, plus the autonomy each level grants. The state files live in `<repo-root>/.claude/learning/` and are read and written by `lib/posture.js` — the ENGINE — invoked by the hooks (`detect-violations.js`, `session-start.js`) or via its gate CLI (the sole writer). `permissions.deny` in `.claude/settings.json` blocks the Edit/Write/MultiEdit paths and `validate-bash-command.js` (`detectProtectedStateWrite`) denies Bash-path writes, so the agent cannot hand-edit its own trust state.

> **Implementation status (read first).** The enforcement engine is LIVE (GH #16, landed — `rules/trust-posture.md` § Enforcement Status); the shapes below are the IMPLEMENTED on-disk shapes, pinned by `.claude/audit-fixtures/posture-engine/run-fixtures.js`. Two designed components were deliberately excluded from the GH #16 engine build (issue re-scope trail, 2026-06-10) and have NO mechanical implementation: the `stop.js` self-confession scan (and with it the `acknowledgement_failure` event type) and the `[ack: <rule_id>]` receipt token. Either requires a new `/codify` proposal to wire.

## posture.json

The current trust state. One object.

```json
{
  "level": "L3",
  "since": "2026-06-05T00:00:00.000Z",
  "violations": [
    {
      "ts": "2026-06-05T14:22:00.000Z",
      "type": "repo-scope-drift",
      "detail": "write/mutate command targets sibling-repo path ...",
      "severity": "warn"
    }
  ],
  "grace": [
    {
      "rule": "rules/example-fresh.md",
      "type": "repo-scope-drift",
      "until": "2026-06-12T14:30:00.000Z",
      "set_at": "2026-06-05T14:30:00.000Z"
    }
  ]
}
```

### Field semantics

- `level` — the current trust level; the STORED value is the bare form `L1` / `L2` / `L3` / `L4` / `L5` (the `L1_OBSERVED`..`L5_DELEGATED` forms in `rules/trust-posture.md`'s ladder table are descriptive row labels, never stored values). **Default is `L3`** for a repo with no earned history (also the fail-safe when the file is absent or corrupt — fail-SAFE, not fail-closed).
- `since` — ISO-8601 timestamp of the last transition into the current level. Used to report "N days at this level."
- `violations[]` — the rolling MIRROR of `violations.jsonl` entries (same shape, including any `adjudicated:` / `counted_in_downgrade:` markers), plus `type: "downgrade"` marker entries recording each level drop and its reason. `session-start.js` prunes this mirror to the trailing 30-day window — the same window the cumulative thresholds count over. The jsonl, not the mirror, is the counting source; the mirror exists so the state file is self-describing.
- `grace[]` — rules currently inside their grace window (see `grace-period-mechanics.md`). Each entry: `rule` (the rule file), `type` (the detector type the window escalates), `until` (ISO expiry), `set_at`. Registered by `/codify` via `node .claude/hooks/lib/posture.js grace --rule <rule-file> --type <detector-type> [--days 7]`; expired entries are dropped at the next session-start prune.

### Validation invariants (`lib/posture.js` enforces)

- `level` MUST be one of the five valid levels; anything else normalizes to `L3` on read and write.
- Absent, empty, or malformed `posture.json` reads as the fail-safe default `{level: "L3", since: null, violations: [], grace: []}` — a garbled state file never locks the session into L1 and never breaks a session (every library write path swallows errors).
- Writes are atomic (tmp-file + rename) and always normalize the full four-field shape — unknown fields do not survive a write.

## violations.jsonl

The append-only audit log. One JSON object per line. The engine appends violation entries and — at gate adjudication — annotates an existing entry with the structural `adjudicated:` marker (the only in-place mutation; violation records themselves are never removed or rewritten, and the log is NEVER pruned).

```json
{
  "ts": "2026-06-05T14:22:00.000Z",
  "type": "repo-scope-drift",
  "detail": "write/mutate command targets sibling-repo path ...",
  "severity": "warn",
  "adjudicated": {
    "verdict": "confirmed",
    "probe": "probe:repo-scope-drift",
    "by": "cc-audit-step15",
    "at": "2026-06-08T10:00:00.000Z"
  },
  "counted_in_downgrade": "2026-06-08T10:00:01.000Z"
}
```

### Field semantics

- `ts` — ISO-8601 timestamp when the detector fired. The adjudication CLI keys on this value.
- `type` — the detector type (`repo-scope-drift`, `destructive-bash`, ...), `regression_within_grace` (a hit on a detector type inside an active grace window — recorded by `detect-violations.js` with `grace_rule` naming the rule), or `downgrade` (mirror-only marker entries; the jsonl carries violations, not downgrade markers).
- `detail` — short human-readable description of what happened.
- `severity` — `warn` / `advisory` / `info` are ADVISORY (recorded, surfaced, never trust-moving on their own); `halt-and-report` and `critical` are non-advisory (the engine's emergency paths key on them). Per `rules/probe-driven-verification.md` MUST §4, every shipped lexical detector emits `warn`.
- `adjudicated` — the structural probe-verdict marker, written by the ENGINE when a gate records a verdict (`/cc-audit` step 15): `verdict` (`confirmed` | `retired`), `probe`, `by`, `at`, and optionally `emergency` (one of `destructive-op-unconfirmed` / `secret-leak` / `cross-repo-write-unauthorized` — drops straight to L1). `by` is never defaulted to a gate name: an adjudication that does not name its gate records `by: "unattributed"`, which is itself a review flag (provenance must come from the caller — step 15 always passes `--by cc-audit-step15`). An entry WITHOUT this field is "not yet adjudicated" — step 15's work queue is exactly that filter. Re-adjudication of a marked entry is refused; same-timestamp collisions resolve because adjudication matches the first UNADJUDICATED entry at that `ts`.
- `counted_in_downgrade` — set by the engine on every confirmed entry consumed by a cumulative downgrade, so no entry ever counts toward two downgrades.

## Enforcement thresholds (the engine's counting rules)

- Only entries with `adjudicated.verdict == "confirmed"`, not yet `counted_in_downgrade`, inside the trailing 30-day window count.
- `3×` same-type → one-level drop. `5×` total → one-level drop. Consumed entries are marked and retired from counting.
- Emergency paths bypass counting entirely: `regression_within_grace` (non-advisory) → one-level drop on record; an `adjudicated.emergency` class → straight to L1.
- Downgrades floor at L1. There is NO upgrade API — raising the level is a human act (edit by the operator, outside the agent's permitted surface), per `rules/trust-posture.md` MUST §1.

## Autonomy bounds per level

The level is a single value in `posture.json`; what it PERMITS is the table below. The bounds are **domain-agnostic** — a "unit of work" is one shard (one focused pass: a report section, a rule, a spec, a dataset slice), a "publish" is any push to a shared or consumer-facing surface, and a "destructive op" is any irreversible action (a delete, a force-overwrite, a release tag). The same ladder governs research, governance, education, finance, or codegen workflows.

| Level | Name          | Edits                                            | Publishing / commits                                 | Parallelism                          | Confirmation required for                        |
| ----- | ------------- | ------------------------------------------------ | ---------------------------------------------------- | ------------------------------------ | ------------------------------------------------ |
| L5    | Delegated     | Full; edit freely                                | Commit + open PR / publish without per-step prompt   | Multiple parallel shards             | Cross-repo writes, release tags, destructive ops |
| L4    | Trusted       | Full; edit freely                                | Same as L5, plus a `/vet` round before any merge     | Multiple parallel shards             | Same as L5, plus mandatory per-shard journaling  |
| L3    | Collaborative | Full within one shard                            | Publishing requires explicit instruction; commits OK | One shard at a time (no parallelism) | Plan approval per shard; any publish             |
| L2    | Supervised    | Each edit needs an instruction in the prior turn | No publishing; commits only on explicit instruction  | One shard at a time                  | Every mutation beyond read-only commands         |
| L1    | Observed      | None — propose diffs in chat only                | None — the human runs everything                     | None                                 | N/A — zero working-tree mutation                 |

Read the ladder top-down for what RELAXES as trust rises, bottom-up for what TIGHTENS as trust falls. The progression is monotone: every constraint at a higher level is also in force at every lower level, plus the lower level's own additional constraints.

### How a phase command reads the level

A phase command (e.g. `/execute`, `/vet`) does NOT parse `posture.json` itself. `session-start.js` prunes the mirror, reads the state via `lib/posture.js`, and injects the `[TRUST-POSTURE]` banner into the session's `additionalContext` (and stderr for the human): the level, `since`, the 30-day counts (total / awaiting adjudication / confirmed / retired), and every active grace window. A command that needs the live value mid-session reads it via `node .claude/hooks/lib/posture.js status`.

## File-system layout

```
<repo-root>/.claude/learning/
├── posture.json              # current state + 30-day mirror (denied to agent edits)
├── violations.jsonl          # append-only audit log, never pruned (denied to agent edits)
└── observations.jsonl        # existing accomplishments log (separate concern)
```

`permissions.deny` in `.claude/settings.json` blocks the Edit / Write / MultiEdit paths against `posture.json` and `violations.jsonl`; `validate-bash-command.js` denies write-shaped Bash commands (`rm`, `mv`, redirection, `tee`, `sed -i`, `truncate`, `cp`-as-dest, `dd of=`) naming either file — the attempt itself is a probe-adjudicable violation (`probe:protected-state-write`). The agent reads the state through `lib/posture.js`; it never writes it directly. Authoring those deny entries is the settings layer's job, not this skill's.
