# CLI/Plugin Conversion

CO applications ship in two formats: Claude Code CLI (`.claude/`) and Cowork Plugin (`plugin/`). The `co-convert` tool automates conversion between them.

## The Two Formats

| Aspect | CLI (`.claude/`) | Plugin (`plugin/`) |
|--------|-------------------|--------------------|
| Runtime | Claude Code (terminal) | Claude Desktop Cowork |
| Commands | `.claude/commands/{name}.md` | `plugin/skills/{name}/SKILL.md` |
| Invocation | `/analyze` | `/plugin-name:analyze` |
| Agents | `.claude/agents/` | `plugin/agents/` (identical) |
| Rules | `.claude/rules/` | Not packaged |
| Hooks | Full support | Not available |
| Manifest | None | `.claude-plugin/plugin.json` |

## The Conversion Tool

**Location**: `scripts/co-convert.sh`

### Generate Plugin from CLI

```bash
scripts/co-convert.sh to-plugin --name co-legal --force
```

This converts commands to skills, copies agents, generates `plugin.json`, and generates `plugin/CLAUDE.md` — all with the correct skill prefix.

### Generate CLI from Plugin

```bash
scripts/co-convert.sh to-cli --force
```

This converts skills to commands, copies agents, and strips plugin prefixes from references.

### Check Sync State

```bash
scripts/co-convert.sh diff      # Show differences
scripts/co-convert.sh status    # Show what exists in each format
```

## What Gets Converted

| Component | Converted? | How |
|-----------|-----------|-----|
| Commands/Skills | Yes | File structure + reference transformation |
| Agents | Yes | Direct copy (identical content) |
| plugin.json | Generated | Created with defaults if missing |
| plugin/CLAUDE.md | Generated | Skills table, agents table, absolute directives |
| Rules | No | Plugin format doesn't support rules |
| Hooks | No | Cowork doesn't support hooks |
| Root CLAUDE.md | No | Maintained separately (too complex to auto-generate) |

## Reference Transformation

Command references are transformed automatically:

- **CLI to Plugin**: `/analyze` becomes `/co-legal:analyze`
- **Plugin to CLI**: `/co-legal:analyze` becomes `/analyze`
- **Rename**: `/co-template:analyze` becomes `/co-legal:analyze` (old prefix stripped, new prefix applied)

Use `--no-refs` to skip this transformation.

## Recommended Workflow

1. **Develop in CLI format** — `.claude/` is the source of truth (richer: rules, hooks, full CLAUDE.md)
2. **Convert to plugin** — Run `to-plugin` to generate the distribution format
3. **Test in Cowork** — Load `plugin/` folder in Claude Desktop
4. **Keep in sync** — Run `diff` to check, `to-plugin --force` to update

## Detailed Documentation

For comprehensive documentation, see the [Conversion Guide](../conversion/README.md):

- [01 - The Two Formats](../conversion/01-the-two-formats.md) — Detailed format comparison
- [02 - Using co-convert](../conversion/02-using-co-convert.md) — All commands and workflows
- [03 - Reference Transformation](../conversion/03-reference-transformation.md) — How references are matched and transformed
