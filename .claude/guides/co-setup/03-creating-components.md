# Creating CO Components

How to create each component type for any domain.

## Agents

**Location**: `.claude/agents/` (shared) or `.claude/agents/project/` (project-specific)

**Purpose**: Specialized sub-processes with deep domain knowledge and procedural directives.

**When to create**: When a task area requires deep expertise that goes beyond what skills can provide — judgment, multi-step procedures, or cross-cutting concerns.

### Agent Template

```markdown
---
name: agent-name
description: One-line description of when to use this agent. Include trigger keywords.
model: inherit
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Agent Title

You are an expert in [domain]. Your knowledge covers [scope].

## Authoritative Sources

List the files this agent should read first, in priority order.

## Core Concepts You Must Know

Distilled knowledge the agent needs to operate. Not a copy of docs — the judgment framework for using docs.

## How to Respond

Procedural directives for the agent's behavior.

## Related Experts

When to hand off to other agents.
```

### Best Practices

- **Name describes the specialty**, not the task: `security-reviewer` not `review-security`
- **Description includes trigger phrases**: "Use this agent for questions about X, Y, or Z"
- **Authoritative sources are ordered**: PRIMARY first, then SECONDARY, then REFERENCE
- **Core concepts are for judgment**, not facts: "Distinguish traceability from accountability" not "EATP has 5 elements"
- **Use `model: inherit`** unless the agent needs a different model tier

---

## Skills

**Location**: `.claude/skills/<number>-<name>/` with `SKILL.md` entry point

**Purpose**: Distilled domain knowledge that agents reference. The institutional handbook.

**When to create**: When domain knowledge needs to be available on demand, structured for progressive disclosure.

### Skill Template

```markdown
---
name: skill-name
description: One-line description. Triggers when this knowledge is needed.
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Skill Title

Brief overview of what this skill covers.

## Quick Reference

The most critical information in compact form.

## Key Concepts

Core concepts with just enough detail to act on.

## For Detailed Information

Pointers to full documentation.
```

### Best Practices

- **SKILL.md is the entry point** — it should be self-contained for common tasks
- **Additional files in the same directory** for deep reference
- **Reference docs, don't repeat them** — skills point to authoritative sources
- **50-250 lines per file** — if it's longer, split into multiple files
- **No subdirectories** within a skill directory

---

## Rules

**Location**: `.claude/rules/`

**Purpose**: Behavioral constraints the AI reads and follows every session. Soft enforcement (CO L3 Tier 1).

**When to create**: When a behavior needs to be consistent across all sessions, regardless of which agent is active.

### Rule Template

```markdown
# Rule Title

## Scope

When this rule applies (all files, specific directories, specific file types).

## MUST Rules

### 1. Rule Name

Description of the rule.

**Correct**: Example of correct behavior
**Incorrect**: Example of incorrect behavior

## MUST NOT Rules

### 1. Rule Name

What to avoid and why.

## Exceptions

When this rule doesn't apply.
```

### Best Practices

- **Load-bearing clauses use MUST/MUST NOT in every domain** — per `rules/rule-authoring.md` MUST §1; "should"/"prefer" are BLOCKED as the primary modal regardless of domain (governance is not lower-stakes than codegen)
- **RECOMMENDED/SHOULD is reserved for genuinely optional guidance** — never a downgrade of a load-bearing rule (put it in a separate `## SHOULD Rules` section)
- **Scope section is critical** — without it, rules apply everywhere and cause friction
- **Include examples** — abstract rules are hard to follow; concrete examples are clear
- **Keep rules independent** — each rule file should be self-contained

---

## Commands

**Location**: `.claude/commands/`

**Purpose**: Structured workflows invoked by `/command-name`. CO L4 implementation.

### Command Template

```markdown
---
name: command-name
description: "One-line description shown in /help"
---

## What This Phase Does (present to user)

Plain-language description of what happens when this command runs.

## Your Role (communicate to user)

What the user needs to do (answer questions, approve plans, review results).

## Workspace Resolution

How to determine which workspace to operate on.

## Phase Check

Pre-conditions and output locations.

## Workflow

### 1. Step name

What to do in this step.

### 2. Step name

...

## Agent Teams

Which agents to deploy for this workflow.
```

### Best Practices

