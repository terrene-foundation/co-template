---
name: learn
description: Extract knowledge from the completed project into .claude/ artifacts. Requires human approval for each artifact.
---

# /co-template:learn

Extract reusable knowledge from this project into CO artifacts (.claude/ directory).

## Workspace Resolution

1. If `$ARGUMENTS` specifies a project name, use `workspaces/$ARGUMENTS/`
2. Otherwise, use the most recently modified directory under `workspaces/` (excluding `_template/`)
3. If no workspace exists, ask the user to create one first

## Protocol

1. **Review the completed work** in `05-output/` and `journal/`
2. **Identify reusable patterns** -- what worked well that should be captured for future projects?
3. **Propose artifact updates** -- suggest specific changes to rules, agents, or skills in `.claude/`
4. **Get human approval** for each proposed artifact change before making it
5. **Apply approved changes** to `.claude/` files

## What to look for

- Recurring quality issues that should become rules
- Domain knowledge that should be added to agent prompts
- Workflow patterns that should be documented in skills
- Decision patterns that should inform future projects

## Human Approval Required

Every artifact change must be explicitly approved by the human before applying. Present each proposed change with:

- What will change
- Why (what project experience motivated it)
- The specific edit

## Journal Entry

Record what knowledge was extracted and what artifacts were updated in `journal/`.
