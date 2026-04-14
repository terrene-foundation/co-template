---
name: plan
description: Create a structured plan based on analysis. Stops for human approval before execution begins.
---

# /plan

Create a structured plan for the active project. This plan requires human approval before any execution begins.

## Workspace Resolution

1. If `$ARGUMENTS` specifies a project name, use `workspaces/$ARGUMENTS/`
2. Otherwise, use the most recently modified directory under `workspaces/` (excluding `_template/`)
3. If no workspace exists, ask the user to create one first

## Protocol

1. **Read analysis outputs** from `01-research/` and **read `specs/_index.md`** + relevant spec files for domain truth. **If `specs/_index.md` does not exist, STOP — return to `/analyze` to create specs. Do NOT create specs during /plan.**
2. **Break the work into phases and tasks** with clear deliverables. Each task MUST reference which spec file(s) it implements (e.g., "Implements: specs/data-model.md §User Schema").
3. **Present the plan for approval** - do NOT proceed without explicit approval

## Output

Save the plan to `02-planning/plan.md`:

```markdown
# Project Plan

Date: [today]

## Objective

[What this plan achieves]

## Tasks

### Phase 1: [Name]

- [ ] Task 1.1: [Description] - [Deliverable]
- [ ] Task 1.2: [Description] - [Deliverable]

### Phase 2: [Name]

- [ ] Task 2.1: [Description] - [Deliverable]

## Dependencies

[What depends on what]

## Risks

[What could go wrong]
```

## Approval Gate

Present the plan and ask:

1. Does this cover everything you need?
2. Is anything here that you did not ask for?
3. Is the order correct?
4. Should any task be removed or added?

Do NOT proceed to `/execute` until the human approves.

## Journal Entry

Record the planning decisions and rationale in `journal/`. Type: DECISION.
