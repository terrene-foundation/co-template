---
name: deliver
description: Package and hand off the final output to its recipient. The last step in the workflow.
---

# /co-template:deliver

Package the finalized output from `05-output/` and prepare it for delivery to its intended recipient.

## Workspace Resolution

1. If `$ARGUMENTS` specifies a project name, use `workspaces/$ARGUMENTS/`
2. Otherwise, use the most recently modified directory under `workspaces/` (excluding `_template/`)
3. If no workspace exists, ask the user to create one first

## Protocol

1. **Verify finalized output exists** in `05-output/`
2. **Confirm the recipient and format** -- who receives this and in what form?
3. **Package the deliverable** -- format conversion, bundling, or preparation as needed
4. **Pre-delivery checklist**:
   - [ ] Output has been reviewed and approved (Phase 04)
   - [ ] All known limitations are documented
   - [ ] Format matches recipient requirements
   - [ ] Human has approved the delivery
5. **Deliver or prepare for delivery** as appropriate

## Output

The packaged deliverable ready for the recipient, plus a delivery summary noting what was sent, to whom, and any follow-up actions.

## Journal Entry

Record the delivery in `journal/` -- what was delivered, to whom, and any outstanding follow-up.
