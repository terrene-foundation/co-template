---
paths:
  - "**/specs/**"
  - "**/specs/_index.md"
  - "**/workspaces/**/specs/**"
  - "**/02-plan/**"
  - "**/brief.md"
---

# Spec Accuracy Rules

Origin: inbound sync from loom 2026-06-05 - lifts the spec-content-accuracy discipline from loom rules/spec-accuracy.md, adapted for atelier (vendor/codegen specifics stripped, phase names remapped to CO v1.2).

## Scope

These rules apply to ALL content inside `specs/` files — at the repo root and under `workspaces/<project>/specs/`. A spec describes what the system does **today**. If a behavior is not yet real, it does NOT go in the spec. Specs that acknowledge gaps ("Phase-1 scaffold, Phase-2 will wire it", "Promised / Current", "TBD — follow-up", "stub for now") are BLOCKED. Gap-annotated specs create **lookaway risk**: readers build against the scaffold side, the work "looks fine" on the stub, and the promised half never lands because nothing is visibly broken.

**Sister rule:** `specs-authority.md` governs HOW specs are organized; this rule governs WHAT a spec may contain. They do not overlap — `specs-authority.md` Rule 5 (first-instance updates) is about _when_ truth changes, this rule about _whether_ a claim describes reality. Do not duplicate either.

## MUST Rules

### 1. Every Named Artifact, Section, or Claim Resolves Against the Real Deliverable

Every artifact path, section anchor, command, cross-reference, or factual claim named in spec content MUST resolve against the actual deliverable at merge time, verifiable by a literal `grep` / `find`. For atelier that means a `.claude/` `<path>:<line>`, a `<path> §<section>`, or a spec cross-ref that actually exists on disk. Citations that depend on "the next phase will wire it" / "scaffold for now" are BLOCKED.

```markdown
# DO — the citation resolves with grep/find today

The frontmatter lint lives at `.claude/commands/cc-audit.md:35`.

# DO NOT — phantom citation surviving merge

The reconciliation pass (`.claude/commands/reconcile.md`, lands next
phase) flags drift across repos. (No such file exists yet.)
```

**BLOCKED rationalizations:** "the artifact will land next cycle" / "scaffold is good enough for the spec" / "the citation is aspirational" / "/vet will catch the unimplemented parts" / "it's in review".

**Why:** Phantom citations make the spec a lie that downstream readers act on. A cited artifact that does not exist forces the reader to fabricate a plausible interpretation, which propagates error to every domain that inherits the spec. Verification is mechanical: every cited symbol must resolve via `grep` / `find` against the real deliverable.

### 2. No Split-State Framings Inside Spec Content

Spec sections MUST NOT use "Phase-1 / Phase-2", "Promised / Current", "Target / Fallback", "Scaffold / Live", "Now / Later" framings to acknowledge gaps. Inline markers `TBD`, `pending`, `to be wired`, `follow-up`, `stub for now` are BLOCKED in spec content.

```markdown
# DO — describe what is real today, full stop

| Phase | Canonical command | Workspace dir |
| ----- | ----------------- | ------------- |
| Vet   | /vet              | 04-vet/       |

# DO NOT — split-state column

| Phase     | Promised (next cycle) | Current (stub) |
| --------- | --------------------- | -------------- |
| Reconcile | cross-repo sweep      | TBD            |
```

**BLOCKED rationalizations:** "honesty about gaps helps the reader" / "the split-state column documents the migration" / "the Current column IS what ships today, so the spec is accurate" / "removing the Promised column loses the roadmap".

**Why:** Split-state framings invite the reader to build against the scaffold side. Roadmap context belongs in `workspaces/<project>/todos/active/` or GitHub issues, not in the spec — see Rule 4. Honesty about gaps is a virtue for `journal/` entries and delivery notes; it is a structural defect for spec content.

### 3. Out-Of-Scope Is Not A Gap

Explicit `## Out of scope` sections that BOUND the spec's coverage are permitted (Exception 1). Gap trackers describing INCOMPLETE coverage WITHIN the spec's own scope are BLOCKED.

```markdown
# DO — bounded out-of-scope (spec covers everything else fully)

## Out of scope

- Downstream sync mechanics (covered by `specs/sync-targets.md`)

# DO NOT — gap tracker disguised as out-of-scope

## Out of scope (for now)

- Cross-repo drift check (TBD — follow-up)
```

**Why:** Out-of-scope sections set the spec's perimeter; gap trackers describe holes inside the perimeter. Holes inside the perimeter belong in todos / issues — they are not stable enough to live in a domain-truth document. The "(for now)" qualifier is the linguistic tripwire.

### 4. Work Trackers Live Outside Specs

Follow-up lists, "wire later" notes, migration plans, deprecation timelines, integration TBDs MUST live in `workspaces/<project>/todos/active/`, GitHub issues, or delivery notes — never inline in spec files.

