# CO Template -- Build Your Own Cognitive Orchestration

Create a structured human-AI collaboration workspace for any professional domain. This template implements the five-layer [Cognitive Orchestration](https://terrene.foundation/standards/co/) (CO) architecture.

**CO Specification**: v1.1 (CC BY 4.0, [Terrene Foundation](https://terrene.foundation))

## What This Is

A ready-to-customize template for building a CO domain application. CO is a methodology that structures how humans and AI collaborate, solving three failure modes: amnesia (AI forgets what matters), convention drift (AI follows generic patterns instead of yours), and safety blindness (AI misses domain-specific risks).

**Existing CO applications** (built from this template pattern):

| Application | Domain | Repository |
|---|---|---|
| COC | Software development | [kailash-coc-claude-py](https://github.com/terrene-foundation/kailash-coc-claude-py) |
| COR | Academic research | [co-research](https://github.com/terrene-foundation/co-research) |
| COF | Finance education | [co-finance](https://github.com/terrene-foundation/co-finance) |

## Quick Start

### Option A: Claude Code (CLI)

```bash
git clone https://github.com/terrene-foundation/co-template.git co-for-my-domain
cd co-for-my-domain
claude
```

Then type `/start`.

### Option B: Claude Desktop Cowork (Plugin)

**What you need:**
- Claude Desktop with Cowork support
- A Claude Pro, Max, or Team subscription

**Step 1: Download the template**

Go to [github.com/terrene-foundation/co-template](https://github.com/terrene-foundation/co-template). Click the green **"Code"** button, then click **"Download ZIP"**. Unzip it and move the folder to your Documents. Rename it to something meaningful (e.g., `co-for-legal`).

**Step 2: Install the plugin**

1. Open Claude Desktop
2. Switch to the **"Cowork"** tab
3. Click **"Customize"** in the left sidebar
4. Click **"Browse plugins"**
5. Click **"Load from folder"** and navigate to the `plugin` folder inside your downloaded template

**Step 3: Open and start**

1. In Cowork, click **"Open folder"** and select your template folder
2. Type `/co-template:start` in the chat

## Customization Guide

### Step 1: Choose your domain name

Replace `co-template` throughout with your domain name (e.g., `co-legal`, `co-medical`, `co-marketing`). Files to update:

- `plugin/.claude-plugin/plugin.json` (the `name` field)
- `plugin/CLAUDE.md` (all skill references)
- `CLAUDE.md` (the title and directives)

### Step 2: Define your integrity rules

Open `CLAUDE.md` and replace the bracketed placeholders in the **Absolute Directives** section. What must NEVER happen in your domain? What quality standards are non-negotiable?

The hard refusal behaviors are the most important part. They determine how the AI responds under pressure. Be explicit: "If asked to [X], REFUSE."

### Step 3: Add your domain agents

The template includes two placeholder agents in `plugin/agents/domain/`:

- `domain-expert.md` -- your primary knowledge specialist
- `quality-reviewer.md` -- your quality critic (never says "this is fine")

Customize these with your domain's knowledge. Add more agents as needed. Look at [COR's agents](https://github.com/terrene-foundation/co-research/tree/main/.claude/agents/research) (6 research specialists) and [COF's agents](https://github.com/terrene-foundation/co-finance/tree/main/.claude/agents) (24 agents across 5 categories) for examples.

### Step 4: Customize your workflow

The template provides a generic five-phase workflow:

1. **Analyze** -- research the problem
2. **Plan** -- create a structured plan (approval gate)
3. **Execute** -- work through tasks
4. **Review** -- quality critique
5. **Finalize** -- prepare output

Modify the skills in `plugin/skills/` to match your domain. Add domain-specific skills. For example:

- Legal: `/review-contract`, `/check-compliance`, `/draft-clause`
- Medical: `/literature-review`, `/protocol-check`, `/case-summary`
- Marketing: `/audience-analysis`, `/draft-copy`, `/brand-check`

### Step 5: Configure your domain context

Open `CLAUDE.md` and fill in the **[Your Domain] Context** section at the bottom with your field's key knowledge, standards, and terminology.

## What the Template Includes

```
co-template/
  CLAUDE.md                    # Master directive (customize this)
  .claude/
    agents/
      domain/                  # Your domain specialists
      management/              # Task tracking (todo-manager, gh-manager)
    commands/                  # CLI commands (mirror of plugin skills)
    rules/                     # Guardrail rules
  plugin/                      # Cowork plugin
    .claude-plugin/plugin.json # Plugin manifest
    CLAUDE.md                  # Plugin context
    skills/                    # 9 skills (start, analyze, plan, execute, review, finalize, ws, wrapup, checkpoint)
    agents/                    # Same agents, packaged for plugin
  workspaces/
    _template/                 # Workspace template
      01-research/
      02-planning/
      03-work/
      04-review/
      05-output/
      journal/
      todos/
```

## The Five CO Layers

| Layer | What It Does | In This Template |
|---|---|---|
| **L1 Intent** | Specialized agents with domain knowledge | `agents/domain/` |
| **L2 Context** | Institutional knowledge hierarchy | `CLAUDE.md` + `rules/` |
| **L3 Guardrails** | Hard and soft enforcement | Hard refusals in CLAUDE.md, rules in `rules/` |
| **L4 Instructions** | Structured workflow with gates | 5 phases, 9 skills, approval gates |
| **L5 Learning** | Knowledge that compounds | `journal/`, `/checkpoint`, `/wrapup` |

## Limitations of the Cowork Plugin

| Feature | CLI (Claude Code) | Cowork Plugin |
|---|---|---|
| Guardrail enforcement | Hooks programmatically enforce rules | Rules are advisory (hard refusals in CLAUDE.md help but are not programmatic) |
| Session memory | `.session-notes` auto-read on startup | Manual: run `/wrapup` before closing, `/start` on next session |
| Skill names | `/analyze`, `/plan`, etc. | `/co-template:analyze`, `/co-template:plan`, etc. (prefix required) |
| Agent permissions | Full hooks and permission modes | No hooks or permission overrides (Cowork security restriction) |
| File access | Full filesystem | Limited to the folder opened in Cowork |

## License

- **Template code**: Apache 2.0
- **CO Methodology**: CC BY 4.0, Terrene Foundation

## Links

- [Terrene Foundation](https://terrene.foundation)
- [CO Specification](https://terrene.foundation/standards/co/) (CC BY 4.0)
- [COR (Research)](https://github.com/terrene-foundation/co-research) -- reference implementation
- [COF (Finance)](https://github.com/terrene-foundation/co-finance) -- reference implementation
