---
paths:
  - ".claude/**"
  - "**/workspaces/**"
  - "**/*.md"
---

# Consumer-Flow Validation Rules

Origin: inbound sync from loom 2026-06-05 - lifts the walk-before-done + mandatory-receipts pattern from loom rules/user-flow-validation.md, adapted for atelier (vendor/codegen specifics stripped, phase names remapped to CO v1.2).

## Scope

These rules apply during the **execute**, **vet**, and **deliver** phases of any CO workflow, to every deliverable handed to a consumer — a report a reader reads, a command an operator runs, a rule that fires at a gate, a guide a newcomer follows. They fill the gap `rules/execution-discipline.md` leaves: that rule stops at "verify integration" (cross-references resolve, dependencies exist); this rule requires actually invoking the deliverable the way its consumer will.

## MUST Rules

### 1. Walk The Consumer Flow Before Declaring Complete

Before declaring ANY deliverable "done", "complete", "shipped", "ready", or "delivered": exercise it the way its consumer will. Load the rule into a real session and confirm it fires. Run the command and read the output an operator would see. Read the guide cold, as a newcomer with no prior context. Follow the next step the consumer would take. Automated checks passing is NECESSARY but INSUFFICIENT — a passing check is the author's belief about the consumer's experience, not the consumer's literal experience. The walk is the last mile.

```text
# DO — walked the literal consumer path, evidenced
Walked the findings report as its reader will: opened cold, as the
executive reads it. Order: summary → 3-model comparison → recommendation.
The recommendation cites the table; all 3 rows carry pros/cons as the brief
specified. Reader can act without back-reference. → walk confirmed.

# DO NOT — checks passed, declared done
- Automated checks pass. Reviewer approved. Done.
- The draft reads correctly to me; the cross-references resolve. Shipping.
```

**BLOCKED responses:**

- "The automated checks / the reviewer cover the consumer flow"
- "The cross-reference / format check passed"
- "The deliverable is small enough that walking it is redundant"
- "I traced what the consumer would see"
- "It parses / it loads / the frontmatter is valid"
- "I verified the primitive; the consumer flow is just composition"
- "The previous version walked, so this version is fine"

**Why:** Automated checks verify primitives in isolation; they do NOT verify that the consumer's composed path produces the expected outcome. A primitive that passes every check can still fail when composed with the rest of the consumer-facing surface — section ordering, output rendering, assumed prior context, error-message clarity, next-step legibility. Only the literal walk catches these.

### 2. Receipts For The Walk Are Mandatory

The walk MUST produce a **receipt**: the literal action taken + the literal output or rendering observed + the inferred consumer disposition after seeing it (proceed / blocked / confused). The receipt MUST be embedded in the deliverable's commit message, delivery record, or session notes. "Walked it, looks good" without a receipt is BLOCKED — the receipt is the only evidence the walk happened.

```text
# DO — receipt embedded in the delivery record
Command `/ws` run as an operator. Observed: "Active workspaces: 2. Phase:
execute (3 todos). Next: /execute to continue, or /vet when todos clear."
Disposition: operator sees state + next step; proceeds unblocked.
Guide read cold as a newcomer. Observed: steps 1-4 self-contained; step 3's
referenced file exists. Disposition: newcomer completes the task unaided.

# DO NOT — claim-of-walk without receipt
- Walked the flow; it works.   - Tested end-to-end. Looks good. Delivering.
```

**BLOCKED responses:** "The walk happened, the receipt is overhead" / "Receipts inflate the delivery record" / "Anyone can re-walk it themselves" / "Observed output is too verbose" / "The walk was obvious, no receipt needed".

**Why:** "Walked it, looks good" is unfalsifiable — the next reader cannot verify the walk happened, what was observed, or whether the disposition was correct. Receipts convert the claim ("the walk happened") into evidence (the observed output, fixed in the record), and make the omission mechanically detectable: a "done" claim with no receipt nearby is a flag.

### 3. The Walk Distinguishes Failure Modes Checks Cannot

When a check passes BUT the walk surfaces a failure — wrong rendering, a confusing instruction, a broken next-step, missing context a newcomer needs — the **failure mode is what ships**, not the check. Fix the failure mode the walk surfaces; do NOT declare done because "the check passed." A passing check next to a broken consumer walk is **institutional theatre**.

```text
# DO — walk surfaces failure; fix it (do NOT ship because the check passed)
Check passes: the guide's frontmatter is valid and all links resolve.
Walk (read as a newcomer): step 2 says "configure as described above" — but
nothing was described above. Disposition: confused; cannot proceed.
→ Fix: add the missing step; check still passes; walk re-run, newcomer proceeds.
```

**Why:** Checks verify properties the author thought to check. The consumer's walk catches properties the author did NOT think to check — which is the entire reason the walk matters. Treating "check passed" as canonical when the walk surfaced a different failure mode is the originating failure mode this rule blocks.

### 4. Prose Deliverables (Rules, Commands, Skills, Guides) Have A Walk Too

