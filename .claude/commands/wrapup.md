---
name: wrapup
description: "Write session notes before ending. Captures context for next session."
---

Write session notes to preserve context for the next session. The next session starts from zero — these notes are its only link to your work.

## Workspace Resolution

1. If `$ARGUMENTS` specifies a project name, use `workspaces/$ARGUMENTS/`
2. Otherwise, use the most recently modified directory under `workspaces/` (excluding `instructions/`)
3. If no workspace exists, write `.session-notes` at the repo root

## Journal Check

Before writing session notes, review this session's work and create journal entries for anything un-journaled:

- Significant decisions without DECISION entries?
- Technical findings without DISCOVERY entries?
- Risks identified without RISK entries?

Create entries for anything missing, then proceed.

## What the next session already has (do NOT duplicate)

- **Commits & diffs** — `git log`, `git status`
- **Outstanding work** — `todos/active/`
- **Decisions & discoveries** — `journal/`
- **Domain specs** — `specs/` (detailed domain truth, always current)
- **Phase outputs** — `01-analyze/`, `02-plan/`, `03-execute/`, `04-vet/`
- **Project context** — `CLAUDE.md`

## Write `.session-notes`

The file MUST contain these sections. The next session agent reads this to get full context — be specific, not vague.

### Section 1: Context Files (CRITICAL)

List the exact files the next session MUST read to understand the current state. Order matters — list foundation files first, then specifics.

```markdown
### Read These Files First (in order)

1. `path/to/file` — what it is and why to read it
2. `path/to/file` — what it is and why to read it
```

**Why**: CO Principle 2 (Brilliant New Hire) — every session starts from zero. Without this list, the next session wastes time discovering what you already know. Be explicit about file paths. "Read the docs" is useless; "`docs/00-authority/CLAUDE.md` — preloaded architecture context" is useful.

### Section 2: Accomplished

What was completed. Focus on outcomes, not activity.

### Section 3: Outstanding

What remains to be done. Be specific — include file paths, line numbers, exact issues. This is NOT a wish list; it's the next session's work queue.

```markdown
### Outstanding

- [ ] `rules/testing.md` missing from USE template — coc-sync Gate 2 should create softened version
- [ ] 19 BUILD-internal path refs in USE template agents — list: eatp-expert, framework-advisor, ...
```

### Section 4: Oversight Checklist

Verification steps the next session should perform BEFORE and AFTER its main work. This prevents regressions and ensures quality.

```markdown
### Oversight — Verify Before Starting

- [ ] Check: `file` still has expected content (hasn't been reverted)
- [ ] Confirm: feature X is still working (run command Y)

### Oversight — Verify After Completing

- [ ] Zero contamination: `grep -rl "pattern" path/` returns empty
- [ ] All tests pass: `pytest tests/ -x`
- [ ] Sync marker updated: `.coc-sync-marker` has current timestamp
```

**Why**: Without an oversight layer, the next session trusts the current state blindly. Verification catches regressions from hooks, other sessions, or manual edits between sessions.

### Section 5: Blockers (if any)

Decisions needed from the human, external dependencies, or unresolved questions.

### Section 6: Outstanding Ledger — the Forest (cumulative)

Sections 2–5 describe THIS session. The next session reads `git log`, `todos/active/`, and `journal/` for everything those capture. But four things nothing else provides, and that the session notes uniquely must carry:

1. **Priority ordering** — of everything in the repo, which files the next session reads first, and in what order (Section 1).
2. **In-flight state** — what is true RIGHT NOW but not yet committed, journalled, or filed as a todo.
3. **Traps** — specific pitfalls the next session walks into without warning.
4. **Outstanding ledger (forest)** — the durable, cumulative forest-vs-trees record reconciled here, defined below.

The ledger is the running forest: every open forest-level workstream or blocked-item, NOT itemized todos (those live in `todos/active/`). It is carried forward verbatim each session so the next session inherits its bearings instead of re-deriving them from memory. Each row carries a short single-token (whitespace-free), UNIQUE, STABLE **ID** (`F1`, `F2`, … — never reused, never renamed) plus a **value-anchor**: why the item matters, citing a user-anchored source (the workspace `brief.md`, a `specs/` section, a `journal/` DECISION entry, or a literal user quote).

```markdown
### Outstanding Ledger (forest)

| ID  | Item         | Value-anchor (user-anchored source)                       | Status                            |
| --- | ------------ | --------------------------------------------------------- | --------------------------------- |
| F1  | <workstream> | <why it matters — brief.md / specs §X / journal DECISION> | BLOCKED on X / queued / in-flight |

Closed this session: `F2` → receipt `<PR #N / commit SHA / journal NNNN>`.
```

If the forest is empty, write the sentinel explicitly: "Forest empty — every item closed or externally blocked." NEVER omit this section. An absent ledger is indistinguishable from a forgotten one; absence is not done.

**Why**: A one-shot snapshot forces the next session to re-derive its bearings from memory, where a closed item can resurface or an open one vanish with no trace. The ID — not the prose name — is what carries an item across sessions: rewording never false-trips it and two items can never collide. The value-anchor stops the ledger from drifting into self-referential busywork by binding every row to something the user actually asked for.

### Section 7: Ledger Reconciliation (every wrapup)

Reconcile the ledger against the prior `.session-notes` on every wrapup:

1. **Carry forward** every prior row whose work is not yet delivered, KEEPING ITS ID UNCHANGED. The item text MAY be reworded; the ID MUST NOT. A prior open ID silently disappearing is BLOCKED — that is the stale-snapshot trap.
2. **Close with receipt** — for each item delivered this session, move it to the "Closed this session" line, referenced BY ITS ID, WITH a durable receipt (PR number, commit SHA, or journal entry NNNN). No ID or no receipt → it is NOT closed; carry it forward.
3. **Grow** — add any new forest-level workstream or blocked-item with a FRESH UNIQUE ID and a value-anchor citing a user-anchored source. No value-anchor → request it from the user; do NOT invent one.
4. **Empty forest** still writes the sentinel. The sentinel and open rows are mutually exclusive — asserting "Forest empty" with rows present is a defect.

```markdown
# DO — prior open ID carried forward verbatim; close cites a receipt:

| F1 | sync-currency audit | brief.md goal 2; journal 0014 DECISION | queued |

Closed this session: `F3` → receipt journal 0021.

# DO NOT — silent vanish, rename, or receiptless close:

(F1 from last session simply absent — no row, no close line)
| G1 | sync-currency audit | ... | queued | # F1 renamed to G1
Closed this session: `F3`. # no receipt
```

**Why**: Reconciliation is what converts a per-session note into a durable forest record. Closing only by ID-with-receipt makes "done" auditable rather than asserted, and the no-silent-vanish rule guarantees a workstream cannot be lost simply because a session forgot to mention it. The ledger is forest-level only (workstreams and blocked-items, typically 2–6 rows) — itemizing individual todos here is BLOCKED, because that defeats the forest-vs-trees purpose and belongs in `todos/active/`.

## Rules

- **Overwrite** existing `.session-notes` — only the latest matters
- **Be specific** — file paths, line numbers, exact commands. Vague notes are useless to a blank-slate session.
- **Context files section is mandatory** — this is the single most important part. Without it, the next session has no starting point.
- **Oversight checklist is mandatory** — verification prevents blind trust in stale state.
- Keep under 80 lines. If you need more, the outstanding items should be in the todo system instead.
