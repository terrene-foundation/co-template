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
