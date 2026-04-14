---
name: execute
description: Work through the plan one task at a time. Each task requires completion before moving to the next.
---

# /execute

Work through the approved plan from `02-planning/plan.md`, one task at a time.

## Workspace Resolution

1. If `$ARGUMENTS` specifies a project name, use `workspaces/$ARGUMENTS/`
2. Otherwise, use the most recently modified directory under `workspaces/` (excluding `_template/`)
3. If no workspace exists, ask the user to create one first

## Protocol

1. **Read the plan** from `02-planning/plan.md`
2. **Find the next incomplete task**
3. **Context anchor before executing**: read `specs/_index.md`, identify which spec files cover this task's domain, read them. The spec is the authority on what to build. Per `rules/specs-authority.md` MUST §4.
4. **Execute it**, producing the specified deliverable
5. **Save output** to `03-work/`
6. **Check spec currency**: if this task changed domain truth, update the relevant spec file immediately per `rules/specs-authority.md` MUST §5. If execution deviates from spec, STOP: update spec with deviation and rationale, flag user-visible changes for approval.
7. **Mark the task complete** in the plan
8. **Report what was done** and what the next task is

## Rules

- One task at a time. Do not batch.
- Each task produces a tangible output saved to the workspace.
- If a task requires a decision the human has not made, ASK. Do not decide for them.
- If a task cannot be completed, explain why and what is needed.

## Journal Entry

Record significant decisions, trade-offs, or discoveries made during execution in `journal/`.

## Next Step

When all tasks are complete, recommend `/review` for adversarial quality check.