For rule files, command files, skill files, guides, and other prescriptive prose, the walk is: the file loads under the actual runtime; frontmatter parses; paths resolve; the artifact's claims about its own behavior are verified by exercising it; the DO / DO NOT examples render without error; and the BLOCKED patterns the rule describes actually fire when matched against a fixture scenario (per `rules/cc-artifacts.md` MUST §11 — committed audit fixtures).

```text
# DO — prose walk receipts
`.claude/rules/<new-rule>.md`: loaded into a real session, frontmatter parsed
clean (paths: present); rule injected on first matching file read; fixture
under .claude/audit-fixtures/<rule>/ exercised — the BLOCKED pattern fired.
`.claude/commands/<new-command>.md`: invoked fresh; output rendered as the
prose claims (fixed section order); any delegated skill loaded.

# DO NOT — prose declared done after authoring
- Wrote the new rule. All sections present. Done.
- Authored the command. Reviewer approved. Delivering.
```

**Why:** Rules, commands, skills, and guides are deliverables a consumer invokes or reads; "the file exists and the prose looks right" is not the consumer's experience. The consumer's experience is the rule firing at a real gate, the command rendering real output, the guide being followable cold.

### 5. The Walk Caps Every Deliverable

The walk is the LAST mile before "done" applies. A session that runs checks, dispatches reviewers, assembles the artifact, drafts the delivery record, and THEN declares done WITHOUT the walk has failed the discipline regardless of how many gates were green. Declaring done before the walk is BLOCKED even when all prior gates are clean.

```text
# DO — the walk is the last gate (omitting step 6 = walk skipped = BLOCKED)

1. Draft. 2. Checks pass. 3. Reviewers approve (/vet converges).
4. Assemble the artifact. 5. Draft the delivery record (/deliver).
6. ← WALK THE CONSUMER FLOW HERE — receipt to the delivery record. 7. Done.
```

**Why:** Gates protect against the failure modes their authors thought of; the walk catches the failure modes nobody thought of. Skipping the walk because prior gates were green inverts defense-in-depth — it makes the walk an optional courtesy instead of the institutional last mile.

### 6. Receipts MUST Be Scrubbed Before Embedding In Public-Surface Artifacts

Walk receipts (per MUST §2) MUST be **scrubbed** before embedding in commit messages, delivery records, journal entries, or session notes that may reach a public surface or sync downstream. Scrub two classes: (1) **secrets / PII** — keys, tokens, passwords, connection strings, personal data (emails, names tied to private accounts); redact inline (`[REDACTED]`, `<email>`). (2) **Downstream-context tokens** per `rules/independence.md` — commercial product names, consumer-project identifiers, internal paths specific to a downstream consumer, vendor-coupling language; genericize. A receipt's evidential value is the **structural shape** of what the consumer saw (sections present, errors absent, next-step legible), NOT the raw bytes.

```text
# DO — scrubbed receipt preserves shape, redacts secrets + downstream context
Observed (scrubbed): "Identity: <operator-id> (verified). Active workspaces:
none. Next: /start to orient." Disposition: state surfaced; next step actionable.

# DO NOT — verbatim everything; ships secrets / consumer identifiers
Observed: "Identity: <real-email> (key <real-token>). Workspace path:
workspaces/<consumer-name>/"   ← these substrings must be scrubbed, not shipped.
```

**BLOCKED responses:**

- "Scrubbing defeats the verbatim requirement of MUST §2"
- "Everyone reviewing the record already has access"
- "The output didn't look sensitive to me"
- "It's just a workspace path / a user email"
- "Verbatim is the contract; scrub is a follow-up"
- "The session notes are private to me — they won't sync"

**Why:** Receipts in commit bodies and delivery records enter git history and propagate downstream on sync; once on the public record, redaction is only partial. The verbatim requirement of MUST §2 is satisfied by structural shape — scrubbing specific substrings does not reduce evidential value but does prevent the disclosure-class failures that `rules/independence.md` (no vendor/consumer coupling) and the no-secrets baseline exist to block. Walk discipline (MUST §1-5) and scrub discipline stack, not conflict.

## MUST NOT Rules

### 1. No "Done" Without A Walked, Receipted, Real Path

The following are each independently BLOCKED:

- Declaring a deliverable "done", "complete", "shipped", "ready", or "delivered" without performing the consumer walk.
- Substituting "the reviewer approved" or "the automated checks passed" for the walk.
- Recording a "done" claim that says "tested" or "walked" without the action + observed output + consumer disposition receipt.
- Walking a substitute path (a similar command, a previous version, a fixture standing in for the real artifact) instead of the actual consumer-facing deliverable.

**Why:** Each is the same evasion in a different costume. Declaring done without the walk is the originating failure mode — work that passes every gate but fails the consumer on first contact. Reviewers and checks verify the draft and the author's own assertions, not the consumer's literal path. A claim without a receipt is unfalsifiable. A substitute verifies the substitute, not the path the consumer will actually hit.

Origin: inbound sync from loom 2026-06-05; codified into atelier via the loom-inbound-sync workspace. Extends `rules/execution-discipline.md` MUST §3 (Draft/Integrate Split) by adding the consumer-walk step beyond integration verification.
