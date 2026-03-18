# The Two Formats

CO applications can run in two environments, each with its own file format.

## Claude Code CLI Format

**Location**: `.claude/` directory

**Used by**: Claude Code (the terminal CLI tool)

```
.claude/
├── commands/                  # Workflow phases invoked as /name
│   ├── start.md
│   ├── analyze.md
│   ├── plan.md
│   └── ...
├── agents/                    # Specialized sub-processes
│   ├── domain/
│   └── management/
└── rules/                     # Behavioral constraints
    ├── communication.md
    └── domain-integrity.md
```

**Invocation**: `/analyze`, `/plan`, `/execute`

**Strengths**:
- Full filesystem access
- Programmatic guardrail enforcement via hooks
- Auto-loading session notes (`.session-notes`)
- Rules enforced by hooks at L3 Tier 2

---

## Cowork Plugin Format

**Location**: `plugin/` directory

**Used by**: Claude Desktop Cowork

```
plugin/
├── .claude-plugin/
│   └── plugin.json            # Plugin manifest (name, version, metadata)
├── CLAUDE.md                  # Plugin-specific context
├── skills/                    # Workflow phases invoked as /name:skill
│   ├── start/SKILL.md
│   ├── analyze/SKILL.md
│   └── ...
└── agents/                    # Same agents, packaged for plugin
    ├── domain/
    └── management/
```

**Invocation**: `/co-legal:analyze`, `/co-legal:plan`, `/co-legal:execute`

**Strengths**:
- Claude Desktop integration
- No terminal required (accessible to non-technical users)
- Plugin distribution and sharing

---

## Structural Differences

| Aspect | CLI | Plugin |
|--------|-----|--------|
| Commands/Skills | `commands/{name}.md` | `skills/{name}/SKILL.md` |
| Invocation | `/analyze` | `/plugin-name:analyze` |
| Manifest | None | `.claude-plugin/plugin.json` |
| Context file | Root `CLAUDE.md` | Root + `plugin/CLAUDE.md` |
| Rules | `.claude/rules/` | Not packaged (advisory only) |
| Hooks | Full support | Not available |
| Agents | `.claude/agents/` | `plugin/agents/` (identical) |

## Content Differences

**Commands and skills have identical content.** The only differences are:
1. File location and naming convention
2. Skill/command references within the content (`/analyze` vs `/name:analyze`)

**Agents are identical** across both formats.

**Rules are CLI-only.** The plugin format has no `rules/` directory. Rules are referenced in the plugin's CLAUDE.md as advisory directives (Absolute Directives section).

**CLAUDE.md files differ.** The root CLAUDE.md is the master directive for CLI usage. The plugin/CLAUDE.md is a condensed version with plugin-specific instructions and prefixed skill references.

## Which Format Is the Source of Truth?

**Use CLI as the source of truth.** Develop in Claude Code, then convert to plugin for distribution.

The CLI format is richer (it includes rules, hooks, and the full CLAUDE.md). The plugin format is a subset that packages the essentials for Cowork.

When you make changes:
1. Edit in `.claude/` (CLI format)
2. Run `scripts/co-convert.sh to-plugin --force` to regenerate the plugin
3. Test the plugin in Claude Desktop Cowork
