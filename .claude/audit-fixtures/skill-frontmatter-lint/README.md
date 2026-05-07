# Skill Frontmatter Lint Fixtures

Test fixtures for the skill frontmatter lint at `commands/cc-audit.md` Phase 1 Step 5 (per `rules/cc-artifacts.md` MUST §11).

## Allowlist Source

Per the canonical CC docs at https://code.claude.com/docs/en/skills §"Frontmatter reference" — the 15 documented skill frontmatter keys: `name`, `description`, `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `model`, `effort`, `context`, `agent`, `hooks`, `paths`, `shell`. When CC docs change, update the allowlist regex in `commands/cc-audit.md` and the fixtures here in the same commit.

## Fixtures

| Fixture | Predicate | Expected output |
|---------|-----------|-----------------|
| `fixture-01-valid-keys.md` | All keys in allowlist | empty |
| `fixture-02-invalid-triggers.md` | `triggers:` (undocumented) in opening block | flag line 4 |
| `fixture-03-body-yaml-example.md` | Wrong key in fenced YAML body example (block-scoping) | empty |
| `fixture-04-empty-frontmatter.md` | No opening `---` block | empty |

## Self-Test

```bash
cd .claude/audit-fixtures/skill-frontmatter-lint
for f in fixture-*.md; do
  expected="${f%.md}.expected"
  actual=$(awk 'FNR==1{i=0} /^---$/{i++; next} i==1 && /^[A-Za-z_][A-Za-z0-9_-]*:/ && !/^(name|description|when_to_use|argument-hint|arguments|disable-model-invocation|user-invocable|allowed-tools|model|effort|context|agent|hooks|paths|shell):/{print FILENAME":"FNR":"$0}' "$f")
  if [ "$actual" = "$(cat "$expected")" ]; then echo "PASS $f"; else echo "FAIL $f"; diff <(echo "$actual") "$expected"; fi
done
```

Expected: 4 PASS lines.

## Bug-As-Fixture-Input Policy

`fixture-02-invalid-triggers.md` uses the actual wrong-key the lint encountered in the wild (5 co-education skill files as of 2026-05-06). Origin: GH atelier#8.
