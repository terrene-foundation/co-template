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

This template is not published to the plugin store. You must load it manually from your downloaded folder.

1. Open Claude Desktop
2. Switch to the **"Cowork"** tab
3. Click **"Customize"** in the left sidebar
4. Click **"Browse plugins"**
5. Click **"Load from folder"** and navigate to the `plugin` folder inside your downloaded template

**Step 3: Open and start**

1. In Cowork, click **"Open folder"** and select your template folder
2. Type `/co-template:start` in the chat

### What happens after `/start`

The AI will introduce itself, explain the five-phase workflow (Analyze, Plan, Execute, Review, Finalize), and ask about your project. Answer in plain language. You do not need to use technical terms or special commands. Describe what you want to accomplish, and it will guide you from there.

### What a successful start looks like

You will see:
- The AI greeting you and naming itself based on your domain (e.g., "I'm your CO for Legal assistant")
- A summary of what the five phases do
- A question asking you to describe your project or goal
- A check for any existing workspace (if this is your first time, it will offer to create one)

If you see all of this, you are set up correctly. If you see an error or the AI does not seem to know about CO, see [Troubleshooting](#troubleshooting) below.

## Customization Guide

You will customize five things, each taking about 5 minutes:

1. Your domain name
2. Your integrity rules
3. Your agents
4. Your workflow phases
5. Your domain knowledge

Throughout this guide, you will edit `.md` files (a plain text file you can open with any text editor). Open them with **TextEdit** (Mac) or **Notepad** (Windows). Look for text in `[square brackets]`. Replace the brackets and their contents with your own text.

### Step 1: Choose your domain name

Open each of the three files listed below in a text editor. Use **Edit > Find and Replace** (or Ctrl+H / Cmd+H). Replace `co-template` with your domain name (e.g., `co-legal`). Save each file after replacing.

Files to update:

- `plugin/.claude-plugin/plugin.json` (the `name` field)
- `plugin/CLAUDE.md` (all skill references)
- `CLAUDE.md` (the title and directives)

### Step 2: Define your integrity rules

Open `CLAUDE.md` and scroll to the **Absolute Directives** section. You will see placeholders like `[domain-specific violation 1]`. Replace each placeholder (brackets and all) with your own rules.

What must NEVER happen in your domain? What quality standards are non-negotiable?

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

Open `CLAUDE.md` and scroll to the bottom. Find the **[Your Domain] Context** section. Fill it in with your field's key knowledge, standards, and terminology.

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

## Troubleshooting

**The AI does not seem to know about CO or the five phases.**
You may have opened the wrong folder. In Cowork, click "Open folder" and make sure you select the root of the template folder (the one containing `CLAUDE.md`), not a subfolder inside it.

**Skills like `/co-template:start` do not work.**
The plugin may not be loaded. Go to the Cowork tab, click "Customize", and check that your plugin appears in the list. If not, click "Browse plugins" > "Load from folder" and select the `plugin` folder inside your template.

**The AI says it cannot find files or workspaces.**
Make sure you unzipped the template fully. On Mac, double-clicking the ZIP should unzip it. On Windows, right-click the ZIP and choose "Extract All." If the folder structure looks like `co-template/co-template/CLAUDE.md` (nested), move the inner folder out and use that.

**After renaming `co-template`, skills no longer work.**
When you renamed `co-template` in `plugin.json`, the skill prefix changed. If you renamed to `co-legal`, your skills are now `/co-legal:start`, `/co-legal:analyze`, etc. Use the new prefix.

**The AI lost context between sessions.**
Before closing a session, type `/wrapup` (or `/co-template:wrapup` in Cowork). This saves progress. When you start a new session, type `/start` (or `/co-template:start`) to reload context.

## File Structure

<details>
<summary>Click to expand the full file tree</summary>

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

</details>

## License

- **Template code**: Apache 2.0
- **CO Methodology**: CC BY 4.0, Terrene Foundation

## Links

- [Terrene Foundation](https://terrene.foundation)
- [CO Specification](https://terrene.foundation/standards/co/) (CC BY 4.0)
- [COR (Research)](https://github.com/terrene-foundation/co-research) -- reference implementation
- [COF (Finance)](https://github.com/terrene-foundation/co-finance) -- reference implementation
