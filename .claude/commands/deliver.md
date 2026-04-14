---
name: deliver
description: Package and hand off the final output to the recipient. Last step in the workflow.
argument-hint: "[project name]"
---

# /deliver

Package the finalized output and hand it off.

## Workspace Resolution

1. If `$ARGUMENTS` specifies a project name, use `workspaces/$ARGUMENTS/`
2. Otherwise, use the most recently modified directory under `workspaces/` (excluding `_template/`)
3. If no workspace exists, ask the user to create one first

## Protocol

1. **Confirm review is complete** — check that 04-review/ has review findings and critical issues are resolved
2. **Package the output** — ensure 05-output/ contains the finalized deliverable
3. **Run final validation** against domain integrity rules
4. **Pre-delivery checklist**:
   - [ ] All critical review issues resolved
   - [ ] All major review issues resolved or documented as known limitations
   - [ ] Output meets domain quality standards
   - [ ] Human has approved the final version
5. **Deliver** — hand off to the recipient (format depends on domain)

## Approval Gate

**HARD GATE**: Human approves the deliverable before it ships. Ask:

- Does this cover everything you described?
- Is anything here that you didn't ask for?
- Is anything missing?
- Is the quality sufficient for the recipient?

## Journal Entry

Record what was delivered and to whom in `journal/`. Type: DECISION.
