---
name: sweep
description: "Comprehensive outstanding-work audit across this repository — workspaces, open issues, vet-vs-specs gaps, process hygiene. End-of-cycle gate before /wrapup."
---

## Purpose

A `/sweep` is the structural defense against "I think we're done." Before declaring a session converged or starting fresh work, surface every class of outstanding item: in-flight todos, open issues on this repository's tracker, vet-gaps against specs, stale workspace state, and process-hygiene gaps.

Distinct from `/vet` (scopes to ONE workspace's spec compliance) — `/sweep` is repo-wide and rolls every workspace's vet status into one view.

**Project-scoped** — targets this repository only.

## Execution Model

Autonomous — runs every sweep sequentially, accumulates findings into a single report. The agent MAY fix trivial gaps inline ("if you found it, you own it") but MUST surface every finding with its disposition (FIX-NOW / FILE-ISSUE / DEFER-WITH-REASON / FALSE-POSITIVE).

## Workflow

Run all 7 sweeps. Aggregate findings into a single report at the end with severity (CRIT / HIGH / MED / LOW), disposition, and pointer (file:line, PR#, issue#).

### Sweep 1: Active todos across all workspaces

```bash
find workspaces/*/todos/active/ -name "*.md" 2>/dev/null
```

Read frontmatter (`status`, `priority`, `phase`). Group by workspace. Per `rules/value-prioritization.md`, classify each stale (>14d) todo into one of THREE dispositions — never `Stale` alone, never auto-close: **(a) still-wanted** — re-validate the value-anchor, re-queue with an explicit value-rank citing the brief / spec § / a journal DECISION; **(b) abandon-with-user-gate** — recommend closure with a value-decay rationale and surface to the user (auto-closing as not-wanted by age is BLOCKED); **(c) queued-with-value-rank** — alive but lower priority, explicit anchor required. A todo lacking any value-anchor surfaces as a SEPARATE finding ("value-anchor absent — request from user before re-queuing"), not a closure.

### Sweep 2: Pending journal entries (auto-generated, awaiting promotion)

```bash
find workspaces/*/journal/.pending/ -name "*.md" 2>/dev/null
```

Per `rules/journal.md`: high-value session insight → promote to numbered entry, redundant → discard with note, already covered by another entry → discard with cross-reference.

### Sweep 3: Open issues — this repository's tracker

```bash
gh issue list --state open --limit 50 \
  --json number,title,labels,createdAt,updatedAt,comments
```

Categorize: **Closeable** (delivered work but issue still open — cite the commit/PR per `rules/git.md` § Issue Closure), **Blocked-on-external** (e.g., requires an external scheduling decision, or a dependency repo to be provisioned — record the owner and the unblock condition), **Genuinely actionable**. Per `rules/value-prioritization.md`, `Stale` (no activity ≥30d) is NOT a closure category — auto-closing a stale issue as not-wanted because of age is BLOCKED. Stale issues route through the SAME three-disposition classification as Sweep 1 (still-wanted re-validate / abandon-with-user-gate / queued-with-value-rank); an issue lacking a value-anchor surfaces as a separate finding requesting the anchor before disposition.

### Sweep 4: Open PRs and stale feature branches

```bash
gh pr list --state open --limit 50 \
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
# template drift — only meaningful in an instantiated project where brief.md exists
if [ -f workspaces/_template/brief.md ]; then
  find workspaces/_template/01-analyze -newer workspaces/_template/brief.md 2>/dev/null
else
  echo "SWEEP-6-TEMPLATE-DRIFT: not applicable — workspaces/_template/brief.md absent (bare template context, not an instantiated project); skip with stated reason."
fi
```

Surface: workspaces with `.session-notes` >30d (archive or close), worktrees not at HEAD or zero-commit (cleanup), `.pending` >14d (promote OR discard), template directories newer than brief (template drifted from documented baseline — only runs when `workspaces/_template/brief.md` exists; emits an explicit NOT-APPLICABLE notice in the bare template context rather than silently passing).

### Sweep 7: Process hygiene

```bash
git -C "$PWD" status --short
git -C "$PWD" rev-list --left-right --count origin/main...HEAD 2>/dev/null
# canonical artifact stub scan (per rules/no-stubs.md — workspaces/ excluded)
grep -rEn 'TODO|FIXME|HACK|XXX|TBD|INSERT HERE' .claude/ \
  --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | head -20
```

Surface: uncommitted changes, branch ahead/behind origin/main, stub markers in canonical artifacts (BLOCKED per `rules/no-stubs.md` MUST §1).

## Output

Write findings to `workspaces/<project>/04-vet/sweep-<date>.md` (workspace context active) OR `SWEEP-<date>.md` at the repo root. Each finding:

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
3. Non-trivial fixes filed as workspace todos OR issues on this repository's tracker, with delivered-work references
4. Report committed (`git add` + `git commit`)
5. Optional: human authorization for the recommended next-session scope

The report is the deliverable. The agent does NOT decide what to do next — that's a human call.

## Operating principles (inlined from autonomize)

- **If you found it, you own it.** Trivial gaps surfaced during a sweep MUST be fixed in this run, not deferred. BLOCKED rationalizations: "Pre-existing issue, not introduced this session" / "Outside scope" / "Will address later" / ANY acknowledgement without an actual fix.
- **Same-class gap fix-immediately.** A finding in the same class as one already being fixed AND within the remaining session budget MUST be fixed now, not filed as a follow-up. Filing a follow-up issue when the gap is same-class and small is BLOCKED.
- **Exceptions:** explicit user "skip"; OR external blocker (third-party scheduling, missing repo init, upstream issue) → file with explicit owner + unblock condition.

Origin: adopted from atelier canonical sweep.md (GH atelier#15), retargeted for this standalone repository — hub-only sweeps (downstream sync currency, sibling-repo scans) dropped; issues sweep targets this repository's own tracker.