- **"What This Phase Does" and "Your Role"** — always present, always in plain language
- **Workflow steps are numbered** — clear sequence with approval gates
- **Agent Teams section at the end** — lists which agents to deploy, organized by function
- **Completion evidence** — every workflow that produces deliverables should require evidence before closing
- **Decision log** — every workflow that involves user decisions should capture them

### The Core Workflow

Every project has these six phase commands. These are the **canonical CO** command names — domain-agnostic, used as-is in non-coding archetypes:

| Command    | Phase | Purpose                                             |
| ---------- | ----- | --------------------------------------------------- |
| `/analyze` | 01    | Research and validate before execution              |
| `/plan`    | 02    | Decompose into approved tasks; stops for human gate |
| `/execute` | 03    | Carry out planned work one task at a time; repeat   |
| `/vet`     | 04    | Stress-test and validate; promote on convergence    |
| `/codify`  | 05    | Capture validated patterns for future sessions      |
| `/deliver` | 06    | Package finalized work; hand off to the recipient   |

Plus the cross-cutting utilities: `/ws` (check progress anytime) and `/wrapup` (session notes).

**COC coding-archetype flavor**: the COC (codegen) domain renames the middle phases for its context — `/todos` (maps to `/plan`), `/implement` (maps to `/execute`), `/redteam` (maps to `/vet`), and `/release`+`/deploy` (map to `/deliver`). These are operational flavors of the canonical phases, not separate phases; `/analyze`, `/codify`, and `/deliver` keep their canonical names. See `rules/domain-independence.md` § 3 (Six-Phase Naming) for the full phase-to-flavor mapping.

---

## Hooks

**Location**: `.claude/hooks/` with registration in `.claude/settings.json`

**Purpose**: Deterministic enforcement outside the AI's context. CO L3 Tier 2.

### Hook Types

| Hook Event         | When It Fires              | Use Case                          |
| ------------------ | -------------------------- | --------------------------------- |
| `UserPromptSubmit` | Every user message         | Anti-amnesia rule injection       |
| `PreToolUse`       | Before a tool runs         | Block dangerous operations        |
| `PostToolUse`      | After a tool runs          | Validate output, remind of rules  |
| `PreCompact`       | Before context compression | Save state, remind of workspace   |
| `SessionStart`     | Session begins             | Load context, detect project type |
| `Stop`             | Session ends               | Persist state, write metrics      |

### Hook Template (JavaScript)

```javascript
// .claude/hooks/hook-name.js
const fs = require("fs");
const path = require("path");

// Read input from stdin
const input = JSON.parse(fs.readFileSync("/dev/stdin", "utf8"));

// Hook logic here
// Access: input.tool_name, input.tool_input, input.session_id, etc.

// Output result
const result = {
  // For PreToolUse: { continue: true/false, reason: "..." }
  // For PostToolUse: { message: "..." } or empty
  // For UserPromptSubmit: { message: "..." } to inject context
};

console.log(JSON.stringify(result));
```

### Registration in settings.json

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "type": "command",
        "command": "node .claude/hooks/user-prompt-rules-reminder.js"
      }
    ],
    "PreToolUse": [
      {
        "type": "command",
        "command": "node .claude/hooks/validate-bash-command.js",
        "matcher": { "tool_name": "Bash" }
      }
    ]
  }
}
```

### Best Practices

- **Hooks are deterministic** — no AI judgment, no probabilistic behavior
- **Fast execution** — hooks run on every interaction; keep them under 100ms
- **Fail open for non-critical hooks** — if the hook crashes, don't block the workflow
- **Fail closed for security hooks** — if the security hook crashes, block the action
- **Anti-amnesia is the most important hook** — re-inject critical rules every interaction

---

## The CLAUDE.md File

**Location**: Project root

**Purpose**: The master directive. Loaded at the start of every session. CO L2 entry point.

### What to include

1. **What this project is** — one paragraph
2. **Absolute directives** — the 3-5 strongly recommended rules
3. **Available commands** — table with phase and purpose
4. **Available agents** — organized by function
5. **Available skills** — organized by domain
6. **Key file locations** — where to find important content
7. **Project-specific conventions** — terminology, naming, licensing

### What NOT to include

- Implementation details (those go in skills and docs)
- Full agent descriptions (those go in agent files)
- Lengthy explanations (keep it concise — this is loaded every session)
