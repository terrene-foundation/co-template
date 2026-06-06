---
paths:
  - "**/.github/**"
  - "**/CONTRIBUTING.md"
  - "**/SECURITY.md"
  - "**/.session-notes"
  - "**/journal/**"
  - "**/workspaces/**"
---

# Upstream Issue Hygiene Rules

Origin: inbound sync from loom 2026-06-05 - lifts the human-gate-before-filing and downstream-context-redaction pattern from loom rules/upstream-issue-hygiene.md, adapted for atelier (vendor/codegen specifics stripped, phase names remapped to CO v1.2).

## Scope

These rules apply when a session running inside one project discovers a defect or gap in an **external or upstream project** — a library, service, dataset, standard, or any dependency maintained elsewhere — and the natural next step is to file an issue, pull request, or comment on that external project's public tracker.

This rule governs OUTBOUND issue hygiene: what may cross the boundary onto a permanent public record. It is **additive to `independence.md`**, not a duplicate — `independence.md` governs the CONTENT of atelier's own artifacts (no commercial framing); this rule governs what session-local context leaks OUT when you file against someone else's tracker. The concern applies in any domain: research filing against a public corpus, governance against a public standard, education against shared courseware.

**The defect goes upstream. The story of HOW you found it stays home.**

## MUST Rules

### 1. Human Gate Before Filing

The agent MUST NOT submit any issue, pull request, or tracker comment against an external/upstream project without explicit user approval IN THE SAME SESSION. Drafting the body is permitted; submission is not.

```markdown
# DO — draft, present the body, wait for explicit approval, then submit

"Here is the issue I'd file against the upstream project. It reports the defect
with a minimal reproduction and no reference to our workspace. Approve filing? (y/N)"

# DO NOT — auto-submit because some other rule said "report the defect upstream"

(submitted before the user could review the body for leaked downstream context)
```

**BLOCKED rationalizations:**

- "A parity or follow-up rule told me to file the issue"
- "The user already approved filing this class of issue once"
- "Filing is a tool call, not a destructive action"
- "We can edit the body afterward if there's a problem"
- "The body is generic, there's no privacy concern"
- "Per-issue approval is bureaucracy when the pattern repeats"

**Why:** A public tracker is world-readable forever and most preserve edit history, so redaction after the fact is partial — the original body stays recoverable. The per-issue human gate is the only checkpoint that catches leaked downstream context BEFORE it becomes a permanent public breadcrumb.

### 2. Downstream Context Redaction

The issue body MUST NOT contain any of:

- The downstream project's name, or a client / engagement / customer name
- Internal file paths outside the external project's own surface (e.g. `src/<our-app>/...`, workspace-internal paths)
- Workspace identifiers (`workspaces/<name>/...`, `.session-notes`, journal paths, proposal paths)
- Finding tags or internal review IDs (e.g. `F-G1-HIGH`, `S-H3`, round numbers)
- Session provenance tied to downstream work (timestamps, "discovered during <our> review", reviewer/session IDs)
- "Origin: <our-project>" footers or "<our-project> workaround" sections

```markdown
# DO — scoped to the external project's surface, zero downstream context

"The published endpoint returns the wrong status code when the input field is
empty: the contract promises 422, the service returns 500. Minimal repro below."

# DO NOT — carries our project name, internal path, and a finding tag

"F-G1-HIGH finding (acme-onboarding workspace, 2026-04-27): the endpoint we wrap in
workspaces/acme-onboarding/journal/0020-DISCOVERY returns 500 instead of 422."
```

**BLOCKED rationalizations:**

- "Maintainers need the discovery context to triage"
- "The workspace path is internal to me, it's not a leak"
- "The downstream name is just a tag, anyone could guess it"
- "Closed issues aren't really public"
- "The Origin footer is provenance, not context"
- "I'll keep the workspace path so it links back to our journal"
- "The finding tag is the most concise way to state severity"

**Why:** A public tracker is indexed by search engines and every other consumer of that upstream project, so each leaked downstream identifier is a permanent breadcrumb back to your project, its structure, and its methodology. Maintainers triage from a minimal repro and acceptance criteria (Rule 3), not provenance — provenance belongs in your own journal.

### 3. Minimal Repro Shape

The issue body MUST consist of ONLY these five sections, nothing else:

1. **Affected external surface** — the one public entry point at fault (a documented function, endpoint, schema field, or clause). No downstream wrapper or facade names.
2. **Minimal repro** — the smallest self-contained demonstration using ONLY the external project's own surface and standard scaffolding. No downstream modules, configs, or fixtures named after your work. An executable check (a script, a test, a schema-validator) is ideal; a precise step list is acceptable where execution does not apply.
3. **Expected vs actual** — what the external project's contract promises (cite its doc or spec section) versus what it delivers.
4. **Severity** — `LOW` / `MEDIUM` / `HIGH` / `CRITICAL`, judged on the external surface's impact, NOT on your downstream business impact.
5. **Acceptance criteria** — bulleted, testable, scoped to the external surface. Format: `[ ] <observable behavior on the external surface>`.

```text
# DO — the five required sections, nothing else
Affected surface:   the published validation endpoint, empty-input path
Minimal repro:      [smallest self-contained demonstration using only the upstream surface]
Expected vs actual: contract §4.2 promises 422 with a field-level error; service returns 500, empty body
Severity:           HIGH — breaks the documented error contract; reproduces consistently
Acceptance:         [ ] empty input returns 422 with a field-level error
                    [ ] a regression check covers the empty-input path

# DO NOT — the kitchen-sink shape
Summary:        [paragraphs of context including our project name]
Workspace:      workspaces/<our-app>/journal/...
Workaround:     [how we worked around it, with our internal architecture]
Cross-refs:     [links into our journals and finding logs]
```

**BLOCKED rationalizations:**

- "The 'Workaround' section helps others hitting the same defect"
- "Cross-references speed up triage"
- "Our internal verification must be referenced as proof"
- "Five sections is too rigid for a complex issue"
- "The minimal repro doesn't show the full production trace"

**Why:** Every section beyond the five required is a leakage surface. Workarounds belong in your own docs (only you keep them current); cross-project alignment is the maintainer's concern, filed separately. Full production traces often carry downstream function names — the minimal repro is the structural defense that keeps them out.

## MUST NOT Rules

### 1. No Downstream Identifiers on the Public Record

MUST NOT file any external issue, PR, or comment containing a downstream project name, internal path, workspace ID, finding tag, or session-provenance footer.

**Why:** Once on the public record, redaction is partial — most trackers preserve edit history and the original body stays recoverable.

### 2. No Standing Approval

MUST NOT treat "the user approved one filing" as standing approval for future filings.

**Why:** Each issue body is unique and carries its own leakage risk; standing approval erodes the per-issue gate that is the only body-level check.

### 3. No Unscrubbed Pipeline Inputs

MUST NOT route any body into a distribution pipeline — a proposal, a sync payload, or any artifact that will be split and pushed to multiple downstream consumers — without scrubbing it per Rule 2 first.

**Why:** A body that enters a distribution pipeline reaches many consumers at once; any leaked identifier becomes permanently correlatable across all of them before any later check runs. A pipeline input is a public-surface artifact, not a private note.
