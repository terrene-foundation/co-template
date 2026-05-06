# Frontmatter Lint Fixtures

Test fixtures for the rule-frontmatter silent-failure lint at `.claude/commands/cc-audit.md` Phase 1 Step 5. The four fixtures correspond to the four /vet validation gates from `workspaces/cc-audit-lint-generalize` 2026-05-03 (V1–V4).

Each fixture is paired with a `.expected` file giving the expected output when the lint runs against the fixture. Empty `.expected` means empty stdout.

## Running the fixtures

```bash
LINT='awk "FNR==1{i=0} /^---\$/{i++; next} i==1 && /^[A-Za-z_][A-Za-z0-9_-]*:/ && !/^paths:/{print FILENAME\":\"FNR\":\"\$0}"'
for f in fixture-*.md; do
  expected="${f%.md}.expected"
  actual=$(eval $LINT "$f")
  if [ "$actual" = "$(cat "$expected")" ]; then echo "PASS $f"; else echo "FAIL $f"; diff <(echo "$actual") "$expected"; fi
done
```

## Fixtures

| Fixture                           | Gate           | Expected behaviour                                                     |
| --------------------------------- | -------------- | ---------------------------------------------------------------------- |
| `fixture-01-paths-only.md`        | V3             | Valid `paths:`-only frontmatter. Empty output expected.                |
| `fixture-02-invalid-keys.md`      | V2             | Invalid keys in opening frontmatter; in-body `globs:` example. 2 hits. |
| `fixture-03-globs-historical.md`  | V4             | Original 2026-04-07 bug shape: `globs:` in opening frontmatter. 1 hit. |
| `fixture-04-empty-frontmatter.md` | (V1 corollary) | No opening `---` block (global rule). Empty output expected.           |

V1 (real-corpus zero-hit) is not a fixture — it runs against the live `.claude/rules/*.md` corpus.

## Why this directory exists

Per `.claude/rules/cc-artifacts.md` MUST §11 (Audit Tools Ship With Committed Test Fixtures). A future contributor modifying the lint MUST re-run these fixtures and confirm pass before committing. This is the load-bearing safety mechanism for the `i==1` block-scoping invariant — see `journal/0002-DISCOVERY` and `journal/0007-RISK` in the originating workspace.

## Origin

Workspace: `workspaces/cc-audit-lint-generalize/` (the workspace that introduced both this lint and the rule mandating its fixtures). Original V1–V4 prose specifications: `workspaces/cc-audit-lint-generalize/specs/lint-mechanism.md §4`.
