---
name: sweep
description: "Comprehensive outstanding-work audit across atelier — workspaces, GH issues, vet-vs-specs gaps, sync currency, process hygiene. End-of-cycle gate before /wrapup."
---

## Purpose

A `/sweep` is the structural defense against "I think we're done." Before declaring a session converged or starting fresh work, surface every class of outstanding item: in-flight todos, open GH issues, vet-gaps against specs, downstream sync currency, stale workspace state, and process-hygiene gaps.

Distinct from `/vet` (scopes to ONE workspace's spec compliance) — `/sweep` is repo-wide and rolls every workspace's vet status into one view.

**Project-scoped** — targets the atelier repo only. Does NOT audit downstream domain repos (co-template, co-research, co-education, co-governance), Loom, or terrene/foundation. Sync currency to those is checked, not their internal state.

## Execution Model

Autonomous — runs every sweep sequentially, accumulates findings into a single report. The agent MAY fix trivial gaps inline ("if you found it, you own it") but MUST surface every finding with its disposition (FIX-NOW / FILE-ISSUE / DEFER-WITH-REASON / FALSE-POSITIVE).

## Workflow

Run all 7 sweeps. Aggregate findings into a single report at the end with severity (CRIT / HIGH / MED / LOW), disposition, and pointer (file:line, PR#, issue#).

### Sweep 1: Active todos across all workspaces

```bash
find workspaces/*/todos/active/ -name "*.md" 2>/dev/null
```

Read frontmatter (`status`, `priority`, `phase`). Group by workspace. Surface stale (>14d) workspaces' todos with explicit "is this still relevant?" flag.

### Sweep 2: Pending journal entries (auto-generated, awaiting promotion)

```bash
find workspaces/*/journal/.pending/ -name "*.md" 2>/dev/null
```

Per `rules/journal.md`: high-value session insight → promote to numbered entry, redundant → discard with note, already covered by another entry → discard with cross-reference.

### Sweep 3: GitHub open issues — atelier (esperie-enterprise/atelier)

```bash
gh issue list --repo esperie-enterprise/atelier --state open --limit 50 \
  --json number,title,labels,createdAt,updatedAt,comments
```

Categorize: **Stale** (no activity ≥30d), **Closeable** (delivered work but issue still open), **Blocked-on-external** (e.g., requires SGGC scheduling, requires astra git init), **Genuinely actionable**.

### Sweep 4: Open PRs and stale feature branches

```bash
gh pr list --repo esperie-enterprise/atelier --state open --limit 50 \
  --json number,title,headRefName,isDraft,createdAt,statusCheckRollup
git branch -r --no-merged origin/main 2>&1 | grep -v "HEAD ->"
```

Surface: drafts >7d, PRs with red CI (never merge red — fix in same branch per `rules/git.md`), remote branches without PR (orphan work), local-only branches.

### Sweep 5: Vet gaps against specs (every workspace)

`/vet` re-derived as a repo-wide sweep. Use `rules/specs-authority.md` protocol — verify field-level assertions, never file existence.

```bash
for ws in workspaces/*/; do
  [ -d "$ws/specs" ] && echo "WORKSPACE: $ws"
done
```

Per workspace, per spec file: verify every MUST clause and assertion has a corresponding deliverable in `03-execute/` or `06-deliver/`. Categorize findings:

- **Spec-deliverable mismatch** — spec promises X; deliverable has Y or nothing (`rules/specs-authority.md` MUST §6 — drift detection)
- **Stale spec** — spec written, never converted to a vet/deliver outcome (>14d since spec creation, no `04-vet/` or `06-deliver/` for it)
- **Cross-spec inconsistency** — two specs in the same workspace contradict on shared terms
- **Placeholder leak** — `[TODO]`, `[TBD]`, `[FIXME]` left in `03-execute/` or `06-deliver/` (`rules/no-stubs.md` MUST §1)

Roll up: per workspace, count findings by category. Workspaces with ≥3 unresolved gaps → flag as candidates for a follow-up `/vet` round.

### Sweep 6: Workspace + worktree hygiene

```bash
find workspaces/*/.session-notes -mtime +30 2>/dev/null            # stale session notes
git worktree list                                                  # orphan worktrees
find workspaces/*/journal/.pending/*.md -mtime +14 2>/dev/null     # stale .pending
find workspaces/_template/01-analyze -newer workspaces/_template/brief.md 2>/dev/null  # template drift
```

Surface: workspaces with `.session-notes` >30d (archive or close), worktrees not at HEAD or zero-commit (cleanup), `.pending` >14d (promote OR discard), template directories newer than brief (template drifted from documented baseline).

### Sweep 7: Process hygiene + downstream sync currency

```bash
git -C "$PWD" status --short
git -C "$PWD" rev-list --left-right --count origin/main...HEAD 2>/dev/null
# canonical artifact stub scan (per rules/no-stubs.md — workspaces/ excluded)
grep -rEn 'TODO|FIXME|HACK|XXX|TBD|INSERT HERE' .claude/ co-template/.claude/ \
  co-codegen/.claude/ co-research/.claude/ co-education/.claude/ co-governance/.claude/ \
  --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | head -20
# downstream sync currency
for d in co-template co-codegen co-research co-education co-governance; do
  if [ -f "$d/.claude/VERSION" ]; then
    printf "%-15s " "$d:"
    jq -r '"\(.version)  upstream=\(.upstream.version // "n/a")"' "$d/.claude/VERSION" 2>&1
  fi
done
```

Surface: uncommitted changes, atelier branch ahead/behind origin/main, stub markers in canonical artifacts (BLOCKED per `rules/no-stubs.md` MUST §1), downstream repos behind atelier's current VERSION (sync drift).

## Output

Write findings to `workspaces/<project>/04-vet/sweep-<date>.md` (workspace context active) OR `SWEEP-<date>.md` at atelier root. Each finding:

```
[SEVERITY] [Sweep N] <title>
Location: <file:line | PR# | issue# | workspace path>
Disposition: FIX-NOW | FILE-ISSUE | DEFER-WITH-REASON | FALSE-POSITIVE
Evidence: <grep hit | command output | spec quote>
Why this matters: <one line>
Action taken (if FIX-NOW): <commit SHA | new file>
```

End with cross-cutting observations and 2-5 ranked recommended next-session items.

## Closure

Before reporting `/sweep` complete:

1. ALL Sweep 1–7 outputs accumulated in the report
2. Trivial fixes applied inline (per the "if you found it, you own it" principle); reclassified `FIXED` with commit SHA in the report
3. Non-trivial fixes filed as workspace todos OR atelier GH issues (esperie-enterprise/atelier) with delivered-work references
4. Report committed (`git add` + `git commit`)
5. Optional: human authorization for the recommended next-session scope

The report is the deliverable. The agent does NOT decide what to do next — that's a human call.

## Operating principles (inlined from autonomize)

- **If you found it, you own it.** Trivial gaps surfaced during a sweep MUST be fixed in this run, not deferred. BLOCKED rationalizations: "Pre-existing issue, not introduced this session" / "Outside scope" / "Will address later" / ANY acknowledgement without an actual fix.
- **Same-class gap fix-immediately.** A finding in the same class as one already being fixed AND within the remaining session budget MUST be fixed now, not filed as a follow-up. Filing a follow-up issue when the gap is same-class and small is BLOCKED.
- **Exceptions:** explicit user "skip"; OR external blocker (third-party scheduling, missing repo init, upstream issue) → file with explicit owner + unblock condition.

Origin: absorbed from loom/.claude/commands/sweep.md (loom 2.10.x), adapted for atelier's methodology context — SDK-specific sweeps (orphan-detection AST, facade-manager, kwarg dispatch) dropped; spec-vs-deliverable + downstream sync currency added.