```markdown
# DO — tracker lives outside, spec describes shipped behavior

specs/phase-model.md says: "Six phases: analyze, plan, execute, vet, codify, deliver."
workspaces/phase-model/todos/active/add-reconcile-phase.md tracks the proposal.

# DO NOT — tracker embedded as spec content

specs/phase-model.md says: "§7 Planned phases: reconcile (next cycle), archive-rotation (deferred)."
```

**Why:** Specs are domain truth indexed by `_index.md`; todos are workstreams indexed by `workspaces/<project>/todos/`. Mixing them creates lookaway: spec readers treat todos as authoritative; todo readers treat specs as roadmap. Each surface stops doing its job.

### 5. Historical Change Logs Are Past-Tense Only

Append-only `## §X Change log` sections describing PAST transitions in past tense are permitted (Exception 2). Future-tense planning is BLOCKED in change logs.

```markdown
# DO — past-tense, append-only

- 2026-06-05: removed split-state framing per spec-accuracy.md

# DO NOT — future-tense disguised as change log

- 2026-07-01 (planned): add reconcile phase
```

**Why:** Past-tense change logs are institutional memory; future-tense entries are split-state framings (Rule 2) wearing a hat. Use todos / issues for forward planning.

## MUST NOT Rules

### 1. No Unresolvable Citations

MUST NOT ship a spec naming an artifact path, section anchor, command, or cross-reference that fails `grep` / `find` against the real deliverable.

```markdown
# DO — the cited symbol resolves today

The `/vet` gate is defined at `.claude/commands/vet.md`.

# DO NOT — citation points at an artifact that does not exist

The drift gate is defined at `.claude/commands/drift-check.md` (no such file).
```

**Why:** Every shipped phantom is a lookaway tombstone — the failure mode this rule exists to prevent.

### 2. No Split-State Framings

MUST NOT use Phase-1 / Phase-2 / Promised / Target / Scaffold / Now-Later framings inside a spec section.

```markdown
# DO — one column, what is real today

Coverage: the analyze phase reads `brief.md` and emits `01-analyze/`.

# DO NOT — split-state framing inside the spec

Coverage: Now — reads brief.md. Later (Phase-2) — auto-derives the brief.
```

**Why:** Split-state framings normalize "spec describes intent, deliverable describes reality" — exactly the divergence this rule blocks.

### 3. No Gap-Tracking as a Spec Virtue

MUST NOT treat "honest about what's missing" as a virtue for spec content, or maintain gap trackers as permanent residents of spec files.

```markdown
# DO — gaps go to the workstream surface, not the spec

specs/sync-model.md describes shipped sync behavior; the missing-target
gap is tracked in `workspaces/sync-model/todos/active/add-base-variant.md`.

# DO NOT — permanent gap tracker living inside the spec

specs/sync-model.md says: "Known gaps: base-variant target not yet wired (honest disclosure)."
```

**Why:** Honesty about gaps is right for journals and delivery notes; in spec content it converts a truth surface into a roadmap surface. Permanent gap trackers signal the spec is partly aspirational — readers stop trusting any section.

### 4. No Spec Section for Behavior That Is Not Real

MUST NOT write a spec section for an artifact or behavior not yet real. That content is a brief or a plan; it belongs in `brief.md` or `02-plan/`, not `specs/`.

```markdown
# DO — unbuilt behavior lives in the plan surface

02-plan/tasks.md proposes a reconcile phase; specs/phase-model.md lists only
the six phases that exist.

# DO NOT — spec a behavior the deliverable does not yet have

specs/phase-model.md says: "§7 Reconcile phase: sweeps cross-repo drift." (not built)
```

**Why:** A spec for behavior that does not exist is a design doc; the truth surface and the design surface must stay distinct.

## Exceptions (Structural Carve-Outs)

1. **Explicit `## Out of scope` sections** that BOUND the spec's coverage (not gap trackers within it).
2. **Append-only `## §X Change log`** sections describing PAST transitions in past tense.
3. **`§X [reserved for future work]`** section-numbering anchors with ZERO prose content (numbering placeholder only — no description).

## Audit Protocol (runs in /vet)

1. **Split-state framing scan** — grep spec content for `phase-?1.*phase-?2`, `promised.*current`, `scaffold.*later`, `TBD`, `to.be.wired`, `follow-?up`, `pending`. Zero matches required; any hit is HIGH.
2. **Citation resolution** — every cited artifact path, section anchor, or cross-reference must resolve via `grep` / `find` against the real deliverable. Any unresolved citation is CRITICAL.

## Migration For Existing Violations

When a spec touched in the current work contains a gap tracker: extract its content into `workspaces/<project>/todos/active/<topic>.md` (or a GitHub issue), delete the gap-tracker section from the spec entirely (don't soften — delete), and land both changes together with the first new spec edit touching the file.
