---
name: ws
description: Show workspace status dashboard. Read-only.
---

# Workspace Status

Check the current state of the active workspace.

## Workspace Resolution

1. If `$ARGUMENTS` specifies a project name, use `workspaces/$ARGUMENTS/`
2. Otherwise, use the most recently modified directory under `workspaces/` (excluding `_template/`)
3. If no workspace exists, tell the user to create one first

## Dashboard

### Missing-Phase Scan

Run this BEFORE the dashboard summary. Check the resolved workspace against the canonical phase-dir contract from `workspaces/_template/`:

```
01-analyze  02-plan  03-execute  04-vet  05-codify  06-deliver  journal/  todos/active  todos/completed
```

For each contract directory that is absent, emit a flagged warning at the TOP of the output. Use the `!! MISSING:` prefix so it stays visually loud in a plain terminal:

```
!! MISSING: 01-analyze    — /analyze likely skipped; ask the user for a brief and run it first
!! MISSING: todos/active  — /plan likely skipped; run it before /execute
!! MISSING: 04-vet        — /execute output unvalidated; run /vet before /codify
```

A missing directory is NOT a failure — it is a signal that the matching phase has not run yet. The flag is advisory: name the absent directory, the phase likely skipped, and the recommended next step. Do not halt or modify anything.

### Summary

1. List contents of each phase directory (01-analyze, 02-plan, 03-execute, 04-vet, 05-codify, 06-deliver)
2. Count completed vs active todos
3. Check for .session-notes
4. Report the current phase based on which of the six directories have content

Present as a clear status dashboard.
