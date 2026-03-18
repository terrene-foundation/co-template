# Using co-convert

The `co-convert` script automates conversion between CLI and Plugin formats.

**Location**: `scripts/co-convert.sh`

## Commands

### `to-plugin` — Generate Plugin from CLI

Converts `.claude/commands/` and `.claude/agents/` into `plugin/` format.

```bash
scripts/co-convert.sh to-plugin --name co-legal
```

**What it does:**
1. Copies each `.claude/commands/{name}.md` to `plugin/skills/{name}/SKILL.md`
2. Transforms command references: `/analyze` becomes `/co-legal:analyze`
3. Copies agents from `.claude/agents/` to `plugin/agents/`
4. Generates `plugin/.claude-plugin/plugin.json` (if missing)
5. Generates `plugin/CLAUDE.md` with skills table and agents table

**Options:**
- `--name NAME` — Plugin name (prefix for skills). Auto-detected from plugin.json if omitted.
- `--force` — Overwrite existing files
- `--dry-run` — Preview changes without writing
- `--no-refs` — Skip reference transformation (copy files as-is)

---

### `to-cli` — Generate CLI from Plugin

Converts `plugin/skills/` and `plugin/agents/` back to `.claude/` format.

```bash
scripts/co-convert.sh to-cli
```

**What it does:**
1. Copies each `plugin/skills/{name}/SKILL.md` to `.claude/commands/{name}.md`
2. Strips plugin prefix from references: `/co-legal:analyze` becomes `/analyze`
3. Copies agents from `plugin/agents/` to `.claude/agents/`

**Note:** This does not update the root `CLAUDE.md`. If you added new skills in the plugin, manually update the Commands table in the root CLAUDE.md.

---

### `diff` — Show Differences

Compares CLI and Plugin formats to find discrepancies.

```bash
scripts/co-convert.sh diff
```

**Shows:**
- Commands that exist only in CLI (no matching skill)
- Skills that exist only in Plugin (no matching command)
- Content differences between matching command/skill pairs
- Agent sync status

---

### `status` — Show Current State

Lists what exists in each format.

```bash
scripts/co-convert.sh status
```

**Shows:**
- All commands with names
- All skills with names
- Agent counts for both formats
- Whether plugin.json and plugin/CLAUDE.md exist

## Typical Workflows

### New CO project: CLI-first development

```bash
# 1. Build your CO in Claude Code
#    Create commands, agents, rules in .claude/

# 2. Generate the plugin
scripts/co-convert.sh to-plugin --name co-legal

# 3. Review and customize
#    Edit plugin/CLAUDE.md Absolute Directives
#    Update plugin/.claude-plugin/plugin.json metadata

# 4. Test in Cowork
#    Load plugin/ folder in Claude Desktop
```

### Ongoing sync: keep both formats aligned

```bash
# 1. Check what's different
scripts/co-convert.sh diff

# 2. If CLI is ahead, push to plugin
scripts/co-convert.sh to-plugin --force

# 3. If plugin is ahead, pull to CLI
scripts/co-convert.sh to-cli --force
```

### Renaming your plugin

```bash
# Regenerate everything with the new name
scripts/co-convert.sh to-plugin --name co-medical --force

# This updates:
# - All skill references (/co-medical:analyze, etc.)
# - plugin.json name field
# - plugin/CLAUDE.md tables and instructions
```

## What Is NOT Converted

| Component | Why |
|-----------|-----|
| Rules (`.claude/rules/`) | Plugin format has no rules directory. Rules are advisory in Cowork. |
| Hooks (`scripts/hooks/`) | Cowork does not support hooks. |
| Root CLAUDE.md | Too complex to auto-generate. Maintained separately. |
| Workspace template | Shared between both formats (lives at project root). |
