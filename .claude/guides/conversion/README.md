# CLI to Plugin Conversion Guide

How to convert between Claude Code CLI format (`.claude/`) and Cowork Plugin format (`plugin/`) using the `co-convert` tool.

## Guides

| Guide | Purpose |
|-------|---------|
| [01 - The Two Formats](01-the-two-formats.md) | What CLI and Plugin formats are, how they differ, and why both exist |
| [02 - Using co-convert](02-using-co-convert.md) | How to use the conversion script for each direction |
| [03 - Reference Transformation](03-reference-transformation.md) | How command references (`/analyze` vs `/name:analyze`) are transformed |

## Quick Reference

```bash
# See what you have
scripts/co-convert.sh status

# Convert CLI to Plugin
scripts/co-convert.sh to-plugin --name co-legal --force

# Convert Plugin to CLI
scripts/co-convert.sh to-cli --force

# Preview changes first
scripts/co-convert.sh to-plugin --dry-run

# See what's out of sync
scripts/co-convert.sh diff
```

## When to Use

- **Setting up a new plugin**: After building your CO in Claude Code, run `to-plugin` to generate the Cowork plugin
- **Pulling plugin changes into CLI**: After editing skills in the plugin, run `to-cli` to sync back
- **Checking sync state**: Run `diff` to see what's diverged between formats
- **Renaming your plugin**: Run `to-plugin --name new-name --force` to regenerate with the new prefix
