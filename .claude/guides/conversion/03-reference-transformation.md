# Reference Transformation

When converting between CLI and Plugin formats, command/skill references in content must be updated.

## The Problem

A command file might contain:

```markdown
After analysis, recommend `/plan` to create a structured plan.
```

In the plugin, this should become:

```markdown
After analysis, recommend `/co-legal:plan` to create a structured plan.
```

## How It Works

### CLI to Plugin (`to-plugin`)

The tool performs a two-step transformation:

1. **Strip existing prefixes** — Any `/old-name:command` becomes `/command`
2. **Add the correct prefix** — `/command` becomes `/new-name:command`

This handles three cases:
- Bare references: `/analyze` becomes `/co-legal:analyze`
- Already-prefixed (same name): `/co-legal:analyze` stays `/co-legal:analyze`
- Old prefix (renamed): `/co-template:analyze` becomes `/co-legal:analyze`

### Plugin to CLI (`to-cli`)

Single-step: strip all prefixes.

- `/co-legal:analyze` becomes `/analyze`
- `/any-prefix:analyze` becomes `/analyze`

## What Gets Matched

The tool detects all known command/skill names by scanning:
- `.claude/commands/*.md` (filenames become command names)
- `plugin/skills/*/SKILL.md` (directory names become skill names)

Only references to these known names are transformed. Other `/word` patterns are left unchanged.

## Matching Rules

A command reference is matched when:
- It starts with `/` followed by a known command name
- It is NOT preceded by a word character or colon (prevents partial matches)
- It is NOT followed by a lowercase letter, digit, underscore, or hyphen (prevents matching `/analyzing` when looking for `/analyze`)

**Matched:**
- `` `/analyze` `` (backtick-quoted)
- `| /analyze |` (in table)
- `/analyze something` (followed by space)
- `# /analyze $ARGUMENTS` (in heading)

**Not matched:**
- `/analyzing` (followed by letters — different word)
- `/re-analyze` (preceded by prefix — different word)

## Skipping Transformation

If you want to copy files without modifying references:

```bash
scripts/co-convert.sh to-plugin --no-refs
```

This is useful when:
- Your files already have the correct references
- You want to handle reference updates manually
- You're doing a partial conversion

## Technical Details

The transformation uses Perl regex for reliable matching:

```perl
# Strip prefix: /any-prefix:command -> /command
s/\/[\w][\w-]*:(start|analyze|plan|...)(?![a-z0-9_-])/\/$1/g

# Add prefix: /command -> /name:command
s/(?<![:\w])\/(start|analyze|plan|...)(?![a-z0-9_-])/\/name:$1/g
```

Perl is used instead of sed for:
- Negative lookbehind assertions (`(?<![:\w])`)
- Negative lookahead assertions (`(?![a-z0-9_-])`)
- Reliable handling of special characters in filenames
