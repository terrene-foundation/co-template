# validate-bash-command Hook Fixtures

Test fixtures for `.claude/hooks/validate-bash-command.js` (PreToolUse, Bash). The runner exercises the **real hook contract** — it spawns the hook as a child process, streams each fixture's bytes to stdin, and asserts on exit code + stdout, the exact surface the host consumes. No test seam is exported from the hook (per `rules/user-flow-validation.md` MUST §1: the consumer path is the test path).

## Running the fixtures

```bash
node .claude/audit-fixtures/validate-bash-command/run-fixtures.js
```

Each fixture is a raw stdin payload (`<name>.txt`) paired with `<name>.expected` — JSON of shape `{exit, stdout_contains: [...], stdout_not_contains: [...]}`. Fixture payloads pin `cwd` to `/tmp/gh16-vbc-fixture` so the hook's learning side-channel never writes into the repo.

## Fixtures and the predicates they pin

| Fixture                       | Predicate pinned                                                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `block-rm-root`               | `block: true` pattern → `emitHalt` shape (`permissionDecision: "deny"` + six-field `permissionDecisionReason` incl. `[halt-and-report]`) + exit 2                                                             |
| `block-fork-bomb`             | second `block: true` pattern class (function-definition shape, not a path pattern) → same deny + exit 2 contract                                                                                              |
| `block-rm-long-flags`         | `rm --recursive/--force` long-flag `block: true` pattern — pins the flag-spelling variant the short-flag fixture cannot                                                                                       |
| `advisory-curl-pipe-sh`       | `block: false` pattern → advisory via `hookSpecificOutput.additionalContext` (`[BASH-ADVISORY]` prefix), exit 0, NOT a deny — the block-vs-advise field discipline                                            |
| `advisory-wget-pipe-sh`       | second `block: false` pattern (`wget\|sh`) — pins the advisory class beyond a single regex                                                                                                                    |
| `allow-benign-command`        | no pattern match → allow, exit 0, no deny / advisory / halt marker in output                                                                                                                                  |
| `block-posture-redirect`      | trust-state hard block (GH #16 item 4): shell redirection into `posture.json` → deny + exit 2 (`rules/trust-posture.md` MUST NOT §1)                                                                          |
| `block-violations-rm`         | trust-state hard block: `rm` naming `violations.jsonl` → deny + exit 2 — the destructive-verb arm of `detectProtectedStateWrite`                                                                              |
| `block-posture-sed-inplace`   | trust-state hard block: `sed -i` naming `posture.json` → deny + exit 2 — the in-place-flag arm (a bare `sed` over the file stays allowed)                                                                     |
| `allow-posture-read`          | read-shaped commands over the state files (`cat`/`grep`) → allow, exit 0 — the write-shape predicate, not file-name presence, drives the deny                                                                 |
| `skip-posture-shell-variable` | `rm "$STATE_DIR/posture.json"` → allow: the token carries an unexpanded shell variable, so the detector SKIPS it (`rules/hook-output-discipline.md` MUST §3 — never re-expand)                                |
| `block-node-eval-statewrite`  | trust-state hard block, arm (0): interpreter inline-eval (`node -e`) referencing the state surface → deny + exit 2 — the evasion class with no shell write-verb shape                                         |
| `allow-engine-cli`            | the SANCTIONED engine CLI (`node .claude/hooks/lib/posture.js status` / `adjudicate --by cc-audit-step15`) → allow: file-path invocation, not inline eval — the gate's recording path is never denied         |
| `failopen-malformed-stdin`    | malformed (non-JSON) stdin → exit 0, never a deny — the uniform fail-open floor implemented by `lib/runtime.js`'s `withFailOpen` (no rule clause names this floor; the hook's header comment is its contract) |

The block fixtures carry dangerous-pattern strings (fork bomb, `rm` on root) as **data** — they are stdin payloads to the hook under test, never executed shell. Authoring note: write fixture content with the file-write tool, not via shell `printf`/heredoc — a Bash command whose text embeds these patterns trips the live hook itself (observed 2026-06-10; the lexical layer cannot distinguish data from command, which is precisely the false-positive class the probe layer adjudicates — see `../violation-patterns/probes.md`).

## Severity discipline

The hook's deny path emits `severity: "halt-and-report"`, not `block` — the detection is purely lexical, so per `rules/hook-output-discipline.md` MUST §2 it must not carry blocking severity language even though the PreToolUse mechanism denies the tool call pending user adjudication. Its probe-driven counterparts at the gate layer live in `../violation-patterns/probes.md` (per `rules/probe-driven-verification.md` MUST §4): the **destructive-op probe** for the dangerous-command patterns, and **probe:protected-state-write** for the trust-state deny arm (`detectProtectedStateWrite`).

## Why this directory exists

`rules/cc-enforcement.md` MUST §4: every mechanical audit tool ships committed fixtures per scope-restriction predicate. The hook's siblings in `lib/violation-patterns.js` got fixtures at 1.5.1 (commit 81c6949); this directory closes the same requirement for the one hook that hard-stops tool calls — where a silent regression is a user-blocked session, not a missed advisory. Origin: GH #16 (2026-06-10 sweep append).
