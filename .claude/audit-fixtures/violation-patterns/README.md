# Violation-Patterns Detector Fixtures

Test fixtures for the structural detectors in `.claude/hooks/lib/violation-patterns.js` (run by `.claude/hooks/detect-violations.js` on `PostToolUse`). There is one directory per exported detector, named exactly as the export.

Each fixture is an input file (`<name>.txt`) paired with a `<name>.expected` file giving the detector's expected return value. An empty `.expected` means the detector MUST return `null` (no finding); a non-empty `.expected` is the compact JSON of the returned `{type, detail, severity}` object.

## Running the fixtures

```bash
node .claude/audit-fixtures/violation-patterns/run-fixtures.js
```

`run-fixtures.js` loads the real detector module, replays every `.txt` through the matching detector, and compares the return value to the paired `.expected`. It prints `PASS`/`FAIL` per fixture and exits non-zero on any mismatch. Input decoding follows each detector's signature: `detectRepoScopeDrift` is called with the command plus a fixed project dir (`/Users/esperie/repos/atelier`) so the sibling-repo prefix check is deterministic; the other command/prompt detectors take the `.txt` as their single string argument; `detectFalseCommitClaim` receives the `.txt` parsed as a JSON tool-input object.

## Detectors and fixtures

| Detector (export)            | Input shape         | Fixtures (positive / negative / skip)                                                                                                           |
| ---------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `detectRepoScopeDrift`       | bash command string | `flag-sibling-repo-write` / `clean-in-scope-write`, `clean-read-only-sibling` / `skip-shell-variable`, `skip-command-substitution`              |
| `detectDestructiveBash`      | bash command string | `flag-rm-rf-abs-path`, `flag-reset-hard-no-porcelain` / `clean-reset-hard-with-porcelain`, `clean-benign-command` / `skip-rm-rf-shell-variable` |
| `detectTimePressureShortcut` | prompt text         | `flag-skip-tests` / `clean-no-pressure`                                                                                                         |
| `detectSweepSubstitution`    | prompt text         | `flag-just-lint` / `clean-full-sweep`                                                                                                           |
| `detectFalseCommitClaim`     | tool-input JSON     | `stub-overclaiming-commit`, `stub-faithful-commit` (both expect `null`)                                                                         |

### Notes on specific detectors

- **`detectRepoScopeDrift`** and **`detectDestructiveBash`** are command-string detectors, so each ships a `skip-*` fixture proving an unexpanded shell variable / command substitution returns `null` — the Rule 3 enforcement from `rules/hook-output-discipline.md` MUST §4 (a detector MUST NOT guess at a pre-expansion shell value).
- **`detectFalseCommitClaim`** is a no-op stub by design: judging whether a commit message over-claims its diff is a SEMANTIC property, adjudicated by agents at a gate review, not by regex in a hook (`rules/cc-enforcement.md` MUST NOT §1). Both fixtures therefore expect `null`. If a future change wires real logic into this detector, these `.expected` files MUST be updated to match the new contract and the stub fixtures replaced with genuine positive/negative cases.

## Why this directory exists

Per `rules/cc-enforcement.md` MUST §4 (Audit Tools Ship With Committed Test Fixtures) and `rules/hook-output-discipline.md` MUST §4 (Detectors MUST Ship With Committed Audit Fixtures). Each detector relies on non-obvious scope-restriction predicates — the write-verb gate and sibling-repo prefix check (`detectRepoScopeDrift`), the porcelain-ordering check (`detectDestructiveBash`), the lexical advisory spans (`detectTimePressureShortcut`, `detectSweepSubstitution`), and the unexpanded-shell-variable skip shared by the command-string detectors. A future contributor modifying `violation-patterns.js` MUST re-run `run-fixtures.js` and confirm all pass before committing, so a silent weakening of any predicate (which would re-open the false-positive or missed-detection class) is caught mechanically.

## Origin

Red-team finding M11/F5 (atelier 1.5.0): no detector in `violation-patterns.js` shipped a committed audit fixture, leaving the predicates above unguarded against regression. These fixtures map one-to-one onto the detectors enumerated in `module.exports` of `.claude/hooks/lib/violation-patterns.js`.
