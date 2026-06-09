# Upstream Proposal Protocol

How `/codify` creates proposals for upstream review. Proposals track artifact changes through a three-state lifecycle (`pending_review` → `reviewed` → `distributed`). See `rules/artifact-flow.md` for the full flow rules.

## Proposal Lifecycle (Domain → Atelier)

**Applies to domain repos** (co-research, co-education, co-governance, and any future co-\* repos) that discover methodology improvements. Also applies to Loom proposing CC/CO changes upstream.

**Downstream project repos**: SKIP. Artifact changes stay local.

**DO NOT sync directly to other domain repos.** All shared methodology improvements flow through atelier/ (the hub).

### Lifecycle states

1. Create `.claude/.proposals/` directory if needed
2. Read CO version from `.claude/VERSION` (if present)
3. Check for existing proposal at `.claude/.proposals/latest.yaml`:
   - **`pending_review`** → MUST NOT overwrite. **Append** new changes to existing `changes:` array.
   - **`reviewed`** → **Append** and reset status to `pending_review` (new unreviewed changes).
   - **`distributed`** → **Archive** to `.claude/.proposals/archive/{date}-{repo}.yaml`, then create fresh.
   - **Missing** → Create fresh.

**BLOCKED:** Overwriting a `pending_review` or `reviewed` proposal — destroys unprocessed changes.

### Fresh proposal format

```yaml
source_repo: co-research # or loom, co-education, etc.
upstream_target: atelier
codify_date: YYYY-MM-DD
codify_session: "type(scope): description of work"
co_version: "1.2.0" # from .claude/VERSION

changes:
  - file: relative/path/to/artifact.md
    action: created | modified
    suggested_tier: cc | co
    canonical_path: .claude/rules/new-rule.md
    reason: "Why this artifact was created/changed"
    adaptation_notes: "Notes on what atelier needs to adjust"
    diff_lines: "+N -N" # for modifications

status: pending_review
```

### Append format

Keep ALL existing fields and `changes:` entries. Add separator comment, append new entries, update dates/versions, reset status if was `reviewed`.

```yaml
# Existing entries preserved above...
# --- YYYY-MM-DD session: type(scope): description ---
  - file: relative/path/to/new-artifact.md
    action: created
    suggested_tier: co
    canonical_path: .claude/rules/new-rule.md
    reason: "Why this artifact was created"
    diff_lines: "+80"

status: pending_review  # reset if was reviewed
```

### Tier suggestions

- **cc**: Claude Code universal (guides, cc-audit, hooks)
- **co**: Methodology universal (CO principles, journal, communication, specs authority)

### Reporting

**Fresh:** "Artifacts updated locally. Proposal created at `.claude/.proposals/latest.yaml` with {N} changes. Submit to atelier maintainer for review."

**Appended:** "Artifacts updated locally. Appended {N} new changes to existing proposal (now {total} changes, status reset to pending_review). Prior changes preserved."

## Loom → Atelier Proposals

**Applies at loom.** When `/codify` at loom produces or modifies CC/CO-tier artifacts, those are proposed upstream to atelier.

Apply the **same append-not-overwrite logic** as above to `.claude/.proposals/latest.yaml`:

```yaml
source_repo: loom
upstream_target: atelier
codify_date: YYYY-MM-DD
codify_session: "type(scope): description"
loom_version: "X.Y.Z"
coc_version: "X.Y.Z"

changes:
  - file: rules/specs-authority.md
    action: created
    suggested_tier: co
    canonical_path: .claude/rules/specs-authority.md
    reason: "..."
    adaptation_notes: "Notes on what atelier needs to adjust"

status: pending_review
```

Report: "{N} CC/CO artifacts proposed for upstream to atelier/. When ready, the atelier maintainer reviews and adapts."
