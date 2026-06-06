# Git Workflow Rules

Origin: inbound sync from loom 2.8.0 deterministic-quality artifact suite (atelier 1.1.0, commit b1aa2af).

## Conventional Commits

All commits MUST use the conventional format:

```
type(scope): description
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

```markdown
# DO:

feat(auth): add OAuth2 support
fix(api): resolve rate limiting issue

# DO NOT:

updated auth stuff
fixed bug
```

**Why:** Non-conventional commits break automated changelog generation and make `git log --oneline` useless for release notes.

## Branch Naming

Branch names MUST follow `type/description` format.

```markdown
# DO:

feat/add-auth
fix/api-timeout
chore/update-deps

# DO NOT:

my-branch
jack-working-on-stuff
new_feature_v2_final
```

**Why:** Inconsistent branch names prevent CI pattern-matching rules and make `git branch --list` unreadable across contributors.

## PR Descriptions

PRs MUST include a summary section and a `## Related issues` section linking to the motivating issue.

```markdown
# DO:

## Summary

Add OAuth2 provider support for external authentication.

## Related issues

Fixes #123

# DO NOT:

(empty PR body, or just "see commits")
```

**Why:** Without issue links, PRs become disconnected from their motivation, breaking traceability and preventing automatic issue closure on merge.

## Rules

### Atomic Commits

One logical change per commit, tests + implementation together. MUST NOT mix unrelated changes.

```markdown
# DO:

Commit 1: feat(auth): add OAuth2 provider interface
Commit 2: fix(api): handle rate limit retry

# DO NOT:

Commit 1: add OAuth2 + fix rate limit + update README + bump deps
```

**Why:** Mixed commits are impossible to revert cleanly.

### Commit Bodies MUST Answer WHY, Not WHAT

The diff shows what changed. The commit body MUST explain why.

```markdown
# DO — explains why:

feat(sync): add path-scoping to domain rules

Rules without paths: frontmatter loaded in every session's
baseline, consuming ~5500 tokens with no benefit for sessions
that never touch the relevant files. Path-scoping makes rules
load once on first matching file read.

# DO NOT — restates the diff:

feat(sync): add path-scoping to domain rules

Added paths: frontmatter to 12 rule files. Updated
cc-artifacts.md and execution-discipline.md.
```

**Why:** Commit bodies that explain "why" are the cheapest form of institutional documentation — co-located with the code, versioned, searchable via `git log --grep`, and never stale.

### Safety

- MUST NOT push directly to main or force push to main
- MUST NOT commit secrets (API keys, passwords, tokens, .env files)
- MUST NOT commit large binaries (>10MB single file)

**Why:** Direct pushes bypass CI and review. Leaked secrets require immediate key rotation. Large binaries permanently bloat the repo since git never forgets them.

### Destructive Working-Tree Ops MUST Verify a Clean Tree First

`git reset --hard <ref>`, `git clean -f[d]`, and `rm -rf` of untracked paths SILENTLY and IRRECOVERABLY destroy uncommitted work — unstaged edits AND untracked-not-ignored files have NO reflog. Running any of them without first confirming `git status --porcelain` is empty is BLOCKED. Prefer `git reset --keep <ref>` (aborts on a dirty tree) and `git stash -u` over `git clean -f`.

```markdown
# DO — --keep aborts on a dirty tree; dry-run before any clean:

git status --porcelain # confirm empty first
git reset --keep origin/main
git clean -n # preview what would be deleted

# DO NOT — bare destructive op with no working-tree check:

git reset --hard origin/main # wipes modified + untracked; no reflog
git clean -fd # deletes untracked; unrecoverable
```

**Why:** These are the most destructive ops that do NOT rewrite history, so — unlike a force-push, which the reflog can undo — the loss is unrecoverable. `git reset --keep` and `git clean -n` convert a silent, irreversible wipe into a loud refusal or a preview, which is the difference between a near-miss and a lost session.

### Issue Closure MUST Cite a Code Reference

Closing an issue MUST cite a commit SHA, a PR number, or a merged-PR link in the closing comment. Closing with no code reference is BLOCKED.

```markdown
# DO — closure points to the change that resolved it:

gh issue close 42 --comment "Resolved in a1b2c3d (PR #57)."

# DO NOT — closure with no traceable code reference:

gh issue close 42 --comment "Done."
gh issue close 42 # no comment at all
```

**Why:** An issue closed without a code reference breaks traceability — a future reader cannot tell whether it was fixed, deferred, or abandoned, and cannot find the change that addressed it. The reference is what makes `git log --grep` and issue history a usable audit trail instead of a dead end.

### Commit Bodies MUST Claim Only What the Diff Contains

A commit body MUST describe ONLY changes actually present in the diff. Over-claiming a refactor, a deletion, or a side-effect that the diff does not contain is BLOCKED. If a claim was made in error on an already-pushed commit, push a FOLLOW-UP commit that delivers what the prior message said — MUST NOT amend a pushed commit.

```markdown
# DO — body matches the diff; correct a pushed error with a follow-up:

fix(spec): tighten Phase 04 convergence wording

# (later, the claim was wrong → new commit, not an amend)

docs(spec): deliver the Phase 04 example the prior commit claimed

# DO NOT — claim work the diff does not contain, or amend after push:

fix(spec): rewrite all phase definitions and add 6 examples

# (diff only touched one paragraph)

git commit --amend # on a commit already pushed to the remote
```

**Why:** Over-claiming poisons `git log --grep`, the cheapest institutional-knowledge search — a reader trusts the message and never opens the diff. Amending a pushed commit rewrites shared history and forces every collaborator to reconcile a diverged branch, so the follow-up commit is the honest, non-destructive correction.
