# Agent Frontmatter Lint Fixtures

Test fixtures for the agent frontmatter lint at `commands/cc-audit.md` Phase 1 Step 5 (per `rules/cc-artifacts.md` MUST §11). Each fixture exercises one scope-restriction predicate.

## Allowlist Source

Per the canonical CC docs at https://code.claude.com/docs/en/sub-agents §"Supported frontmatter fields" — the 16 documented subagent frontmatter keys: `name`, `description`, `tools`, `disallowedTools`, `model`, `permissionMode`, `maxTurns`, `skills`, `mcpServers`, `hooks`, `memory`, `background`, `effort`, `isolation`, `color`, `initialPrompt`. When CC docs change, update the allowlist regex in `commands/cc-audit.md` and the fixtures here in the same commit.

## Fixtures

| Fixture                               | Predicate                                             | Expected output |
| ------------------------------------- | ----------------------------------------------------- | --------------- |
| `fixture-01-valid-keys.md`            | All keys in allowlist                                 | empty           |
| `fixture-02-invalid-allowed-tools.md` | `allowed-tools:` (skills key) in opening block        | flag line 4     |
| `fixture-03-body-yaml-example.md`     | Wrong key in fenced YAML body example (block-scoping) | empty           |
| `fixture-04-empty-frontmatter.md`     | No opening `---` block                                | empty           |

## Self-Test

```bash
cd .claude/audit-fixtures/agent-frontmatter-lint
for f in fixture-*.md; do
  expected="${f%.md}.expected"
  actual=$(awk 'FNR==1{i=0} /^---$/{i++; next} i==1 && /^[A-Za-z_][A-Za-z0-9_-]*:/ && !/^(name|description|tools|disallowedTools|model|permissionMode|maxTurns|skills|mcpServers|hooks|memory|background|effort|isolation|color|initialPrompt):/{print FILENAME":"FNR":"$0}' "$f")
  if [ "$actual" = "$(cat "$expected")" ]; then echo "PASS $f"; else echo "FAIL $f"; diff <(echo "$actual") "$expected"; fi
done
```

Expected: 4 PASS lines, 0 FAILs.

## Bug-As-Fixture-Input Policy

`fixture-02-invalid-allowed-tools.md` uses the actual wrong-key the lint encountered in the wild (1 atelier agent + 6 co-research agents as of 2026-05-06). Real bugs as fixture inputs means the fixture is simultaneously regression test AND documented case study of the wrong-key bug class.

Origin: GH atelier#8 (workspace `cc-audit-lint-extend-artifacts`, 2026-05-06).
